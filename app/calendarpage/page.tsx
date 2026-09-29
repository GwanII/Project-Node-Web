"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { 
  ChevronLeft, ChevronRight, Lock, User, X, Plus, Check, GripVertical, Calendar as CalendarIcon, Edit3
} from 'lucide-react';
import { supabase } from "@/src/lib/supabase";
import Sidebar from './manubar';

const COLOR_OPTIONS = [
  '#1B54F2CC',
  '#49CAA4CC',
  '#F9C465CC',
  '#F27562CC',
  '#8767D6CC',
  '#b3b7bdCC'
];

interface CalendarEvent {
  id: string; 
  title: string;
  startDate: string;
  endDate: string;
  color: string;
  sortOrder?: number;
}

interface MemoItem {
  id: string; 
  dateStr: string;
  title: string;
  content: string;
  userId?: string;
}

export default function CustomNotionCalendar() {
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState<boolean>(false);

  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);

  // ============= 참여 가능일 목록. 이후 수정 필요 ===============
  const [myAvailableDates, setMyAvailableDates] = useState<string[]>([]);

  const [newTitle, setNewTitle] = useState<string>('');
  const getTodayString = () => {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
  };
  const [newStartDate, setNewStartDate] = useState<string>(() => getTodayString());
  const [newEndDate, setNewEndDate] = useState<string>(() => getTodayString());
  const [newColor, setNewColor] = useState<string>(COLOR_OPTIONS[0]);

  const [selectedEventToEdit, setSelectedEventToEdit] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editColor, setEditColor] = useState<string>(COLOR_OPTIONS[0]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // 메모
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [memoMode, setMemoMode] = useState<'list' | 'write' | 'detail' | 'edit'>('list');
  const [selectedMemo, setSelectedMemo] = useState<MemoItem | null>(null);
  const [memoTitle, setMemoTitle] = useState<string>('');
  const [memoContent, setMemoContent] = useState<string>('');

  // =========== 이메일만 임의로 가져옴. 이후 수정 필요 =============
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || '사용자',
          email: user.email || ''
        });
      }
    };

    fetchUserData();
  }, []);

  // 날짜 선택 시 해당 날짜의 메모 불러오기
  useEffect(() => {
    if (!selectedDate) return;

    const fetchMemos = async () => {
      const { data, error } = await supabase
        .from('cal_memos')
        .select('*')
        .eq('date_str', selectedDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('메모 불러오기 실패:', error);
        return;
      }

      if (data) {
        const mappedMemos: MemoItem[] = data.map((m) => ({
          id: m.id,
          dateStr: m.date_str,
          title: m.title,
          content: m.content,
          userId: m.user_id
        }));
        setMemos(mappedMemos);
      }
    };

    fetchMemos();
  }, [selectedDate]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('cal_events')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('일정 불러오기 실패:', error);
        return;
      }

      if (data) {
        const mappedEvents: CalendarEvent[] = data.map((evt) => ({
          id: evt.id,
          title: evt.title,
          startDate: evt.start_date,
          endDate: evt.end_date,
          color: evt.color
        }));
        setEvents(mappedEvents);
      }
    };

    fetchEvents();
  }, []);

  // ========== 참여 가능일. 이후 수정 필요 ===========
  const toggleAvailableDate = (dateStr: string) => {
    setMyAvailableDates((prev) =>
      prev.includes(dateStr)
        ? prev.filter((d) => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const reorderById = <T extends { id: string }>(
    list: T[],
    draggedId: string,
    targetId: string
  ): T[] => {
    if (draggedId === targetId) return list;
    const draggedIndex = list.findIndex((item) => item.id === draggedId);
    const targetIndex = list.findIndex((item) => item.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return list;

    const updated = [...list];
    const [draggedElement] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedElement);
    return updated;
  };

  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
  };

  const handleDragOverItem = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (targetId: string) => {
    if (draggedItemId !== null) {
      setEvents((prev) => reorderById(prev, draggedItemId, targetId));
    }
    setDraggedItemId(null);
    setDragOverId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverId(null);
  };

  const handleGoToProjectMain = () => {
    router.push('/Projectmainpage');
  };
  
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTitle.trim()) {
      alert('일정 이름을 입력해주세요.');
      return;
    }

    if (newStartDate && newEndDate && newStartDate > newEndDate) {
      alert('종료일은 시작일 이후여야 합니다.');
      return;
    }

    const { data, error } = await supabase
      .from('cal_events')
      .insert([
        {
          title: newTitle,
          start_date: newStartDate,
          end_date: newEndDate,
          color: newColor,
          user_id: currentUser?.id || null
        },
      ])
      .select()
      .single();

    if (error) {
      alert('일정 추가에 실패했습니다.');
      console.error(error);
      return;
    }

    if (data) {
      const addedEvent: CalendarEvent = {
        id: data.id,
        title: data.title,
        startDate: data.start_date,
        endDate: data.end_date,
        color: data.color
      };

      setEvents((prev) => [...prev, addedEvent]);
      setNewTitle('');
      setNewColor(COLOR_OPTIONS[0]);
      setIsAddModalOpen(false);
    }
  };

  const handleOpenEditModal = (evt: CalendarEvent) => {
    setSelectedEventToEdit(evt);
    setEditTitle(evt.title);
    setEditStartDate(evt.startDate);
    setEditEndDate(evt.endDate);
    setEditColor(evt.color || COLOR_OPTIONS[0]);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editTitle.trim()) {
      alert('일정 이름을 입력해주세요.');
      return;
    }

    if (!selectedEventToEdit) return;

    if (editStartDate && editEndDate && editStartDate > editEndDate) {
      alert('종료일은 시작일 이후여야 합니다.');
      return;
    }

    const { error } = await supabase
      .from('cal_events')
      .update({
        title: editTitle,
        start_date: editStartDate,
        end_date: editEndDate,
        color: editColor
      })
      .eq('id', selectedEventToEdit.id);

    if (error) {
      alert('일정 수정에 실패했습니다.');
      console.error(error);
      return;
    }

    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === selectedEventToEdit.id
          ? { ...evt, title: editTitle, startDate: editStartDate, endDate: editEndDate, color: editColor }
          : evt
      )
    );
    setSelectedEventToEdit(null);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventToEdit) return;

    if (window.confirm('일정을 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('cal_events')
        .delete()
        .eq('id', selectedEventToEdit.id);

      if (error) {
        alert('일정 삭제에 실패했습니다.');
        console.error(error);
        return;
      }

      setEvents((prev) => prev.filter((evt) => evt.id !== selectedEventToEdit.id));
      setSelectedEventToEdit(null);
    }
  };

  // 메모 저장
  const handleSaveMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoTitle.trim()) {
      alert('메모 제목을 입력해주세요.');
      return;
    }

    if (!memoContent.trim()) {
      alert('메모 내용을 입력해주세요.');
      return;
    }

    if (!selectedDate) return;

    const { data, error } = await supabase
      .from('cal_memos')
      .insert([
        {
          date_str: selectedDate,
          title: memoTitle,
          content: memoContent,
          user_id: currentUser?.id || null,
        },
      ])
      .select()
      .single();

    if (error) {
      alert('메모 저장에 실패했습니다.');
      console.error(error);
      return;
    }

    if (data) {
      const insertedMemo: MemoItem = {
        id: data.id,
        dateStr: data.date_str,
        title: data.title,
        content: data.content,
        userId: data.user_id,
      };

      setMemos((prev) => [insertedMemo, ...prev]);
      setMemoTitle('');
      setMemoContent('');
      setMemoMode('list');
    }
  };

  // 메모 수정
  const handleOpenEditMemo = () => {
    if (!selectedMemo) return;
    setMemoTitle(selectedMemo.title);
    setMemoContent(selectedMemo.content);
    setMemoMode('edit');
  };

  // 메모 수정 -> 저장
  const handleUpdateMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoTitle.trim()) {
      alert('메모 제목을 입력해주세요.');
      return;
    }

    if (!memoContent.trim()) {
      alert('메모 내용을 입력해주세요.');
      return;
    }

    if (!selectedMemo) return;

    const { error } = await supabase
      .from('cal_memos')
      .update({
        title: memoTitle,
        content: memoContent,
      })
      .eq('id', selectedMemo.id);

    if (error) {
      alert('메모 수전에 실패했습니다.');
      console.error(error);
      return;
    }

    const updatedMemo = {
      ...selectedMemo,
      title: memoTitle,
      content: memoContent,
    };

    setMemos((prev) =>
      prev.map((m) => (m.id === selectedMemo.id ? updatedMemo : m))
    );
    setSelectedMemo(updatedMemo);
    setMemoTitle('');
    setMemoContent('');
    setMemoMode('detail');
  };

  // 메모 삭제 (수정 화면에서)
  const handleDeleteMemo = async () => {
    if (!selectedMemo) return;

    if (window.confirm('메모를 삭제하시겠습니까?')) {
      const { error } = await supabase
        .from('cal_memos')
        .delete()
        .eq('id', selectedMemo.id);

      if (error) {
        alert('메모 삭제에 실패했습니다.');
        console.error(error);
        return;
      }

      setMemos((prev) => prev.filter((m) => m.id !== selectedMemo.id));
      setSelectedMemo(null);
      setMemoTitle('');
      setMemoContent('');
      setMemoMode('list');
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarDays: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const mStr = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    calendarDays.push({
      dayNumber: d,
      dateStr: `${prevMonthDate.getFullYear()}-${mStr}-${dStr}`,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    calendarDays.push({
      dayNumber: d,
      dateStr: `${year}-${mStr}-${dStr}`,
      isCurrentMonth: true,
    });
  }

  const totalSlots = calendarDays.length > 35 ? 42 : 35;
  const remainingSlots = totalSlots - calendarDays.length;

  for (let d = 1; d <= remainingSlots; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const mStr = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    calendarDays.push({
      dayNumber: d,
      dateStr: `${nextMonthDate.getFullYear()}-${mStr}-${dStr}`,
      isCurrentMonth: false,
    });
  }

  const weeks: typeof calendarDays[] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const getEventsForDate = (dateStr: string) => {
    return events.filter((evt) => dateStr >= evt.startDate && dateStr <= evt.endDate);
  };

  const getMemosForDate = (dateStr: string) => {
    return memos.filter((m) => m.dateStr === dateStr);
  };

  const getWeekEventLayout = (weekDays: typeof calendarDays) => {
    const weekStartStr = weekDays[0].dateStr;
    const weekEndStr = weekDays[6].dateStr;

    const weekEvents = events.filter(
      (evt) => evt.startDate <= weekEndStr && evt.endDate >= weekStartStr
    );

    const slots: Array<Array<CalendarEvent | null>> = [];

    const renderedEvents: Array<{
      event: CalendarEvent;
      startCol: number;
      span: number;
      level: number;
    }> = [];

    weekEvents.forEach((evt) => {
      const startIndex = weekDays.findIndex((d) => d.dateStr === evt.startDate);
      const startCol = startIndex === -1 ? 0 : startIndex;

      const endIndex = weekDays.findIndex((d) => d.dateStr === evt.endDate);
      const endCol = endIndex === -1 ? 6 : endIndex;

      const span = endCol - startCol + 1;

      let targetLevel = -1;
      let level = 0;

      while (targetLevel === -1) {
        if (!slots[level]) {
          slots[level] = [null, null, null, null, null, null, null];
        }

        let isCollision = false;
        for (let c = startCol; c <= endCol; c++) {
          if (slots[level][c] !== null) {
            isCollision = true;
            break;
          }
        }

        if (!isCollision) {
          targetLevel = level;
        } else {
          level++;
        }
      }

      for (let c = startCol; c <= endCol; c++) {
        slots[targetLevel][c] = evt;
      }

      renderedEvents.push({ event: evt, startCol, span, level: targetLevel });
    });

    return renderedEvents;
  };

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden font-sans select-none relative">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        <header className="h-20 flex items-center justify-between px-8 bg-white shrink-0 relative">
          <div className="flex items-center gap-1">
            <button 
              onClick={handleGoToProjectMain} 
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
              title="Projectmainpage로 이동"
            >
              <X className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
              title="일정 추가"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsAvailabilityModalOpen(true)} 
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
              title="참여 가능일 설정"
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1 hover:opacity-70 transition-opacity">
                <ChevronLeft className="w-7 h-7 fill-[#555151] stroke-none text-[#555151]" />
              </button>
              <h1 className="text-2xl font-black tracking-tight text-black font-sans flex items-center gap-2">
                <span className="text-gray-500 font-bold">{year}</span>
                <span>CALENDAR</span>
              </h1>
              <button onClick={nextMonth} className="p-1 hover:opacity-70 transition-opacity">
                <ChevronRight className="w-7 h-7 fill-[#555151] stroke-none text-[#555151]" />
              </button>
            </div>
            <span className="text-xl font-black text-black leading-none mt-1">
              {month + 1}월
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-black">
              <Lock className="w-5 h-5" />
            </button>
            <button className="p-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-black flex items-center gap-1">
              <span className="text-xs font-bold">AI 생성</span>
            </button>
            <button className="p-1.5 border border-gray-200 rounded-full hover:bg-gray-50">
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* 캘린더 메인 영역 */}
        <main className="flex-1 overflow-hidden px-8 py-2 flex flex-col items-center justify-center">
          <div className="w-full max-w-5xl mx-auto flex flex-col h-full justify-between overflow-hidden">
            
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-2 text-center items-center shrink-0">
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <div key={d} className="text-lg font-black text-black">
                  {d}
                </div>
              ))}
            </div>

            {/* 주 단위 그리드 컨테이너 (높이 균등 분배 적용) */}
            <div className={`flex-1 grid gap-2 h-full overflow-hidden ${
              weeks.length > 5 ? 'grid-rows-6' : 'grid-rows-5'
            }`}>
              {weeks.map((weekDays, weekIdx) => {
                const weekStartStr = weekDays[0].dateStr;
                const weekEndStr = weekDays[6].dateStr;
                const renderedEvents = getWeekEventLayout(weekDays);

                return (
                  <div key={weekIdx} className="grid grid-cols-7 gap-1.5 relative h-full min-h-0">
                    
                    {/* 레이어 1: 날짜 카드 */}
                    {weekDays.map((item, dIdx) => {
                      const isAvailable = myAvailableDates.includes(item.dateStr);

                      // 해당 날짜에 걸친 이벤트 중 level >= 3으로 밀려난 개수
                      const hiddenCount = renderedEvents.filter(({ level, startCol, span }) => {
                        const evtStartCol = startCol;
                        const evtEndCol = startCol + span - 1;
                        return dIdx >= evtStartCol && dIdx <= evtEndCol && level >= 3;
                      }).length;

                      return (
                        <div
                          key={dIdx}
                          onClick={() => {
                            if (item.isCurrentMonth) {
                              setSelectedDate(item.dateStr);
                              setMemoMode('list');
                            }
                          }}
                          style={{
                            backgroundColor: isAvailable ? '#8CA5FF' : '#D9D9D9',
                          }}
                          className={`rounded-xl p-2 flex flex-col justify-between relative cursor-pointer transition-all hover:brightness-95 h-full overflow-hidden ${
                            !item.isCurrentMonth ? 'opacity-40' : ''
                          }`}
                        >
                          <span className="text-sm font-black text-black shrink-0 leading-none">
                            {item.dayNumber}
                          </span>

                          {/* 3개 초과로 숨겨진 일정 (+N) */}
                          {hiddenCount > 0 ? (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate(item.dateStr);
                                setMemoMode('list');
                              }}
                              className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-black text-gray-600 hover:text-black transition-colors z-20 cursor-pointer leading-none"
                            >
                              +{hiddenCount}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                    {/* 레이어 2: 스케줄 바 (level < 3 상위 3개만 표시) */}
                    {(() => {
                      const isSixWeeks = weeks.length > 5;
                      const barHeightClass = isSixWeeks ? 'h-4' : 'h-5'; 
                      const topOffset = isSixWeeks ? 'top-6' : 'top-7.5';
                      const levelGap = isSixWeeks ? 18 : 22; 

                      return (
                        <div className={`absolute inset-x-0 ${topOffset} bottom-1 pointer-events-none grid grid-cols-7 gap-1.5`}>
                          {renderedEvents
                            .filter(({ level }) => level < 3)
                            .map(({ event: evt, startCol, span, level }) => {
                              const isStart = evt.startDate >= weekStartStr;
                              const isEnd = evt.endDate <= weekEndStr;

                              return (
                                <div
                                  key={`${evt.id}-${weekIdx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(evt);
                                  }}
                                  style={{
                                    gridColumnStart: startCol + 1,
                                    gridColumnEnd: `span ${span}`,
                                    backgroundColor: evt.color || '#1B54F2',
                                    top: `${level * levelGap}px` 
                                  }}
                                  className={`pointer-events-auto absolute ${barHeightClass} text-white text-[10px] font-bold px-1.5 flex items-center justify-center shadow-xs cursor-pointer hover:brightness-110 transition-all z-10 overflow-hidden w-full ${
                                    isStart ? 'rounded-l-md' : ''
                                  } ${isEnd ? 'rounded-r-md' : ''}`}
                                  title={evt.title}
                                >
                                  <span className="truncate leading-none text-center w-full">{evt.title}</span>
                                </div>
                              );
                            })}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* 우측 드로어 */}
      <div
        className={`transition-all duration-300 bg-[#EFEFEF] border-l border-gray-300 flex flex-col z-30 shadow-xl shrink-0 ${
          selectedDate ? "w-96" : "w-0 overflow-hidden border-none"
        }`}
      >
        {selectedDate && (
          <div className="p-5 flex flex-col h-full space-y-4 overflow-y-auto w-96 relative">
            <div className="flex justify-between items-center border-b border-gray-300 pb-3">
              <span className="font-extrabold text-lg text-black">{selectedDate}</span>
              <button 
                onClick={() => {
                  setSelectedDate(null);
                  setMemoMode('list');
                }} 
                className="p-1.5 hover:bg-gray-300 rounded-full text-black transition-colors"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop 일정 목록 노출 영역 */}
            <div className="bg-white p-3 rounded-lg shadow-xs space-y-2">
              <div className="flex justify-between items-center border-b pb-1.5">
                <h3 className="font-bold text-sm text-gray-800">일정 순서</h3>
              </div>

              {getEventsForDate(selectedDate).length === 0 ? (
                <p className="text-xs text-gray-400">등록된 일정이 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {getEventsForDate(selectedDate).map((evt, idx) => (
                    <div
                      key={evt.id}
                      draggable
                      onDragStart={() => handleDragStart(evt.id)}
                      onDragOver={(e) => handleDragOverItem(e, evt.id)}
                      onDrop={() => handleDrop(evt.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleOpenEditModal(evt)}
                      className={`flex items-center justify-between p-2 rounded cursor-grab active:cursor-grabbing border transition-all ${
                        dragOverId === evt.id ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-100 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: evt.color }} />
                        <span className="text-xs font-bold text-gray-800 truncate">{evt.title}</span>
                      </div>
                      {idx >= 3 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          숨김
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 참여 가능 / 참여 불가능 섹션 */}
            {(() => {
              const isAvailable = myAvailableDates.includes(selectedDate);
              const userName = currentUser?.name || '사용자';

              return (
                <div className="grid grid-cols-2 gap-3">
                  {/* 참여 가능 */}
                  <div className="bg-[#FFFFFF] p-3 rounded-lg flex flex-col min-h-[140px]">
                    <h3 className="font-black text-lg text-black mb-1">참여 가능</h3>
                    <div className="space-y-1">
                      {isAvailable ? (
                        <p className="text-xs font-bold text-black">{userName}</p>
                      ) : (
                        <p className="text-xs font-bold text-black/40">등록된 가능 인원이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  {/* 참여 불가능 */}
                  <div className="bg-[#FFFFFF] p-3 rounded-lg flex flex-col min-h-[140px]">
                    <h3 className="font-black text-lg text-black mb-1">참여 불가능</h3>
                    <div className="space-y-1">
                      {!isAvailable ? (
                        <p className="text-xs font-bold text-black">{userName}</p>
                      ) : (
                        <p className="text-xs font-bold text-black/40">등록된 불가능 인원이 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 메모 (목록, 작성, 상세, 수정) */}
            <div className="flex-1 bg-[#FFFFFF] p-4 rounded-lg flex flex-col relative min-h-[220px]">
              {memoMode === 'write' ? (
                /* 메모 작성 화면 */
                <form onSubmit={handleSaveMemo} className="flex flex-col h-full space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <span className="font-black text-sm text-black">새 메모 작성</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMemoMode('list');
                        setMemoTitle('');
                        setMemoContent('');
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full text-black transition-colors"
                      title="닫기"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-black shrink-0">제목:</label>
                    <input
                      type="text"
                      value={memoTitle}
                      onChange={(e) => setMemoTitle(e.target.value)}
                      placeholder="메모 제목"
                      className="w-full px-2 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-black focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs font-bold text-black shrink-0">내용:</label>
                    <textarea
                      value={memoContent}
                      onChange={(e) => setMemoContent(e.target.value)}
                      placeholder="내용을 입력하세요"
                      className="w-full flex-1 p-2 rounded-md bg-white border border-gray-200 text-xs text-black focus:outline-none focus:border-blue-400 resize-none min-h-[90px]"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-3 py-1 rounded font-bold text-xs transition-colors"
                    >
                      저장
                    </button>
                  </div>
                </form>
              ) : memoMode === 'edit' ? (
                /*메모 수정 화면*/
                <form onSubmit={handleUpdateMemo} className="flex flex-col h-full space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1">
                    <span className="font-black text-sm text-black">메모 수정</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMemoMode('detail');
                        setMemoTitle('');
                        setMemoContent('');
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full text-black transition-colors"
                      title="취소"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-black shrink-0">제목:</label>
                    <input
                      type="text"
                      value={memoTitle}
                      onChange={(e) => setMemoTitle(e.target.value)}
                      placeholder="메모 제목"
                      className="w-full px-2 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-black focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs font-bold text-black shrink-0">내용:</label>
                    <textarea
                      value={memoContent}
                      onChange={(e) => setMemoContent(e.target.value)}
                      placeholder="내용을 입력하세요"
                      className="w-full flex-1 p-2 rounded-md bg-white border border-gray-200 text-xs text-black focus:outline-none focus:border-blue-400 resize-none min-h-[90px]"
                    />
                  </div>
                
                {/* 메모 수정 하단 버튼 */}
                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={handleDeleteMemo}
                    className="text-red-500 hover:text-red-700 font-bold text-xs transition-colors px-1 py-1"
                  >
                    삭제
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMemoMode('detail')}
                      className="px-3 py-1 rounded font-bold text-xs text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-3 py-1 rounded font-bold text-xs transition-colors"
                    >
                      저장
                    </button>
                  </div>
                </div>
                </form>
              ) : memoMode === 'detail' && selectedMemo ? (
                /* 메모 상세 보기 화면 */
                <div className="flex flex-col h-full space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-400 pb-1">
                    <span className="font-black text-sm text-black truncate pr-2">{selectedMemo.title}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenEditMemo}
                        className="p-1 hover:bg-gray-400/50 rounded-full text-black transition-colors"
                        title="수정"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMemoMode('list');
                          setSelectedMemo(null);
                        }}
                        className="p-1 hover:bg-gray-400/50 rounded-full text-black transition-colors"
                        title="닫기"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 bg-white p-3 rounded-lg overflow-y-auto">
                    <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {selectedMemo.content}
                    </p>
                  </div>
                </div>
              ) : (
                /* 메모 목록 화면 */
                <>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-black text-xl text-black">메모</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setMemoTitle('');
                        setMemoContent('');
                        setMemoMode('write');
                      }}
                      className="p-1 hover:bg-gray-400/50 rounded-full text-black transition-colors"
                      title="메모 작성"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {getMemosForDate(selectedDate).length === 0 ? (
                      <p className="text-xs font-bold text-gray-500">
                        등록된 메모가 없습니다.
                      </p>
                    ) : (
                      getMemosForDate(selectedDate).map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMemo(m);
                            setMemoMode('detail');
                          }}
                          className="bg-white border border-gray-200 p-2.5 rounded-lg shadow-xs cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                        >
                          <span className="font-bold text-xs text-black truncate">{m.title}</span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 참여 가능일 설정 모달 */}
      {isAvailabilityModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-extrabold text-gray-900">{month + 1}월 참여 가능일</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsAvailabilityModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-medium">
              참여가 가능한 날짜를 클릭하여 선택하세요.
            </p>

            <div className="grid grid-cols-7 gap-1.5 text-center my-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                <span key={d} className="text-xs font-bold text-gray-400">{d}</span>
              ))}
              {calendarDays.map((item) => {
                const isSelected = myAvailableDates.includes(item.dateStr);
                
                if (!item.isCurrentMonth) {
                  return (
                    <div 
                      key={item.dateStr} 
                      className="h-9 rounded-lg text-xs font-bold text-gray-300 flex items-center justify-center pointer-events-none"
                    >
                      {item.dayNumber}
                    </div>
                  );
                }

                return (
                  <button
                    key={item.dateStr}
                    onClick={() => toggleAvailableDate(item.dateStr)}
                    className={`h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#8CA5FF] text-white shadow-xs scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.dayNumber}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAvailabilityModalOpen(false)}
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md transition-colors"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 새 일정 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddEvent}
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="border-b border-gray-100 pb-2.5">
              <h3 className="text-base font-extrabold text-gray-900">새 일정 추가</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">일정 제목</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="일정 이름을 입력하세요"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700">시작일</label>
                  <input 
                    type="date" 
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 mt-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">종료일</label>
                  <input 
                    type="date" 
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 mt-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">일정 색상</label>
                <div className="flex items-center gap-2.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                        newColor === c ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-105'
                      }`}
                    >
                      {newColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-md transition-colors"
              >
                추가
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 일정 수정 / 삭제 모달 */}
      {selectedEventToEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleUpdateEvent}
            className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="border-b border-gray-100 pb-2.5">
              <h3 className="text-base font-extrabold text-gray-900">일정 수정 / 삭제</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">일정 제목</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700">시작일</label>
                  <input 
                    type="date" 
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 mt-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">종료일</label>
                  <input 
                    type="date" 
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 mt-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">일정 색상</label>
                <div className="flex items-center gap-2.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${
                        editColor === c ? 'scale-110 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-105'
                      }`}
                    >
                      {editColor === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDeleteEvent}
                className="px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 font-bold text-sm transition-colors flex items-center gap-1"
              >
                <span>삭제</span>
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEventToEdit(null)}
                  className="px-3 py-1.5 rounded-lg text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg font-bold text-sm shadow-md transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}