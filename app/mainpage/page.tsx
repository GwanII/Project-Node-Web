"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { Search, Plus, Lock, Trash2, Crown, User, Settings, LogOut, ArrowRight, X } from "lucide-react";

interface Project {
  id: string;
  title: string;
  leader: string;
  members: number;
  deadline: string;
  dDay: string;
  daysLeft: number | null;
  createdAt: string;
  endDateRaw: string | null;
}

interface NotificationItem {
  id: string;
  project: string;
  text: string;
  link: string;
}

interface TodoItem {
  id: string;
  project: string;
  text: string;
  deadline: string;
  completed: boolean;
}

function diffDaysFromToday(endDate: string | null): number | null {
  if (!endDate) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(endDate);
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - todayUtc) / 86400000);
}

function formatDday(endDate: string | null): string {
  const diff = diffDaysFromToday(endDate);
  if (diff === null) return "기한 없음";
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return `D+${Math.abs(diff)}`;
}

function formatDeadlineLabel(endDate: string | null): string {
  if (!endDate) return "미정";
  return endDate.replaceAll("-", ".");
}

// D-Day 태그 색: 7일 이내 빨강, 30일 이내 노랑, 그 외 블루, 기한 없음 회색
function dDayTagClass(daysLeft: number | null): string {
  if (daysLeft === null) return "bg-[#EEF0F7] text-[#6B7090]";
  if (daysLeft <= 7) return "bg-[#FDEBEC] text-[#C4332B]";
  if (daysLeft <= 30) return "bg-[#FBF3DB] text-[#956400]";
  return "bg-[#E6EBFF] text-[#3D5BD9]";
}

const PROJECT_TINTS = ["#DDE5FF", "#F3EAD3", "#DCEFE0", "#F6DFDD", "#D6EEF2"];

export default function MainPage() {
  const router = useRouter();

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("로그아웃 오류:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
      return;
    }
    router.push("/login");
  }

  const [projects, setProjects] = useState<Project[]>([]);
  const [profileName, setProfileName] = useState("사용자");

  const maxProjectsLimit = 8;

  const [sortBy, setSortBy] = useState<"deadline" | "latest">("deadline");
  const [searchQuery, setSearchQuery] = useState("");

  // 사용자 프로필 메뉴
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.name) setProfileName(profile.name);

      const { data: projectRows } = await supabase
        .from("projectdata")
        .select("id, project_name, user_name, start_date, end_date, created_at")
        .eq("user_id", user.id);
      if (projectRows) {
        setProjects(
          projectRows.map((row) => ({
            id: row.id,
            title: row.project_name,
            leader: row.user_name,
            members: 1,
            deadline: formatDeadlineLabel(row.end_date),
            dDay: formatDday(row.end_date),
            daysLeft: diffDaysFromToday(row.end_date),
            createdAt: row.created_at,
            endDateRaw: row.end_date,
          }))
        );
      }

      const { data: notificationRows } = await supabase
        .from("notifications")
        .select("id, message, link, projectdata(project_name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (notificationRows) {
        setNotifications(
          notificationRows.map((row) => ({
            id: row.id,
            project: (row.projectdata as unknown as { project_name: string } | null)?.project_name ?? "알림",
            text: row.message,
            link: row.link ?? "",
          }))
        );
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      const { data: todoRows } = await supabase
        .from("todos")
        .select("id, text, completed, due_at, projectdata(project_name)")
        .eq("user_id", user.id)
        .gte("due_at", startOfDay)
        .lt("due_at", endOfDay)
        .order("due_at", { ascending: true });
      if (todoRows) {
        setTodos(
          todoRows.map((row) => ({
            id: row.id,
            project: (row.projectdata as unknown as { project_name: string } | null)?.project_name ?? "",
            text: row.text,
            deadline: `오늘 ${new Date(row.due_at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}`,
            completed: row.completed,
          }))
        );
      }
    };

    loadData();
  }, [router]);

  const filteredProjects = useMemo(() => {
    const result = projects.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.leader.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortBy === "deadline") {
      result.sort((a, b) => {
        if (!a.endDateRaw) return 1;
        if (!b.endDateRaw) return -1;
        return a.endDateRaw < b.endDateRaw ? -1 : 1;
      });
    } else {
      result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    return result;
  }, [projects, searchQuery, sortBy]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("프로젝트를 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("projectdata").delete().eq("id", id);
    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const removeNotification = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const removeTodo = async (id: string) => {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) return;
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTodo = async (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    const { error } = await supabase
      .from("todos")
      .update({ completed: !target.completed })
      .eq("id", id);
    if (error) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const remainingSlots = Math.max(maxProjectsLimit - projects.length, 0);
  const completedTodoCount = todos.filter((t) => t.completed).length;
  const tableCols = "grid-cols-[minmax(0,2.4fr)_1fr_0.7fr_1.1fr_0.9fr_32px]";

  return (
    <div className="min-h-screen bg-[#F4F6FC] text-[#1F2340] antialiased flex flex-col">
      {/* 상단 바 (대시보드와 공통) */}
      <header className="h-[68px] shrink-0 flex items-center gap-6 px-6 md:px-10">
        <button onClick={() => window.location.reload()} className="shrink-0 hover:opacity-80 transition-opacity">
          <img src="/logo/cobalt-hub-logo.svg" alt="CobaltHUB" className="h-[26px] w-auto" />
        </button>

        <label className="flex-1 max-w-[440px] mx-auto flex items-center gap-2 bg-white rounded-full px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(31,35,64,0.06)] focus-within:ring-2 focus-within:ring-[#8CA5FF]">
          <Search className="w-[15px] h-[15px] text-[#8A8FAD] shrink-0" />
          <input
            type="text"
            placeholder="프로젝트, 팀장 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none placeholder-[#8A8FAD] text-[#1F2340]"
          />
        </label>

        <div className="flex items-center gap-2.5 text-sm shrink-0">
          <span className="hidden md:inline text-[#6B7090]">기본 플랜</span>
          <button onClick={() => setIsUpgradeModalOpen(true)} className="hidden md:inline font-semibold text-[#3D5BD9] hover:underline">
            업그레이드
          </button>
          <div className="relative ml-1.5" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              title={`${profileName}님`}
              className="w-[34px] h-[34px] rounded-full bg-[#8CA5FF] text-white text-[13px] font-bold flex items-center justify-center hover:ring-4 hover:ring-[#DDE5FF] transition"
            >
              {profileName.charAt(0)}
            </button>
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl p-2 z-50 shadow-[0_4px_12px_rgba(31,35,64,0.08),0_16px_40px_rgba(31,35,64,0.14)] text-sm">
                <div className="px-3 py-2 text-[13px] text-[#6B7090]">
                  <strong className="font-semibold text-[#1F2340]">{profileName}</strong>님 환영합니다
                </div>
                {[
                  { label: "플랜 업그레이드", icon: Crown, onClick: () => setIsUpgradeModalOpen(true) },
                  { label: "사용자 프로필", icon: User, onClick: () => router.push("/profile") },
                  { label: "계정 변경", icon: Settings, onClick: () => alert("계정 변경 페이지로 이동합니다.") },
                ].map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    onClick={() => {
                      onClick();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F4F6FC] text-left"
                  >
                    <Icon className="w-4 h-4 text-[#6B7090]" />
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FDEBEC] text-[#C4332B] text-left"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 px-6 md:px-10 pt-4 pb-10">
        {/* 좌측: 인사 + 프로젝트 표 */}
        <main className="flex flex-col gap-5 min-w-0">
          <div className="flex flex-col gap-1.5 pt-2 px-1">
            <span className="text-sm text-[#6B7090]">{todayLabel}</span>
            <h1 className="text-[28px] md:text-[32px] font-bold tracking-[-0.025em] text-pretty">
              {profileName}님, 현재 <span className="text-[#3D5BD9]">{projects.length}개</span>의 프로젝트가 순항중입니다
            </h1>
          </div>

          <section className="bg-white rounded-[20px] px-6 py-[22px] shadow-[0_1px_2px_rgba(31,35,64,0.05)] flex flex-col">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-lg font-bold mr-2.5">내 프로젝트</span>
              <span className="text-[13px] font-semibold text-[#3D5BD9] bg-[#E6EBFF] px-2.5 py-0.5 rounded-full">
                {projects.length} / {maxProjectsLimit}
              </span>
              <div className="ml-auto flex bg-[#F4F6FC] rounded-full p-[3px]">
                {(
                  [
                    ["deadline", "마감일순"],
                    ["latest", "최신 순"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`text-[13px] px-3 py-[5px] rounded-full transition ${
                      sortBy === key
                        ? "bg-white font-semibold shadow-[0_1px_2px_rgba(31,35,64,0.08)]"
                        : "text-[#6B7090] hover:text-[#1F2340]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => router.push("/newprojectpage")}
                className="ml-2 flex items-center gap-1.5 text-sm font-semibold text-white bg-[#3D5BD9] hover:bg-[#2A44B8] px-4 py-2 rounded-full transition"
              >
                <Plus className="w-3.5 h-3.5" />
                프로젝트 생성
              </button>
            </div>

            <div className="mt-[18px] flex flex-col overflow-x-auto">
              <div className={`grid ${tableCols} gap-4 px-3 py-2.5 text-[13px] text-[#8A8FAD] bg-[#F7F8FD] rounded-xl min-w-[640px]`}>
                <span>프로젝트</span>
                <span>팀장</span>
                <span>팀원</span>
                <span>마감</span>
                <span>D-Day</span>
                <span />
              </div>

              {filteredProjects.length === 0 && (
                <div className="py-10 text-center text-sm text-[#8A8FAD]">
                  {searchQuery ? "검색 결과가 없습니다." : "아직 프로젝트가 없습니다. 첫 프로젝트를 만들어 보세요."}
                </div>
              )}

              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/Projectmainpage/${project.id}`)}
                  className={`group grid ${tableCols} gap-4 px-3 py-4 text-sm items-center border-b border-[#EEF0F7] cursor-pointer hover:bg-[#F7F8FD] rounded-xl transition min-w-[640px]`}
                >
                  <span className="flex items-center gap-3 font-semibold min-w-0">
                    <span
                      className="w-7 h-7 rounded-[9px] shrink-0"
                      style={{ background: PROJECT_TINTS[projects.indexOf(project) % PROJECT_TINTS.length] }}
                    />
                    <span className="truncate">{project.title}</span>
                  </span>
                  <span className="text-[#4A4F6E] truncate">{project.leader}</span>
                  <span className="text-[#4A4F6E]">{project.members}명</span>
                  <span className="text-[#4A4F6E]">{project.deadline}</span>
                  <span>
                    <span className={`text-xs font-bold px-2.5 py-[3px] rounded-full ${dDayTagClass(project.daysLeft)}`}>
                      {project.dDay}
                    </span>
                  </span>
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    title="프로젝트 삭제"
                    className="opacity-0 group-hover:opacity-100 text-[#8A8FAD] hover:text-[#C4332B] p-1 rounded-lg hover:bg-[#FDEBEC] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="flex items-center gap-2.5 px-3 py-4 text-sm text-[#8A8FAD] text-left"
              >
                <Lock className="w-[15px] h-[15px]" />
                {remainingSlots}자리 남음 · 더 만들려면
                <span className="text-[#3D5BD9] font-semibold hover:underline">플랜 업그레이드</span>
              </button>
            </div>
          </section>
        </main>

        {/* 우측 레일: 오늘 할 일 / 알림 / 플랜 */}
        <aside className="flex flex-col gap-4 min-h-0">
          <section className="bg-[#8CA5FF] text-white rounded-[20px] p-[22px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-bold">오늘 마감인 내 할 일</span>
              <span className="text-[13px] font-semibold bg-white/20 px-2.5 py-0.5 rounded-full">
                {completedTodoCount} / {todos.length}
              </span>
            </div>
            {todos.length === 0 ? (
              <div className="text-center py-6 text-[13px] font-medium bg-white/15 rounded-[14px]">
                오늘 마감인 할 일이 없습니다.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
                {todos.map((todo) => (
                  <div key={todo.id} className="group relative flex gap-3 px-3.5 py-3 rounded-[14px] bg-white/15">
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`w-[18px] h-[18px] mt-px rounded-full border-2 border-white shrink-0 flex items-center justify-center text-[10px] font-extrabold text-[#8CA5FF] ${
                        todo.completed ? "bg-white" : "bg-transparent hover:bg-white/30"
                      }`}
                      title="완료 토글"
                    >
                      {todo.completed && "✓"}
                    </button>
                    <div className="flex flex-col gap-[3px] min-w-0 pr-5">
                      <span className={`text-sm font-semibold ${todo.completed ? "line-through opacity-70" : ""}`}>
                        {todo.text}
                      </span>
                      <span className="text-xs font-medium">
                        {todo.project} · {todo.deadline}
                      </span>
                    </div>
                    <button
                      onClick={() => removeTodo(todo.id)}
                      title="할 일 지우기"
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-[20px] p-[22px] shadow-[0_1px_2px_rgba(31,35,64,0.05)] flex-1 min-h-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base font-bold">통합 알림 센터</span>
              <span className="text-[13px] text-[#8A8FAD]">{notifications.length}개</span>
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-[13px] text-[#8A8FAD]">새로운 알림이 없습니다.</div>
            ) : (
              <div className="flex flex-col max-h-[340px] overflow-y-auto">
                {notifications.map((item) => (
                  <div key={item.id} className="group relative flex gap-3 py-3 border-b border-[#EEF0F7] last:border-b-0">
                    <div className="w-[30px] h-[30px] rounded-full bg-[#E6EBFF] text-[#3D5BD9] text-xs font-bold flex items-center justify-center shrink-0">
                      {item.project.charAt(0)}
                    </div>
                    <div className="flex flex-col gap-[3px] text-[13px] leading-normal min-w-0 pr-5">
                      <span>{item.text}</span>
                      <span className="text-[#8A8FAD] flex items-center gap-2">
                        {item.project}
                        {item.link && (
                          <button
                            type="button"
                            onClick={() => router.push(item.link)}
                            className="inline-flex items-center gap-0.5 text-[#3D5BD9] font-semibold hover:underline"
                          >
                            바로가기 <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => removeNotification(item.id)}
                      title="알림 지우기"
                      className="absolute top-3 right-0 text-[#8A8FAD] hover:text-[#1F2340] opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-[#1F2340] text-white rounded-[20px] px-[22px] py-5 flex items-center gap-3.5">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-sm font-semibold">
                {projects.length} / {maxProjectsLimit} 프로젝트 사용 중
              </span>
              <span className="text-xs text-[#B8BCD6]">업그레이드하면 더 많이 만들 수 있어요</span>
            </div>
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="text-[13px] font-bold text-[#1F2340] bg-white hover:bg-[#DDE5FF] px-3 py-[7px] rounded-full transition"
            >
              업그레이드
            </button>
          </section>
        </aside>
      </div>

      {/* 플랜 업그레이드 안내 모달 */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 bg-[#1F2340]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] p-7 w-full max-w-sm text-center shadow-2xl">
            <div className="w-14 h-14 bg-[#E6EBFF] text-[#3D5BD9] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold mb-2">플랜 업그레이드 필요</h3>
            <p className="text-sm text-[#6B7090] mb-6 leading-relaxed">
              기본 플랜에서는 최대 8개의 프로젝트까지 생성이 가능합니다. 더 많은 프로젝트를 개설하려면 프리미엄 플랜으로 업그레이드하세요!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="flex-1 py-2.5 bg-[#F4F6FC] hover:bg-[#E6EBFF] text-[#4A4F6E] text-sm font-semibold rounded-full transition"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  alert("프리미엄 결제 페이지로 이동합니다.");
                  setIsUpgradeModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-[#3D5BD9] hover:bg-[#2A44B8] text-white text-sm font-semibold rounded-full transition"
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
