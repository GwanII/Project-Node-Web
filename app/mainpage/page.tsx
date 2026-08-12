"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: number;
  title: string;
  leader: string;
  members: number;
  deadline: string;
  dDay: string;
  isHighlighted?: boolean;
}

interface NotificationItem {
  id: number;
  project: string;
  text: string;
  link: string;
}

interface TodoItem {
  id: number;
  project: string;
  text: string;
  deadline: string;
  completed: boolean;
}

export default function MainPage() {
  const router = useRouter();

  // 화면에 6개의 프로젝트가 표시되도록 6개 기본 설정
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      title: "프로젝트 NODE",
      leader: "박성빈",
      members: 5,
      deadline: "2026.12.23",
      dDay: "D-Day 5",
    },
    {
      id: 2,
      title: "프로젝트 NODE",
      leader: "박성빈",
      members: 5,
      deadline: "2026.12.23",
      dDay: "D-Day 200",
      isHighlighted: true,
    },
    {
      id: 3,
      title: "AI 공모전",
      leader: "김재호",
      members: 2,
      deadline: "2026.08.03",
      dDay: "D-Day 93",
    },
    {
      id: 4,
      title: "AI 공모전",
      leader: "김재호",
      members: 2,
      deadline: "2026.08.03",
      dDay: "D-Day 93",
    },
    {
      id: 5,
      title: "프로젝트 NODE",
      leader: "박성빈",
      members: 5,
      deadline: "2026.12.23",
      dDay: "D-Day 5",
    },
    {
      id: 6,
      title: "PBL2",
      leader: "박기완",
      members: 4,
      deadline: "2026.08.03",
      dDay: "D-Day 93",
    },
  ]);

  const maxProjectsLimit = 8; // 전체 정원을 8개로 설정

  // 정렬 및 검색 상태
  const [sortBy, setSortBy] = useState<"deadline" | "latest">("deadline");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(2);

  // 사이드바 (우측 패널) 열림/닫힘 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // 사이드바 바깥 여백 클릭 시 닫기
  useEffect(() => {
    const handleClickOutsideSidebar = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setIsSidebarOpen(false);
      }
    };

    // mousedown을 쓰면 사이드바가 닫히며 레이아웃이 즉시 리플로우되어
    // 뒤이어 발생하는 click(카드 클릭 등)의 대상이 어긋난다.
    // click 이벤트를 쓰면 React의 onClick(라우팅 등)이 먼저 처리된 뒤 닫힌다.
    if (isSidebarOpen) {
      document.addEventListener("click", handleClickOutsideSidebar);
    }
    return () => {
      document.removeEventListener("click", handleClickOutsideSidebar);
    };
  }, [isSidebarOpen]);

  // 사용자 프로필 메뉴 열림/닫힘 상태
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // 외부 클릭 시 메뉴 닫기용 ref 및 useEffect
  const userMenuRef1 = useRef<HTMLDivElement>(null);
  const userMenuRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        userMenuRef1.current &&
        !userMenuRef1.current.contains(target) &&
        userMenuRef2.current &&
        !userMenuRef2.current.contains(target)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // 사이드바 내부 섹션 접기 상태
  const [isNotiFolded, setIsNotiFolded] = useState(false);
  const [isTodoFolded, setIsTodoFolded] = useState(false);

  // 알림 목록 데이터
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 1,
      project: "프로젝트 NODE",
      text: "박성빈 님이 새 투표를 올렸습니다.",
      link: '"버튼 UI 선택"',
    },
    {
      id: 2,
      project: "프로젝트 NODE",
      text: "박기완 님이 새 회의록을 작성했습니다.",
      link: '"1주차 회의록"',
    },
    {
      id: 3,
      project: "프로젝트 NODE",
      text: "D-1 투표하지 않은 투표가 있습니다.",
      link: '"최종 발표자 투표"',
    },
  ]);

  // 오늘 마감인 할 일 목록 데이터
  const [todos, setTodos] = useState<TodoItem[]>([
    {
      id: 1,
      project: "PBL2",
      text: "최종 발표 PPT 만들기",
      deadline: "오늘 20:00",
      completed: false,
    },
    {
      id: 2,
      project: "프로젝트 NODE",
      text: "피그마 디자인하기",
      deadline: "오늘 23:59",
      completed: true,
    },
  ]);

  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // 새 프로젝트 입력 필드
  const [newTitle, setNewTitle] = useState("");
  const [newLeader, setNewLeader] = useState("박성빈");
  const [newMembers, setNewMembers] = useState(5);
  const [newDeadline, setNewDeadline] = useState("2026.12.23");

  // 검색 및 정렬 결과 계산
  const filteredProjects = useMemo(() => {
    let result = projects.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.leader.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === "deadline") {
      result.sort((a, b) => {
        const numA = parseInt(a.dDay.replace(/[^0-9]/g, ""), 10) || 0;
        const numB = parseInt(b.dDay.replace(/[^0-9]/g, ""), 10) || 0;
        return numA - numB;
      });
    } else {
      result.sort((a, b) => b.id - a.id);
    }
    return result;
  }, [projects, searchQuery, sortBy]);

  // 삭제 처리
  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("프로젝트를 삭제하시겠습니까?")) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  };

  // 알림 삭제
  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // 할 일 삭제
  const removeTodo = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  // 할 일 완료 토글
  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // 프로젝트 생성 처리
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (projects.length >= maxProjectsLimit) {
      alert("최대 프로젝트 수(8개)에 도달하였습니다. 플랜 업그레이드가 필요합니다.");
      setIsCreateModalOpen(false);
      setIsUpgradeModalOpen(true);
      return;
    }

    const newProject: Project = {
      id: Date.now(),
      title: newTitle,
      leader: newLeader,
      members: Number(newMembers),
      deadline: newDeadline.replace(/-/g, "."),
      dDay: "D-Day 30",
    };

    setProjects((prev) => [...prev, newProject]);
    setNewTitle("");
    setIsCreateModalOpen(false);
  };

  return (
    <div className="relative w-full min-h-screen bg-white flex flex-row overflow-x-hidden font-sans antialiased text-gray-800">
      
      {/* ================= 메인 좌측 전체 영역 ================= */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        {/* 1. 상단 헤더 */}
        <header className="px-6 md:px-12 py-5 flex items-center justify-between bg-white border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="text-2xl font-extrabold tracking-tight text-gray-900 leading-tight text-left cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
            >
              프로젝트<br />로고
            </button>
          </div>
          
          {/* 사이드바가 닫혀있을 때만 헤더 우측에 프로필 표시 */}
          {!isSidebarOpen && (
            <div className="relative" ref={userMenuRef1}>
              <div className="flex items-center space-x-2 text-gray-700 text-sm font-medium">
                <span>
                  <span
                    className="relative inline-block"
                    onMouseEnter={() => setIsUserMenuOpen(true)}
                    onMouseLeave={() => setIsUserMenuOpen(false)}
                  >
                    <strong className="text-blue-600 font-semibold cursor-pointer hover:underline">박성빈</strong>

                    {/* 사용자 드롭다운 메뉴 */}
                    {isUserMenuOpen && (
                      <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-800 shadow-2xl rounded-lg p-3 z-50 animate-fadeIn space-y-2 text-sm text-gray-900 font-semibold">
                        <button
                          onClick={() => {
                            setIsUpgradeModalOpen(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left flex items-center gap-2.5 hover:text-blue-600 py-1 transition-colors group"
                        >
                          <svg className="w-4 h-4 text-gray-800 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l3.057 6.114L12 4l3.943 5.114L19 3v15H5V3z" />
                          </svg>
                          <span className="underline underline-offset-4">플랜 업그레이드</span>
                        </button>

                        <button
                          onClick={() => {
                            alert("사용자 프로필 페이지로 이동합니다.");
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left flex items-center gap-2.5 hover:text-blue-600 py-1 transition-colors group"
                        >
                          <svg className="w-4 h-4 text-gray-800 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="underline underline-offset-4">사용자 프로필</span>
                        </button>

                        <button
                          onClick={() => {
                            alert("계정 변경 페이지로 이동합니다.");
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left flex items-center gap-2.5 hover:text-blue-600 py-1 transition-colors group"
                        >
                          <svg className="w-4 h-4 text-gray-800 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="underline underline-offset-4">계정 변경</span>
                        </button>

                        <button
                          onClick={() => {
                            alert("로그아웃 되었습니다.");
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left flex items-center gap-2.5 hover:text-red-600 py-1 transition-colors group"
                        >
                          <svg className="w-4 h-4 text-gray-800 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="underline underline-offset-4">로그아웃</span>
                        </button>
                      </div>
                    )}
                  </span>
                  님 환영합니다
                </span>
                <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-500 bg-gray-50 hover:border-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* 2. 순항 배너 */}
        <div className="bg-[#8CA5FF] py-3.5 px-6 text-center text-white font-bold text-lg md:text-xl tracking-wide flex items-center justify-center gap-2 shadow-sm">
          <span>현재 {projects.length}개의 프로젝트가 순항중입니다.</span>
          {/* 비행기 아이콘 */}
          <svg className="w-6 h-6 inline-block text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>

        {/* 3. 내 프로젝트 메인 콘텐츠 영역 */}
        <main className={`p-6 md:p-12 flex-1 flex flex-col ${!isSidebarOpen ? "pr-14 md:pr-16" : ""}`}>
          {/* 툴바 (타이틀, 정렬, 검색, 6/8 개수 표시) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            {/* 좌측: 타이틀 및 정렬 옵션 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>내 프로젝트</span>
              </div>

              {/* 정렬 버튼 */}
              <div className="flex items-center text-sm space-x-1 text-gray-600 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <button
                  onClick={() => setSortBy("deadline")}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    sortBy === "deadline" ? "font-bold text-gray-900 underline underline-offset-4" : "hover:text-gray-900"
                  }`}
                >
                  [마감일순]
                </button>
                <button
                  onClick={() => setSortBy("latest")}
                  className={`px-1.5 py-0.5 rounded transition-colors ${
                    sortBy === "latest" ? "font-bold text-gray-900 underline underline-offset-4" : "hover:text-gray-900"
                  }`}
                >
                  [최신 순]
                </button>
              </div>
            </div>

            {/* 우측: 검색 및 개수 표시 (6 / 8) */}
            <div className="flex items-center gap-4 self-end md:self-auto">
              <div className="relative">
                <svg className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="프로젝트 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 rounded-full border border-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-700 placeholder-blue-300 w-44 sm:w-56 md:w-64"
                />
              </div>

              {/* 전체 8 기준 현재 개수 표시 (6 / 8) */}
              <div className="text-base font-bold text-blue-400 min-w-[40px] text-right">
                {projects.length} / {maxProjectsLimit}
              </div>
            </div>
          </div>

          {/* 4. 프로젝트 카드 그리드 */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 pb-6">
            
            {/* [카드 0] 프로젝트 생성 카드 */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="group border-2 border-[#8CA5FF] rounded-2xl p-5 flex flex-col items-center justify-center min-h-[220px] bg-white hover:bg-blue-50/40 hover:border-blue-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <div className="w-14 h-14 rounded-full border-2 border-[#8CA5FF] group-hover:border-blue-500 flex items-center justify-center mb-3 text-[#8CA5FF] group-hover:text-blue-500 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-[#8CA5FF] group-hover:text-blue-500 font-bold text-sm">
                프로젝트 생성
              </span>
            </button>

            {/* [프로젝트 카드 목록] */}
            {filteredProjects.map((project) => {
              const isSelected = selectedId === project.id;
              return (
                <div
                  key={project.id}
                  onClick={() => {
                    setSelectedId(project.id);
                    router.push("/Projectmainpage");
                  }}
                  className={`relative border-2 border-[#8CA5FF] rounded-2xl p-5 bg-white flex flex-col justify-between min-h-[220px] cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "ring-4 ring-blue-100 shadow-xl border-blue-500 -translate-y-1"
                      : "hover:shadow-md hover:-translate-y-0.5"
                  }`}
                >
                  {/* 카드 상단: D-Day 배지 및 휴지통 삭제 아이콘 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#8CA5FF] text-white text-xs font-bold px-3 py-1 rounded-full border border-blue-300 shadow-sm">
                      {project.dDay}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id, e);
                      }}
                      title="프로젝트 삭제"
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* 카드 중단: 프로젝트 제목 */}
                  <div className="my-2">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                      {project.title}
                    </h3>
                  </div>

                  {/* 카드 하단: 팀 정보 */}
                  <div className="space-y-1 text-sm text-gray-700 font-medium pt-2.5 border-t border-gray-50">
                    <div><span className="text-gray-500">팀장 :</span> {project.leader}</div>
                    <div><span className="text-gray-500">팀원 :</span> {project.members}명</div>
                    <div><span className="text-gray-500">마감 :</span> {project.deadline}</div>
                  </div>
                </div>
              );
            })}

            {/* [카드 N] 플랜 업그레이드 필요 카드 (잠금 카드) */}
            <div
              onClick={() => setIsUpgradeModalOpen(true)}
              className="bg-[#8CA5FF] rounded-2xl p-5 text-white flex flex-col items-center justify-center min-h-[220px] cursor-pointer hover:bg-[#7892FF] transition-all shadow-sm hover:shadow-md"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="font-bold text-sm tracking-wide text-center">
                플랜 업그레이드 필요
              </span>
            </div>

          </div>
        </main>
      </div>

      {/* ================= 우측 펼침 버튼 (사이드바 닫혀있을 때만 표시) ================= */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          aria-label="알림 및 할일 패널 열기"
          title="우측 패널 열기"
          className="fixed right-0 top-1/2 -translate-y-1/2 w-10 h-24 bg-[#8CA5FF] text-white rounded-l-2xl flex items-center justify-center shadow-xl hover:bg-blue-600 transition-all z-40 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* ================= 우측 사이드바 패널 (통합 알림 센터 & 할 일) ================= */}
      <aside
        ref={sidebarRef}
        className={`relative w-80 sm:w-96 min-h-screen bg-[#DDE5FF] border-l border-blue-200 flex flex-col flex-shrink-0 z-30 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full hidden"
        }`}
      >
        {/* 접는 화살표 버튼 (사이드바 좌측 경계에 위치) */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          aria-label="알림 패널 접기"
          title="우측 패널 접기"
          className="absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-24 bg-[#8CA5FF] text-white rounded-l-2xl flex items-center justify-center shadow-xl hover:bg-blue-600 transition-all z-40 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* 사이드바 상단 프로필 헤더 */}
        <div className="p-6 pb-4 flex justify-end items-center border-b border-blue-200/60 bg-white/40">
          <div className="relative" ref={userMenuRef2}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 text-gray-800 text-sm font-medium hover:text-blue-600 focus:outline-none transition-colors cursor-pointer"
            >
              <span><strong className="text-blue-600 font-semibold">박성빈</strong>님 환영합니다</span>
              <div className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-500 bg-white shadow-sm hover:border-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </button>

            {/* 사용자 드롭다운 메뉴 (사이드바 내부) */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-800 shadow-2xl rounded-lg p-3 z-50 animate-fadeIn space-y-2 text-sm text-gray-900 font-semibold">
                <button
                  onClick={() => {
                    setIsUpgradeModalOpen(true);
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 hover:text-blue-600 py-1 transition-colors group"
                >
                  <svg className="w-4 h-4 text-gray-800 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l3.057 6.114L12 4l3.943 5.114L19 3v15H5V3z" />
                  </svg>
                  <span className="underline underline-offset-4">플랜 업그레이드</span>
                </button>

                <button
                  onClick={() => {
                    alert("사용자 프로필 페이지로 이동합니다.");
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 hover:text-blue-600 py-1 transition-colors group"
                >
                  <svg className="w-4 h-4 text-gray-800 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="underline underline-offset-4">사용자 프로필</span>
                </button>

                <button
                  onClick={() => {
                    alert("계정 변경 페이지로 이동합니다.");
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 hover:text-blue-600 py-1 transition-colors group"
                >
                  <svg className="w-4 h-4 text-gray-800 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="underline underline-offset-4">계정 변경</span>
                </button>

                <button
                  onClick={() => {
                    alert("로그아웃 되었습니다.");
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2.5 hover:text-red-600 py-1 transition-colors group"
                >
                  <svg className="w-4 h-4 text-gray-800 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="underline underline-offset-4">로그아웃</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 사이드바 메인 패널 내용 */}
        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          
          {/* 섹션 1: 통합 알림 센터 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>통합 알림 센터</span>
              </div>
              <button
                onClick={() => setIsNotiFolded(!isNotiFolded)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium bg-white/60 px-2 py-1 rounded border border-blue-200/80 transition-colors"
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${isNotiFolded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* 알림 카드 리스트 */}
            {!isNotiFolded && (
              <div className="space-y-3 pt-1 max-h-[250px] overflow-y-auto -mr-3 pr-1.5 scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500 bg-white/50 rounded-xl">
                    새로운 알림이 없습니다.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className="relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3 hover:shadow-md transition-shadow group"
                    >
                      {/* 카드 좌측 벨소리 아이콘 */}
                      <div className="text-gray-700 mt-0.5">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>

                      {/* 알림 내용 */}
                      <div className="flex-1 text-xs text-gray-800 pr-5 leading-relaxed">
                        <div>
                          <strong className="font-bold text-gray-900">[{item.project}]</strong> {item.text}
                        </div>
                        <div className="text-gray-500 font-medium mt-1">
                          ➔ {item.link}
                        </div>
                      </div>

                      {/* 삭제 X 버튼 */}
                      <button
                        onClick={() => removeNotification(item.id)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
                        title="알림 지우기"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 섹션 구분선 */}
          <hr className="border-t-2 border-[#A0B4FF] my-2" />

          {/* 섹션 2: 오늘 마감인 내 할 일 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span>오늘 마감인 내 할 일</span>
              </div>
              <button
                onClick={() => setIsTodoFolded(!isTodoFolded)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 font-medium bg-white/60 px-2 py-1 rounded border border-blue-200/80 transition-colors"
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${isTodoFolded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* 할 일 카드 리스트 */}
            {!isTodoFolded && (
              <div className="space-y-3 pt-1 max-h-[250px] overflow-y-auto -mr-3 pr-1.5 scrollbar-thin">
                {todos.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500 bg-white/50 rounded-xl">
                    오늘 마감인 할 일이 없습니다.
                  </div>
                ) : (
                  todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3 hover:shadow-md transition-shadow group"
                    >
                      {/* 네모 박스 체크박스 */}
                      <button
                        onClick={() => toggleTodo(todo.id)}
                        className="mt-0.5 text-gray-700 hover:text-blue-600 focus:outline-none transition-colors"
                      >
                        {todo.completed ? (
                          <div className="w-5 h-5 rounded border-2 border-gray-700 bg-white flex items-center justify-center text-gray-800">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-gray-400 hover:border-gray-600 bg-white" />
                        )}
                      </button>

                      {/* 할 일 내용 */}
                      <div className="flex-1 text-xs text-gray-800 pr-5 leading-relaxed">
                        <div className={todo.completed ? "line-through text-gray-400" : ""}>
                          <strong className="font-bold text-gray-900">[{todo.project}]</strong> {todo.text}
                        </div>
                        <div className="text-gray-500 font-medium mt-1">
                          ➔ 마감 : {todo.deadline}
                        </div>
                      </div>

                      {/* 삭제 X 버튼 */}
                      <button
                        onClick={() => removeTodo(todo.id)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
                        title="할 일 지우기"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      </aside>

      {/* 프로젝트 생성 모달 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4">새 프로젝트 생성</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">프로젝트명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 프로젝트 NODE"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">팀장 이름</label>
                  <input
                    type="text"
                    required
                    value={newLeader}
                    onChange={(e) => setNewLeader(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">팀원 수</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newMembers}
                    onChange={(e) => setNewMembers(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">마감일</label>
                <input
                  type="date"
                  required
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8CA5FF] hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-md"
                >
                  생성하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 플랜 업그레이드 안내 모달 */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl border border-gray-100">
            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">플랜 업그레이드 필요</h3>
            <p className="text-sm text-gray-600 mb-6">
              기본 플랜에서는 최대 8개의 프로젝트까지 생성이 가능합니다. 더 많은 프로젝트를 개설하려면 프리미엄 플랜으로 업그레이드하세요!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  alert("프리미엄 결제 페이지로 이동합니다.");
                  setIsUpgradeModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-[#8CA5FF] hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-md"
              >
                업그레이드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}