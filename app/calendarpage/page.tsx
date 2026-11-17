"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { 
  ChevronLeft, ChevronRight, Unlock, Lock, User, X, Plus, Check, GripVertical, Calendar as CalendarIcon, Edit3
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

  // ============= 참여 가능일 및 팀원 데이터 ===============
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [allAvailabilities, setAllAvailabilities] = useState<Array<{ id: string; user_id: string; date_str: string }>>([]);

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

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 메모
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [memoMode, setMemoMode] = useState<'list' | 'write' | 'detail' | 'edit'>('list');
  const [selectedMemo, setSelectedMemo] = useState<MemoItem | null>(null);
  const [memoTitle, setMemoTitle] = useState<string>('');
  const [memoContent, setMemoContent] = useState<string>('');

  const [isLocked, setIsLocked] = useState(false);
  
  // 현재 보고 있는 달에서 오늘이 속한 달로 이동
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date());
  };
  
  useEffect(() => {
    const fetchUserDataAndAvailabilities = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 잠금 기능 추가 시 shareSheet처럼 손님 기능으로 수정
      if (!user) {
        alert('로그인이 필요한 서비스입니다.');
        router.push('/login');
        return;
      }

      const currentMemberName = user.user_metadata?.full_name || user.email?.split('@')[0] || '사용자';
      setCurrentUser({
        id: user.id,
        name: currentMemberName,
        email: user.email || ''
      });

      // RLS 정책 추가 시 로그인된 사람 목록만
      const { data: availData, error: availError } = await supabase
        .from('cal_availabilities')
        .select(`
          id,
          user_id,
          date_str,
          profiles (
            nickname
          )
        `);

      if (availError) {
        console.error('참여 가능일 불러오기 실패:', availError);
        return;
      }

      if (availData) {
        // 참여 가능일 목록
        const mappedAvailabilities = availData.map((item: any) => {
          const profileInfo = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return {
            id: item.id,
            user_id: item.user_id,
            date_str: item.date_str,
            nickname: profileInfo?.nickname || '닉네임 없음'
          };
        });

        setAllAvailabilities(mappedAvailabilities);

        // 팀원 목록 유니크 추출
        const uniqueMembersMap = new Map();
        availData.forEach((item: any) => {
          const profileInfo = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          if (item.user_id) {
            uniqueMembersMap.set(item.user_id, {
              id: item.user_id,
              name: profileInfo?.nickname || '사용자'
            });
          }
        });

        // 내가 참여 가능일을 아직 안 눌러서 availData에 없다면 팀원 목록에 추가
        if (!uniqueMembersMap.has(user.id)) {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', user.id)
            .single();

          uniqueMembersMap.set(user.id, {
            id: user.id,
            name: myProfile?.nickname || currentMemberName
          });
        }

        setTeamMembers(Array.from(uniqueMembersMap.values()));
      }
    };

    fetchUserDataAndAvailabilities();
  }, [router]);

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
        .order('sort_order', { ascending: true }) // sort_order 기준 정렬로 변경
        .order('created_at', { ascending: true });

      if (error) {
        console.error('일정 불러오기 실패:', error);
        return;
      }

      if (data) {
        const mappedEvents: CalendarEvent[] = data.map((evt, index) => ({
          id: evt.id,
          title: evt.title,
          startDate: evt.start_date,
          endDate: evt.end_date,
          color: evt.color,
          // 기존 데이터에 sort_order가 없는 경우 조회 순서를 보존합니다.
          sortOrder: evt.sort_order ?? index
        }));
        setEvents(mappedEvents);
      }
    };

    fetchEvents();
  }, []);

  // ========== 참여 가능일 ===========
  const toggleAvailableDate = async (dateStr: string) => {

    const existingItem = allAvailabilities.find(
      (item) => item.user_id === currentUser?.id && item.date_str === dateStr
    );

    if (existingItem) {
      // 이미 체크된 경우 -> DB에서 삭제
      const { error } = await supabase
        .from('cal_availabilities')
        .delete()
        .eq('id', existingItem.id);

      if (error) {
        alert('참여 가능일 취소에 실패했습니다.');
        console.error(error);
        return;
      }

      setAllAvailabilities((prev) => prev.filter((item) => item.id !== existingItem.id));
    } else {
      // 체크되지 않은 경우 -> DB에 추가
      const { data, error } = await supabase
        .from('cal_availabilities')
        .insert([
          {
            user_id: currentUser?.id,
            date_str: dateStr,
          },
        ])
        .select()
        .single();

      if (error) {
        alert('참여 가능일 등록에 실패했습니다.');
        console.error(error);
        return;
      }

      if (data) {
        setAllAvailabilities((prev) => [...prev, data]);
      }
    }
  };

  // 팀원 전원이 해당 날짜에 참여 가능한지 판별
  const isAllTeamAvailable = (dateStr: string) => {
    if (teamMembers.length === 0) return false;

    const usersWhoCanAttend = allAvailabilities
      .filter((item) => item.date_str === dateStr)
      .map((item) => item.user_id);

    return teamMembers.every((member) => usersWhoCanAttend.includes(member.id));
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

  const handleDrop = async (targetId: string) => {
    if (draggedItemId === null || draggedItemId === targetId) {
      setDraggedItemId(null);
      setDragOverId(null);
      return;
    }

    const originalEvents = events;

    // 정렬은 날짜별 목록이 아닌 전체 일정의 단일 순서로 관리합니다.
    // 따라서 한 날짜에서 드래그한 결과가 다른 날짜의 순서 목록에도 일관되게 반영됩니다.
    const reorderedEvents = reorderById(
      [...events].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      draggedItemId,
      targetId
    );
    const updatedEvents = reorderedEvents.map((evt, index) => ({
      ...evt,
      sortOrder: index,
    }));

    setEvents(updatedEvents);
    setDraggedItemId(null);
    setDragOverId(null);

    try {
      // 순서 저장이 실패하면 UI를 원래 상태로 복원합니다.
      const results = await Promise.all(
        updatedEvents.map((evt) =>
          supabase
            .from('cal_events')
            .update({ sort_order: evt.sortOrder })
            .eq('id', evt.id)
        )
      );
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
    } catch (error) {
      console.error('일정 순서 저장 실패:', error);
      setEvents(originalEvents);
      alert('순서 변경을 저장하지 못했습니다. 다시 시도해주세요.');
    }
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverId(null);
  };

  const handleGoToProjectMain = () => {
    router.push('/Projectmainpage');
  };
  
  // 일정 추가
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

    if (isLoading) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('cal_events')
      .insert([
        {
          title: newTitle,
          start_date: newStartDate,
          end_date: newEndDate,
          color: newColor,
          sort_order: events.length,
          user_id: currentUser?.id || null
        },
      ])
      .select()
      .single();

    setIsLoading(false);

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
        color: data.color,
        sortOrder: events.length,
      };

      setEvents((prev) => [...prev, addedEvent]);
      setNewTitle('');
      setNewColor(COLOR_OPTIONS[0]);
      setIsAddModalOpen(false);
    }
  };

  // 일정 수정
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

    if (isLoading) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('cal_events')
      .update({
        title: editTitle,
        start_date: editStartDate,
        end_date: editEndDate,
        color: editColor
      })
      .eq('id', selectedEventToEdit.id);

    setIsLoading(false);

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

  // 일정 삭제
  const handleDeleteEvent = async () => {
    if (!selectedEventToEdit || isLoading) return;

    if (window.confirm('일정을 삭제하시겠습니까?')) {
      setIsLoading(true);
      const { error } = await supabase
        .from('cal_events')
        .delete()
        .eq('id', selectedEventToEdit.id);

      setIsLoading(false);

      if (error) {
        alert('일정 삭제에 실패했습니다.');
        console.error(error);
        return;
      }

      setEvents((prev) => prev.filter((evt) => evt.id !== selectedEventToEdit.id));
      setSelectedEventToEdit(null);
    }
  };

  // 메모 저장 (제목이나 내용 중 하나만 있어도 허용)
  const handleSaveMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoTitle.trim() && !memoContent.trim()) {
      alert('제목 또는 내용을 입력해주세요.');
      return;
    }

    if (!selectedDate || isLoading) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('cal_memos')
      .insert([
        {
          date_str: selectedDate,
          title: memoTitle.trim() ? memoTitle : '제목 없음', // 제목이 비어있으면 기본값 처리
          content: memoContent,
          user_id: currentUser?.id || null,
        },
      ])
      .select()
      .single();

    setIsLoading(false);

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

  // 메모 수정 화면 열기
  const handleOpenEditMemo = () => {
    if (!selectedMemo) return;
    setMemoTitle(selectedMemo.title);
    setMemoContent(selectedMemo.content);
    setMemoMode('edit');
  };

  // 메모 수정
  const handleUpdateMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoTitle.trim() && !memoContent.trim()) {
      alert('제목 또는 내용을 입력해주세요.');
      return;
    }

    if (!selectedMemo || isLoading) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('cal_memos')
      .update({
        title: memoTitle.trim() ? memoTitle : '제목 없음',
        content: memoContent,
      })
      .eq('id', selectedMemo.id);

    setIsLoading(false);

    if (error) {
      alert('메모 수정에 실패했습니다.');
      console.error(error);
      return;
    }

    const updatedMemo = {
      ...selectedMemo,
      title: memoTitle.trim() ? memoTitle : '제목 없음',
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

  // 메모 삭제
  const handleDeleteMemo = async () => {
    if (!selectedMemo || isLoading) return;

    if (window.confirm('메모를 삭제하시겠습니까?')) {
      setIsLoading(true);
      const { error } = await supabase
        .from('cal_memos')
        .delete()
        .eq('id', selectedMemo.id);

      setIsLoading(false);

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

  const handleOpenEditModal = (evt: CalendarEvent) => {
    setSelectedEventToEdit(evt);
    setEditTitle(evt.title);
    setEditStartDate(evt.startDate);
    setEditEndDate(evt.endDate);
    setEditColor(evt.color || COLOR_OPTIONS[0]);
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
    return events
      .filter((evt) => dateStr >= evt.startDate && dateStr <= evt.endDate)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  };

  const getMemosForDate = (dateStr: string) => {
    return memos.filter((m) => m.dateStr === dateStr);
  };

  // 전역 정렬 순서를 기준으로 전체 기간에 걸친 고정 레인을 한 번 계산합니다.
  // 일정이 여러 주에 걸쳐도 같은 lane을 사용하므로 막대의 높이가 주마다 바뀌지 않습니다.
  const getGlobalEventLanes = () => {
    const lanes: CalendarEvent[][] = [];
    const laneByEventId = new Map<string, number>();
    const orderedEvents = [...events].sort((a, b) => {
      const orderA = a.sortOrder ?? events.findIndex((evt) => evt.id === a.id);
      const orderB = b.sortOrder ?? events.findIndex((evt) => evt.id === b.id);
      return orderA - orderB;
    });

    orderedEvents.forEach((evt) => {
      // 이전에 정렬된 일정 중 겹치는 일정보다 위쪽 레인으로 새 일정이
      // 올라가지 않게 합니다. 이렇게 해야 일정 순서 목록과 막대의 위아래가 일치합니다.
      const overlappingPriorLanes = orderedEvents
        .slice(0, orderedEvents.findIndex((item) => item.id === evt.id))
        .filter((prior) => evt.startDate <= prior.endDate && evt.endDate >= prior.startDate)
        .map((prior) => laneByEventId.get(prior.id) ?? -1);
      let lane = overlappingPriorLanes.length > 0
        ? Math.max(...overlappingPriorLanes) + 1
        : 0;

      // 같은 레인에 날짜가 겹치는 일정이 있는 경우 아래 레인으로 이동합니다.
      while (lanes[lane]?.some(
        (placed) => evt.startDate <= placed.endDate && evt.endDate >= placed.startDate
      )) {
        lane++;
      }

      if (!lanes[lane]) lanes[lane] = [];
      lanes[lane].push(evt);
      laneByEventId.set(evt.id, lane);
    });

    return laneByEventId;
  };

  const eventLanes = getGlobalEventLanes();

  const getWeekEventLayout = (weekDays: typeof calendarDays) => {
    const weekStartStr = weekDays[0].dateStr;
    const weekEndStr = weekDays[6].dateStr;
    const weekEvents = events.filter(
      (evt) => evt.startDate <= weekEndStr && evt.endDate >= weekStartStr
    );

    return weekEvents.map((evt) => {
      // 주 시작/끝을 넘어가는 일정은 이번 주에 보이는 부분만 렌더링합니다.
      const visibleStart = evt.startDate < weekStartStr ? weekStartStr : evt.startDate;
      const visibleEnd = evt.endDate > weekEndStr ? weekEndStr : evt.endDate;
      const startCol = weekDays.findIndex((day) => day.dateStr === visibleStart);
      const endCol = weekDays.findIndex((day) => day.dateStr === visibleEnd);

      return {
        event: evt,
        startCol: startCol === -1 ? 0 : startCol,
        span: (endCol === -1 ? 6 : endCol) - (startCol === -1 ? 0 : startCol) + 1,
        level: eventLanes.get(evt.id) ?? 0,
      };
    });
  };

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden font-sans select-none relative">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        {/* 잠금 상태 안내 배너 */}
        {isLocked && (
          <div className="flex items-center justify-center gap-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold py-2 shrink-0">
            <Lock className="w-3.5 h-3.5" />
            <span>잠금 상태입니다. 자물쇠를 다시 누르면 편집할 수 있습니다.</span>
          </div>
        )}

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
              onClick={() => {
                if (isLocked) {
                  alert("잠금 상태에서는 추가할 수 없습니다.");
                  return;
                }
                setIsAddModalOpen(true);
              }} 
              disabled={isLocked}
              className="p-1.5 hover:bg-gray-100 disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed rounded-full text-gray-700 transition-colors"
              title={isLocked ? "잠금 상태에서는 추가할 수 없습니다" : "일정 추가"}
            >
              <Plus className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                if (isLocked) {
                  alert("잠금 상태에서는 참여 가능일을 변경할 수 없습니다.");
                  return;
                }
                setIsAvailabilityModalOpen(true);
              }} 
              disabled={isLocked}
              className="p-1.5 hover:bg-gray-100 disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed rounded-full text-gray-700 transition-colors"
              title={isLocked ? "잠금 상태에서는 설정을 변경할 수 없습니다" : "참여 가능일 설정"}
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
            {/* 참여 가능일 아이콘(CalendarIcon) 바로 오른쪽에 '오늘' 버튼 배치 */}
            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-bold text-sky-200 hover:text-blue-500 transition-colors px-2 py-1.5"
              style={{ textDecoration: 'none' }}
            >
              오늘
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
            {/* 자물쇠 토글 버튼 */}
            <button 
              type="button"
              onClick={() => setIsLocked((prev) => !prev)}
              className={`p-2 rounded-lg border transition-colors ${
                isLocked
                  ? "bg-[#FF4D4D] border-[#FF4D4D] text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              title={isLocked ? "잠금 해제 (편집 가능)" : "잠그기 (편집 불가)"}
            >
              {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
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
                      const isAllAvailable = isAllTeamAvailable(item.dateStr);

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
                            backgroundColor: isAllAvailable ? '#8CA5FF' : '#D9D9D9',
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
        className={`transition-all duration-300 bg-[#EFEFEF] border-l border-gray-300 flex flex-col z-30 shadow-xl shrink-0 h-full overflow-hidden ${
          selectedDate ? "w-96" : "w-0 border-none"
        }`}
      >
        {selectedDate && (
          <div className="p-5 flex flex-col h-full w-96 relative overflow-hidden box-border gap-3">
            {/* 상단 날짜 및 닫기 버튼 */}
            <div className="flex justify-between items-center border-b border-gray-300 pb-3 shrink-0">
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

            {/* 일정 순서 목록 (최대 높이 제한 및 내부 스크롤 부여) */}
            <div className="bg-white p-3 rounded-lg shadow-xs shrink-0 max-h-44 flex flex-col">
              <div className="flex justify-between items-center border-b pb-1.5 shrink-0">
                <h3 className="font-bold text-sm text-gray-800">일정 순서</h3>
              </div>

              <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-xs text-gray-400 py-1">등록된 일정이 없습니다.</p>
                ) : (
                  getEventsForDate(selectedDate).map((evt) => (
                    <div
                      key={evt.id}
                      draggable={!isLocked}
                      onDragStart={() => !isLocked && handleDragStart(evt.id)}
                      onDragOver={(e) => !isLocked && handleDragOverItem(e, evt.id)}
                      onDrop={() => !isLocked && handleDrop(evt.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isLocked) {
                          alert("잠금 상태에서는 일정을 수정할 수 없습니다.");
                          return;
                        }
                        handleOpenEditModal(evt);
                      }}
                      className={`flex items-center justify-between p-2 rounded border transition-all ${
                        isLocked 
                          ? 'cursor-not-allowed opacity-75 border-gray-100 bg-white' 
                          : 'cursor-grab active:cursor-grabbing hover:bg-gray-50 border-gray-100 bg-white'
                      } ${dragOverId === evt.id ? 'border-blue-500 bg-blue-50 scale-[1.01]' : ''}`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: evt.color }} />
                        <span className="text-xs font-bold text-gray-800 truncate">{evt.title}</span>
                      </div>
                      {(eventLanes.get(evt.id) ?? 0) >= 3 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          숨김
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 참여 가능 / 참여 불가능 섹션 */}
            {(() => {
              // 선택한 날짜에 체크한 유저 id 목록 뽑기
              const attendeesUserIds = allAvailabilities
                .filter((item) => item.date_str === selectedDate)
                .map((item) => item.user_id);

              // 팀원 중 참여 가능한 사람과 불가능한 사람 분류
              const availableMembers = teamMembers.filter((m) => attendeesUserIds.includes(m.id));
              const unavailableMembers = teamMembers.filter((m) => !attendeesUserIds.includes(m.id));

              return (
                <div className="grid grid-cols-2 gap-3">
                  {/* 참여 가능 */}
                  <div className="bg-[#FFFFFF] p-3 rounded-lg flex flex-col h-24 overflow-hidden">
                    <h3 className="font-black text-sm text-black mb-1 shrink-0">참여 가능</h3>
                    <div className="flex-1 overflow-y-auto space-y-1">
                      {availableMembers.length > 0 ? (
                        availableMembers.map((m) => (
                          <p key={m.id} className="text-xs font-bold text-black">{m.name}</p>
                        ))
                      ) : (
                        <p className="text-xs font-bold text-black/40">등록된 가능 인원이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  {/* 참여 불가능 */}
                  <div className="bg-[#FFFFFF] p-3 rounded-lg flex flex-col h-24 overflow-hidden">
                    <h3 className="font-black text-sm text-black mb-1 shrink-0">참여 불가능</h3>
                    <div className="flex-1 overflow-y-auto space-y-1">
                      {unavailableMembers.length > 0 ? (
                        unavailableMembers.map((m) => (
                          <p key={m.id} className="text-xs font-bold text-black">{m.name}</p>
                        ))
                      ) : (
                        <p className="text-xs font-bold text-black/40">등록된 불가능 인원이 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 메모 */}
            <div className="flex-1 bg-[#FFFFFF] p-4 rounded-lg flex flex-col relative min-h-0 overflow-hidden shadow-xs">
              {memoMode === 'write' ? (
                /* 메모 작성 화면 */
                <form onSubmit={handleSaveMemo} className="flex flex-col h-full space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1 shrink-0">
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

                  <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs font-bold text-black shrink-0">제목:</label>
                  <input
                    type="text"
                    value={memoTitle}
                    onChange={(e) => setMemoTitle(e.target.value)}
                    placeholder="메모 제목"
                    className="w-full px-2 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-black focus:outline-none focus:border-blue-400"
                  />
                </div>

                  <div className="flex-1 flex flex-col gap-1 min-h-0">
                    <label className="text-xs font-bold text-black shrink-0">내용:</label>
                    <textarea
                      value={memoContent}
                      onChange={(e) => setMemoContent(e.target.value)}
                      placeholder="내용을 입력하세요"
                      className="w-full flex-1 p-2 rounded-md bg-white border border-gray-200 text-xs text-black focus:outline-none focus:border-blue-400 resize-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1 shrink-0">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-3 py-1 rounded font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      저장
                    </button>
                  </div>
                </form>
              ) : memoMode === 'edit' ? (
                /* 메모 수정 화면 */
                <form onSubmit={handleUpdateMemo} className="flex flex-col h-full space-y-2">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-1 shrink-0">
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

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs font-bold text-black shrink-0">제목:</label>
                    <input
                      type="text"
                      value={memoTitle}
                      onChange={(e) => setMemoTitle(e.target.value)}
                      placeholder="메모 제목"
                      className="w-full px-2 py-1.5 rounded-md bg-white border border-gray-200 text-xs text-black focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="flex-1 flex flex-col gap-1 min-h-0">
                    <label className="text-xs font-bold text-black shrink-0">내용:</label>
                    <textarea
                      value={memoContent}
                      onChange={(e) => setMemoContent(e.target.value)}
                      placeholder="내용을 입력하세요"
                      className="w-full flex-1 p-2 rounded-md bg-white border border-gray-200 text-xs text-black focus:outline-none focus:border-blue-400 resize-none"
                    />
                  </div>
                
                  {/* 메모 수정 하단 버튼 */}
                  <div className="flex justify-between items-center pt-1 shrink-0">
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
                  <div className="flex justify-between items-center border-b border-gray-400 pb-1 shrink-0">
                    <span className="font-black text-sm text-black truncate pr-2">{selectedMemo.title}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          if (isLocked) {
                            alert("잠금 상태에서는 메모를 수정할 수 없습니다.");
                            return;
                          }
                          handleOpenEditMemo();
                        }}
                        className="p-1 hover:bg-gray-400/50 disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed rounded-full text-black transition-colors"
                        title={isLocked ? "잠금 상태에서는 수정할 수 없습니다" : "수정"}
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
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-2 shrink-0">
                    <h3 className="font-black text-xl text-black">메모</h3>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => {
                        if (isLocked) {
                          alert("잠금 상태에서는 메모를 작성할 수 없습니다.");
                          return;
                        }
                        setMemoTitle('');
                        setMemoContent('');
                        setMemoMode('write');
                      }}
                      className="p-1 hover:bg-gray-400/50 disabled:hover:bg-transparent disabled:opacity-40 disabled:cursor-not-allowed rounded-full text-black transition-colors"
                      title={isLocked ? "잠금 상태에서는 작성할 수 없습니다" : "메모 작성"}
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
                    {getMemosForDate(selectedDate).length === 0 ? (
                      <p className="text-xs font-bold text-gray-500 py-2">
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
                </div>
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
                const isSelected = currentUser 
                  ? allAvailabilities.some((a) => a.user_id === currentUser.id && a.date_str === item.dateStr)
                  : false;
                
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