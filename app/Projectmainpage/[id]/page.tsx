"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import {
  Users,
  Settings,
  Plus,
  Search,
  FileText,
  Calendar as CalendarIcon,
  Folder,
  Clock,
  Vote as VoteIcon,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  User,
  Crown,
  Link as LinkIcon,
  Mic,
  FileImage,
  Presentation,
  CheckCircle2,
  Circle,
  X,
  UserPlus,
  Info,
  ArrowLeft,
  Trash2,
  GripVertical,
  UploadCloud,
  Dices,
  Shuffle,
  Rows3,
  House,
  LogOut,
} from "lucide-react";

// Types
type MemberPermission = "read" | "write" | "admin";

interface TeamMember {
  id: string;
  userId: string | null;
  name: string;
  role: "팀장" | "팀원";
  progress: number;
  isLeader?: boolean;
  permission: MemberPermission;
}

interface SidebarItem {
  id: string;
  name: string;
  type: "file" | "calendar" | "resource";
  subType?: "png" | "jpg" | "url" | "audio" | "ppt" | "file";
  storagePath?: string;
  createdAt?: string;
}

interface VoteOption {
  id: string;
  text: string;
  imageUrl?: string;
}

interface DraftVoteOption {
  id: string;
  text: string;
  imageUrl?: string;
  imageFile?: File;
}

interface VoteItem {
  id: string;
  title: string;
  participantsCount: number;
  hasVoted: boolean;
  deadline: string;
  status: "in-progress" | "completed";
  options: VoteOption[];
}

interface TodoItem {
  id: string;
  text: string;
  dDay: string;
  dueAtRaw: string;
  completed: boolean;
}

function formatDDaySpaced(dueAt: string): string {
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(dueAt);
  const dueUtc = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueUtc - todayUtc) / 86400000);
  if (diffDays > 0) return `D - Day ${diffDays}`;
  if (diffDays === 0) return "D - Day";
  return `D + ${Math.abs(diffDays)}`;
}

function formatDday(endDate: string | null): string {
  if (!endDate) return "기한 없음";
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(endDate);
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const diffDays = Math.round((endUtc - todayUtc) / 86400000);
  if (diffDays > 0) return `D - Day ${diffDays}`;
  if (diffDays === 0) return "D - Day";
  return `D + ${Math.abs(diffDays)}`;
}

function formatVoteDeadline(deadline: string | null): { label: string; isPast: boolean } {
  if (!deadline) return { label: "마감일 미정", isPast: false };
  const d = new Date(deadline);
  const isPast = d.getTime() < Date.now();
  const label = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate()
  ).padStart(2, "0")} ${isPast ? "종료" : "마감"}`;
  return { label, isPast };
}

export default function ProjectMainPage() {
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
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Search queries for sidebar sections
  const [fileSearch, setFileSearch] = useState("");
  const [calendarSearch, setCalendarSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");

  // Data States
  const [files, setFiles] = useState<SidebarItem[]>([]);
  const [calendars, setCalendars] = useState<SidebarItem[]>([]);
  const [resources, setResources] = useState<SidebarItem[]>([]);

  // Team Members
  const [members, setMembers] = useState<TeamMember[]>([]);

  // 팀원 설정(권한/삭제) 모달 상태
  const [isMemberSettingsModalOpen, setIsMemberSettingsModalOpen] = useState(false);

  const permissionLabels: Record<MemberPermission, string> = {
    read: "읽기만 허용",
    write: "읽기 쓰기 허용",
    admin: "관리자 위임",
  };

  const handleChangePermission = async (id: string, permission: MemberPermission) => {
    const { error } = await supabase
      .from("project_members")
      .update({ permission })
      .eq("id", id);
    if (error) return;
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, permission } : m))
    );
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (!confirm(`${name} 님을 팀에서 삭제하시겠습니까?`)) return;
    const { error } = await supabase.from("project_members").delete().eq("id", id);
    if (error) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Votes
  const [votes, setVotes] = useState<VoteItem[]>([]);

  // Todo Items
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // 프로젝트 정보 / 현재 사용자
  const [projectTitle, setProjectTitle] = useState("프로젝트");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDDay, setProjectDDay] = useState("D - Day");
  const [projectDeadlineLabel, setProjectDeadlineLabel] = useState("마감일 미정");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeAccount, setActiveAccount] = useState("사용자");

  // 프로젝트 실 데이터 불러오기
  useEffect(() => {
    if (!projectId) return;

    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: project } = await supabase
        .from("projectdata")
        .select("project_name, description, end_date")
        .eq("id", projectId)
        .maybeSingle();

      if (!project) {
        setNotFound(true);
        return;
      }

      setProjectTitle(project.project_name);
      setProjectDescription(project.description ?? "");
      setProjectDDay(formatDday(project.end_date));
      setProjectDeadlineLabel(
        project.end_date ? `마감 : ${project.end_date.replaceAll("-", "/")}` : "마감일 미정"
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.name) setActiveAccount(profile.name);

      const { data: memberRows } = await supabase
        .from("project_members")
        .select("id, user_id, name, role, permission, progress")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (memberRows) {
        setMembers(
          memberRows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            role: row.role as "팀장" | "팀원",
            permission: row.permission as MemberPermission,
            progress: row.progress,
            isLeader: row.role === "팀장",
          }))
        );
      }

      const { data: todoRows } = await supabase
        .from("todos")
        .select("id, text, completed, due_at")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("due_at", { ascending: true });
      if (todoRows) {
        setTodos(
          todoRows.map((row) => ({
            id: row.id,
            text: row.text,
            dDay: formatDDaySpaced(row.due_at),
            dueAtRaw: row.due_at,
            completed: row.completed,
          }))
        );
      }

      const { data: voteRows } = await supabase
        .from("votes")
        .select(
          "id, title, deadline, vote_options(id, text, image_url), vote_responses(id, user_id)"
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (voteRows) {
        setVotes(
          voteRows.map((row) => {
            const responses = (row.vote_responses ?? []) as unknown as {
              id: string;
              user_id: string;
            }[];
            const options = (row.vote_options ?? []) as unknown as {
              id: string;
              text: string;
              image_url: string | null;
            }[];
            const { label, isPast } = formatVoteDeadline(row.deadline);
            return {
              id: row.id,
              title: row.title,
              participantsCount: responses.length,
              hasVoted: responses.some((r) => r.user_id === user.id),
              deadline: label,
              status: isPast ? "completed" : "in-progress",
              options: options.map((o) => ({
                id: o.id,
                text: o.text,
                imageUrl: o.image_url ?? undefined,
              })),
            };
          })
        );
      }

      const { data: sidebarRows } = await supabase
        .from("project_sidebar_items")
        .select("id, type, name, sub_type, storage_path, created_at")
        .eq("project_id", projectId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (sidebarRows) {
        const toItem = (row: (typeof sidebarRows)[number]): SidebarItem => ({
          id: row.id,
          name: row.name,
          type: row.type as SidebarItem["type"],
          subType: (row.sub_type ?? undefined) as SidebarItem["subType"],
          storagePath: row.storage_path ?? undefined,
          createdAt: row.created_at ?? undefined,
        });
        setFiles(sidebarRows.filter((r) => r.type === "file").map(toItem));
        setCalendars(sidebarRows.filter((r) => r.type === "calendar").map(toItem));
        setResources(sidebarRows.filter((r) => r.type === "resource").map(toItem));
      }
    };

    loadData();
  }, [projectId, router]);

  // Modal States
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isNewVoteModalOpen, setIsNewVoteModalOpen] = useState(false);
  const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // 미니게임: 제비뽑기 상태
  const [isDrawLotsModalOpen, setIsDrawLotsModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHighlightId, setDrawHighlightId] = useState<string | null>(null);
  const [drawWinnerIds, setDrawWinnerIds] = useState<string[]>([]);
  const [drawCount, setDrawCount] = useState(1);
  const drawIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const openDrawLotsModal = () => {
    setDrawWinnerIds([]);
    setDrawHighlightId(null);
    setDrawCount((prev) => Math.min(Math.max(prev, 1), Math.max(members.length, 1)));
    setIsDrawLotsModalOpen(true);
  };

  const closeDrawLotsModal = () => {
    if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
    setIsDrawLotsModalOpen(false);
    setIsDrawing(false);
    setDrawHighlightId(null);
    setDrawWinnerIds([]);
  };

  const handleStartDraw = () => {
    if (members.length < 2 || isDrawing) return;
    const count = Math.min(Math.max(drawCount, 1), members.length);
    setDrawWinnerIds([]);
    setIsDrawing(true);

    let ticks = 0;
    const totalTicks = 16;
    drawIntervalRef.current = setInterval(() => {
      const randomMember = members[Math.floor(Math.random() * members.length)];
      setDrawHighlightId(randomMember.id);
      ticks += 1;
      if (ticks >= totalTicks) {
        if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
        const winners = [...members]
          .sort(() => Math.random() - 0.5)
          .slice(0, count)
          .map((m) => m.id);
        setDrawHighlightId(null);
        setDrawWinnerIds(winners);
        setIsDrawing(false);
      }
    }, 90);
  };

  // 미니게임: 사다리타기 상태
  const LADDER_ROW_COUNT = 10;
  const [isLadderModalOpen, setIsLadderModalOpen] = useState(false);
  const [ladderOutcomes, setLadderOutcomes] = useState<string[]>(
    members.map((_, i) => `결과 ${i + 1}`)
  );
  const [ladderRungs, setLadderRungs] = useState<boolean[][]>([]);
  const [showLadderResult, setShowLadderResult] = useState(false);

  const generateLadderRungs = (participantCount: number): boolean[][] => {
    const rows: boolean[][] = [];
    for (let r = 0; r < LADDER_ROW_COUNT; r++) {
      const row = new Array(Math.max(participantCount - 1, 0)).fill(false);
      for (let i = 0; i < row.length; i++) {
        if (i > 0 && row[i - 1]) continue;
        if (Math.random() < 0.35) row[i] = true;
      }
      rows.push(row);
    }
    return rows;
  };

  const openLadderModal = () => {
    setLadderOutcomes((prev) =>
      members.map((_, i) => prev[i] ?? `결과 ${i + 1}`)
    );
    setLadderRungs(generateLadderRungs(members.length));
    setShowLadderResult(false);
    setIsLadderModalOpen(true);
  };

  const closeLadderModal = () => setIsLadderModalOpen(false);

  const handleRegenerateLadder = () => {
    setLadderRungs(generateLadderRungs(members.length));
    setShowLadderResult(false);
  };

  const updateLadderOutcome = (index: number, value: string) => {
    setLadderOutcomes((prev) =>
      prev.map((outcome, i) => (i === index ? value : outcome))
    );
  };

  const ladderResultMap = useMemo(() => {
    const results: number[] = [];
    for (let start = 0; start < members.length; start++) {
      let pos = start;
      for (const row of ladderRungs) {
        if (pos > 0 && row[pos - 1]) {
          pos -= 1;
        } else if (pos < members.length - 1 && row[pos]) {
          pos += 1;
        }
      }
      results.push(pos);
    }
    return results;
  }, [ladderRungs, members.length]);

  // 사용자 프로필 메뉴 및 계정 변경 관련 상태 (mainpage와 동일)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isAccountSwitchModalOpen, setIsAccountSwitchModalOpen] = useState(false);
  const savedAccounts = ["박성빈", "김재호", "박기완"];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
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

  // New Vote Form State
  const [newVoteTitle, setNewVoteTitle] = useState("");
  const [newVoteDeadline, setNewVoteDeadline] = useState("");
  const [newVoteOptions, setNewVoteOptions] = useState<DraftVoteOption[]>([
    { id: "1", text: "" },
    { id: "2", text: "" },
  ]);
  const [draggingOptionId, setDraggingOptionId] = useState<string | null>(null);
  const voteOptionFileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const addVoteOption = () => {
    setNewVoteOptions((prev) => [...prev, { id: String(Date.now()), text: "" }]);
  };

  const removeVoteOption = (id: string) => {
    setNewVoteOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateVoteOptionText = (id: string, text: string) => {
    setNewVoteOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, text } : o))
    );
  };

  const setVoteOptionImage = (id: string, file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewVoteOptions((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, imageUrl: reader.result as string, imageFile: file } : o
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const resetNewVoteForm = () => {
    setNewVoteTitle("");
    setNewVoteDeadline("");
    setNewVoteOptions([
      { id: "1", text: "" },
      { id: "2", text: "" },
    ]);
    setDraggingOptionId(null);
  };

  const closeNewVoteModal = () => {
    setIsNewVoteModalOpen(false);
    resetNewVoteForm();
  };

  // New Todo Form State
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState("");

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Filtered lists for sidebar
  const filteredFiles = useMemo(() => {
    return files.filter((f) => f.name.toLowerCase().includes(fileSearch.toLowerCase()));
  }, [files, fileSearch]);

  const filteredCalendars = useMemo(() => {
    return calendars.filter((c) => c.name.toLowerCase().includes(calendarSearch.toLowerCase()));
  }, [calendars, calendarSearch]);

  const filteredResources = useMemo(() => {
    return resources.filter((r) => r.name.toLowerCase().includes(resourceSearch.toLowerCase()));
  }, [resources, resourceSearch]);

  // 대시보드 "자료 보관함" 카드에 띄울 가장 최근에 사용한 자료 8개
  const recentResources = useMemo(() => {
    return [...resources].slice(-8).reverse();
  }, [resources]);

  // 대시보드 "최신 작업" 카드에 띄울 가장 최근에 추가된 파일/캘린더 8개
  const recentTasks = useMemo(() => {
    return [...files, ...calendars]
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      })
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        icon: item.type === "calendar" ? "calendar" : "file",
      }));
  }, [files, calendars]);

  // Handlers
  const toggleTodo = async (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    const { error } = await supabase
      .from("todos")
      .update({ completed: !target.completed })
      .eq("id", id);
    if (error) return;
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleCreateVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoteTitle.trim() || !currentUserId) return;

    const validOptions = newVoteOptions.filter((o) => o.text.trim().length > 0);
    if (validOptions.length === 0) return;

    const deadlineIso = newVoteDeadline ? new Date(newVoteDeadline).toISOString() : null;

    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .insert({
        project_id: projectId,
        title: newVoteTitle,
        deadline: deadlineIso,
        created_by: currentUserId,
      })
      .select("id")
      .single();

    if (voteError || !vote) {
      alert("투표 생성 실패: " + (voteError?.message ?? "알 수 없는 오류"));
      return;
    }

    const optionsWithImage = await Promise.all(
      validOptions.map(async (option, index) => {
        let imageUrl: string | null = null;
        if (option.imageFile) {
          const path = `vote-options/${vote.id}_${index}_${Date.now()}.${option.imageFile.name
            .split(".")
            .pop()}`;
          const { error: uploadError } = await supabase.storage
            .from("cobalt-files")
            .upload(path, option.imageFile);
          if (!uploadError) {
            imageUrl = supabase.storage.from("cobalt-files").getPublicUrl(path).data.publicUrl;
          }
        }
        return { text: option.text.trim(), imageUrl, position: index };
      })
    );

    const { error: optionsError } = await supabase.from("vote_options").insert(
      optionsWithImage.map((o) => ({
        vote_id: vote.id,
        text: o.text,
        image_url: o.imageUrl,
        position: o.position,
      }))
    );

    if (optionsError) {
      alert("투표 항목 생성 실패: " + optionsError.message);
      return;
    }

    const { label, isPast } = formatVoteDeadline(deadlineIso);
    setVotes((prev) => [
      {
        id: vote.id,
        title: newVoteTitle,
        participantsCount: 0,
        hasVoted: false,
        deadline: label,
        status: isPast ? "completed" : "in-progress",
        options: optionsWithImage.map((o, index) => ({
          id: String(index),
          text: o.text,
          imageUrl: o.imageUrl ?? undefined,
        })),
      },
      ...prev,
    ]);
    setIsNewVoteModalOpen(false);
    resetNewVoteForm();
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim() || !newTodoDueDate || !currentUserId) return;

    const dueAtIso = new Date(newTodoDueDate).toISOString();

    const { data: todo, error } = await supabase
      .from("todos")
      .insert({
        project_id: projectId,
        user_id: currentUserId,
        text: newTodoText,
        due_at: dueAtIso,
      })
      .select("id")
      .single();

    if (error || !todo) {
      alert("할 일 추가 실패: " + (error?.message ?? "알 수 없는 오류"));
      return;
    }

    setTodos((prev) => [
      ...prev,
      {
        id: todo.id,
        text: newTodoText,
        dDay: formatDDaySpaced(dueAtIso),
        dueAtRaw: dueAtIso,
        completed: false,
      },
    ]);
    setNewTodoText("");
    setNewTodoDueDate("");
    setIsAddTodoModalOpen(false);
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !projectId) return;

    setIsInviting(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, email: inviteEmail.trim() }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert(json?.error ?? "초대에 실패했습니다.");
        return;
      }

      alert(
        json.registered
          ? `${inviteEmail} 님에게 초대 알림을 보냈습니다. 수락하면 팀원으로 추가됩니다.`
          : `${inviteEmail} 님에게 초대 메일을 보냈습니다. 가입 후 수락하면 팀원으로 추가됩니다.`
      );
      setInviteEmail("");
      setIsInviteModalOpen(false);
    } finally {
      setIsInviting(false);
    }
  };

  // 사이드바 항목 추가 팝업 상태 (파일/달력은 이름 입력, 자료는 파일 드래그 업로드)
  const [addItemModal, setAddItemModal] = useState<
    "files" | "calendars" | "resources" | null
  >(null);
  const [newItemName, setNewItemName] = useState("");

  const addItemModalConfig: Record<
    "files" | "calendars",
    { title: string; label: string; placeholder: string }
  > = {
    files: { title: "새 파일 추가", label: "파일명", placeholder: "예: 6주차 회의록" },
    calendars: { title: "새 캘린더 추가", label: "캘린더 이름", placeholder: "예: 팀 캘린더" },
  };

  const closeAddItemModal = () => {
    setAddItemModal(null);
    setNewItemName("");
    setIsDraggingFile(false);
    if (resourceFileInputRef.current) resourceFileInputRef.current.value = "";
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemModal || addItemModal === "resources" || !newItemName.trim() || !projectId)
      return;

    const list = addItemModal === "files" ? files : calendars;
    const { data: row, error } = await supabase
      .from("project_sidebar_items")
      .insert({
        project_id: projectId,
        type: addItemModal === "files" ? "file" : "calendar",
        name: newItemName,
        position: list.length,
      })
      .select("id")
      .single();

    if (error || !row) {
      alert("추가 실패: " + (error?.message ?? "알 수 없는 오류"));
      return;
    }

    const newItem: SidebarItem = {
      id: row.id,
      name: newItemName,
      type: addItemModal === "files" ? "file" : "calendar",
    };
    if (addItemModal === "files") {
      setFiles((prev) => [...prev, newItem]);
    } else {
      setCalendars((prev) => [...prev, newItem]);
    }
    closeAddItemModal();
  };

  // 자료 보관함: 파일을 드래그하여 놓으면 확장자를 보고 자동으로 태그를 붙여 등록
  const resourceFileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const inferResourceSubType = (
    fileName: string
  ): NonNullable<SidebarItem["subType"]> => {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "png") return "png";
    if (["jpg", "jpeg"].includes(ext)) return "jpg";
    if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
    if (["ppt", "pptx"].includes(ext)) return "ppt";
    return "file";
  };

  const handleResourceFilesAdded = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !projectId) return;

    const basePosition = resources.length;
    const newItems: SidebarItem[] = [];

    for (const [index, file] of Array.from(fileList).entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `project-resources/${projectId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("cobalt-files")
        .upload(storagePath, file);
      if (uploadError) {
        alert(`"${file.name}" 업로드 실패: ${uploadError.message}`);
        continue;
      }

      const subType = inferResourceSubType(file.name);
      const { data: row, error } = await supabase
        .from("project_sidebar_items")
        .insert({
          project_id: projectId,
          type: "resource",
          name: file.name,
          sub_type: subType,
          storage_path: storagePath,
          position: basePosition + index,
        })
        .select("id")
        .single();

      if (error || !row) {
        alert(`"${file.name}" 등록 실패: ${error?.message ?? "알 수 없는 오류"}`);
        continue;
      }

      newItems.push({
        id: row.id,
        name: file.name,
        type: "resource",
        subType,
        storagePath,
      });
    }

    if (newItems.length > 0) {
      setResources((prev) => [...prev, ...newItems]);
    }
    closeAddItemModal();
  };

  // 드래그 앤 드롭으로 사이드바 항목 순서 변경
  const [draggedItem, setDraggedItem] = useState<{
    section: "files" | "calendars" | "resources";
    id: string;
  } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // 검색으로 필터링된 상태에서도 정확히 동작하도록 id 기준으로 원본 배열 순서를 변경
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

  const persistSidebarOrder = async (list: SidebarItem[]) => {
    await Promise.all(
      list.map((item, index) =>
        supabase.from("project_sidebar_items").update({ position: index }).eq("id", item.id)
      )
    );
  };

  const handleDragStart = (
    section: "files" | "calendars" | "resources",
    id: string
  ) => {
    setDraggedItem({ section, id });
  };

  const handleDragOverItem = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (
    section: "files" | "calendars" | "resources",
    targetId: string
  ) => {
    if (draggedItem && draggedItem.section === section) {
      if (section === "files") {
        setFiles((prev) => {
          const reordered = reorderById(prev, draggedItem.id, targetId);
          persistSidebarOrder(reordered);
          return reordered;
        });
      } else if (section === "calendars") {
        setCalendars((prev) => {
          const reordered = reorderById(prev, draggedItem.id, targetId);
          persistSidebarOrder(reordered);
          return reordered;
        });
      } else {
        setResources((prev) => {
          const reordered = reorderById(prev, draggedItem.id, targetId);
          persistSidebarOrder(reordered);
          return reordered;
        });
      }
    }
    setDraggedItem(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverId(null);
  };

  // 사이드바 항목 우클릭 → 삭제 컨텍스트 메뉴
  const [contextMenu, setContextMenu] = useState<{
    section: "files" | "calendars" | "resources";
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const handleItemContextMenu = (
    e: React.MouseEvent,
    section: "files" | "calendars" | "resources",
    id: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ section, id, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  // 삭제 확인 팝업 상태
  const [deleteConfirm, setDeleteConfirm] = useState<{
    section: "files" | "calendars" | "resources";
    id: string;
    name: string;
  } | null>(null);

  const handleRequestDeleteItem = () => {
    if (!contextMenu) return;
    const { section, id } = contextMenu;
    const list =
      section === "files" ? files : section === "calendars" ? calendars : resources;
    const target = list.find((item) => item.id === id);
    if (target) {
      setDeleteConfirm({ section, id, name: target.name });
    }
    closeContextMenu();
  };

  const closeDeleteConfirm = () => setDeleteConfirm(null);

  const handleConfirmDeleteItem = async () => {
    if (!deleteConfirm) return;
    const { section, id } = deleteConfirm;

    if (section === "resources") {
      const target = resources.find((r) => r.id === id);
      if (target?.storagePath) {
        await supabase.storage.from("cobalt-files").remove([target.storagePath]);
      }
    }

    const { error } = await supabase.from("project_sidebar_items").delete().eq("id", id);
    if (error) {
      closeDeleteConfirm();
      return;
    }

    if (section === "files") {
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } else if (section === "calendars") {
      setCalendars((prev) => prev.filter((c) => c.id !== id));
    } else {
      setResources((prev) => prev.filter((r) => r.id !== id));
    }
    closeDeleteConfirm();
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleOutside = () => closeContextMenu();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeContextMenu();
    };
    document.addEventListener("click", handleOutside);
    document.addEventListener("contextmenu", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleOutside);
      document.removeEventListener("contextmenu", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu]);

  // 2x2 대시보드 카드 순서 및 드래그로 위치 맞바꾸기
  type DashboardCardKey = "team" | "recent" | "vote" | "todo" | "resources" | "minigame";
  // 벤토 슬롯 순서. 슬롯 크기는 위치에 고정(BENTO_SLOT_SPANS), 카드끼리 드래그로 자리 맞바꾸기
  const [cardOrder, setCardOrder] = useState<DashboardCardKey[]>([
    "team",
    "todo",
    "vote",
    "minigame",
    "recent",
    "resources",
  ]);
  const [draggedCardKey, setDraggedCardKey] = useState<DashboardCardKey | null>(null);
  const [cardDragOverKey, setCardDragOverKey] = useState<DashboardCardKey | null>(null);

  const handleCardDragStart = (key: DashboardCardKey) => setDraggedCardKey(key);

  const handleCardDragOver = (e: React.DragEvent, key: DashboardCardKey) => {
    e.preventDefault();
    if (cardDragOverKey !== key) setCardDragOverKey(key);
  };

  const handleCardDrop = (targetKey: DashboardCardKey) => {
    setCardOrder((prev) => {
      if (!draggedCardKey || draggedCardKey === targetKey) return prev;
      const fromIndex = prev.indexOf(draggedCardKey);
      const toIndex = prev.indexOf(targetKey);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const updated = [...prev];
      [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
      return updated;
    });
    setDraggedCardKey(null);
    setCardDragOverKey(null);
  };

  const handleCardDragEnd = () => {
    setDraggedCardKey(null);
    setCardDragOverKey(null);
  };

  // ---------- 벤토 대시보드 UI 헬퍼 ----------
  const BENTO_SLOT_SPANS = ["lg:col-span-8", "lg:col-span-4", "lg:col-span-4", "lg:col-span-4", "lg:col-span-6", "lg:col-span-6"];
  const MEMBER_TINTS = ["#DDE5FF", "#F3EAD3", "#DCEFE0", "#F6DFDD", "#D6EEF2"];
  const compactDDay = (label: string) =>
    label.replace("D - Day ", "D-").replace("D - Day", "D-Day").replace("D + ", "D+");

  // 좌측 아이콘 레일 → 팝오버 패널
  type PanelKey = "files" | "calendars" | "resources";
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const panelConfig: Record<
    PanelKey,
    { name: string; icon: typeof FileText; items: SidebarItem[]; total: number; search: string; setSearch: (v: string) => void }
  > = {
    files: { name: "파일", icon: FileText, items: filteredFiles, total: files.length, search: fileSearch, setSearch: setFileSearch },
    calendars: { name: "달력", icon: CalendarIcon, items: filteredCalendars, total: calendars.length, search: calendarSearch, setSearch: setCalendarSearch },
    resources: { name: "자료 보관함", icon: Folder, items: filteredResources, total: resources.length, search: resourceSearch, setSearch: setResourceSearch },
  };
  const PANEL_ORDER: PanelKey[] = ["files", "calendars", "resources"];

  const renderItemIcon = (item: SidebarItem) => {
    if (item.type === "calendar") return <CalendarIcon className="w-4 h-4 text-[#6B7090] shrink-0" />;
    if (item.type === "file") return <FileText className="w-4 h-4 text-[#6B7090] shrink-0" />;
    switch (item.subType) {
      case "png":
      case "jpg":
        return <FileImage className="w-4 h-4 text-[#6B7090] shrink-0" />;
      case "url":
        return <LinkIcon className="w-4 h-4 text-[#6B7090] shrink-0" />;
      case "audio":
        return <Mic className="w-4 h-4 text-[#6B7090] shrink-0" />;
      case "ppt":
        return <Presentation className="w-4 h-4 text-[#6B7090] shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-[#6B7090] shrink-0" />;
    }
  };

  // 상단 바 통합 검색 (파일·달력·자료)
  const [globalSearch, setGlobalSearch] = useState("");
  const globalResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    return [...files, ...calendars, ...resources].filter((i) => i.name.toLowerCase().includes(q)).slice(0, 8);
  }, [globalSearch, files, calendars, resources]);

  const cardShell = "bg-white rounded-[20px] px-[26px] py-6 shadow-[0_1px_2px_rgba(31,35,64,0.05)]";
  const cardTitle = "text-[17px] font-bold";
  const iconBtn = "p-1.5 rounded-lg text-[#8A8FAD] hover:text-[#3D5BD9] hover:bg-[#F4F6FC] transition-colors";
  const tileClass =
    "flex flex-col items-center gap-2 px-1.5 py-3.5 rounded-[14px] bg-[#F7F8FD] hover:bg-[#E6EBFF] cursor-pointer transition-colors min-w-0";

  const renderDashboardCard = (key: DashboardCardKey) => {
    switch (key) {
      case "team":
        return (
          <>
            <div className="flex items-center justify-between mb-[18px]">
              <span className={cardTitle}>팀원 현황</span>
              <button onClick={() => setIsMemberSettingsModalOpen(true)} className={iconBtn} title="팀 설정">
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mt-auto">
              {members.map((member, i) => (
                <button
                  key={member.id}
                  onClick={() => router.push("/profile")}
                  title={`${member.name} 프로필 보기`}
                  className="flex flex-col gap-2.5 p-4 rounded-[14px] bg-[#F7F8FD] hover:bg-[#EEF1FB] text-left transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full text-[15px] font-bold flex items-center justify-center"
                    style={{ background: MEMBER_TINTS[i % MEMBER_TINTS.length] }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[15px] font-bold flex items-center gap-1 truncate">
                      {member.name}
                      {member.isLeader && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
                    </span>
                    <span className="text-xs text-[#8A8FAD]">{member.role}</span>
                  </div>
                  <span className="text-2xl font-bold tracking-[-0.02em] text-[#3D5BD9]">{member.progress}%</span>
                  <span className="h-1.5 rounded-full bg-[#E3E7F5] overflow-hidden">
                    <span className="block h-full bg-[#8CA5FF] rounded-full" style={{ width: `${member.progress}%` }} />
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case "todo":
        return (
          <>
            <div className="flex items-center justify-between mb-2.5">
              <span className={cardTitle}>TO DO LIST</span>
              <button onClick={() => setIsAddTodoModalOpen(true)} className={iconBtn} title="할 일 추가">
                <Plus className="w-[18px] h-[18px]" />
              </button>
            </div>
            {todos.length === 0 && <div className="py-6 text-center text-[13px] text-[#8A8FAD]">할 일이 없습니다.</div>}
            <div className="flex flex-col max-h-[260px] overflow-y-auto">
              {todos.map((todo) => (
                <button
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id)}
                  className="flex items-center gap-3 py-2.5 border-b border-[#EEF0F7] last:border-b-0 text-left"
                >
                  <span
                    className={`w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${todo.completed ? "border-[#8CA5FF] bg-[#8CA5FF]" : "border-[#C9CEE6] bg-white"}`}
                  >
                    {todo.completed && "✓"}
                  </span>
                  <span className={`text-sm font-semibold flex-1 min-w-0 truncate ${todo.completed ? "line-through text-[#A5A9C4]" : ""}`}>
                    {todo.text}
                  </span>
                  <span className="text-xs font-bold text-[#3D5BD9] bg-[#E6EBFF] px-2.5 py-[3px] rounded-full shrink-0">
                    {compactDDay(todo.dDay)}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case "vote":
        return (
          <>
            <div className="flex items-center justify-between mb-2.5">
              <span className={cardTitle}>투표</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsNewVoteModalOpen(true)}
                  className="text-xs font-bold text-white bg-[#3D5BD9] hover:bg-[#2A44B8] px-3 py-1 rounded-full transition-colors"
                >
                  NEW
                </button>
                <button onClick={() => router.push("/voterecord")} className={iconBtn} title="투표 기록으로 이동">
                  <House className="w-4 h-4" />
                </button>
              </div>
            </div>
            {votes.length === 0 && <div className="py-6 text-center text-[13px] text-[#8A8FAD]">진행 중인 투표가 없습니다.</div>}
            <div className="flex flex-col max-h-[260px] overflow-y-auto">
              {votes.map((vote) => {
                const pill =
                  vote.status === "completed"
                    ? { label: "종료", cls: "text-[#6B7090] bg-[#EEF0F7]" }
                    : vote.hasVoted
                    ? { label: "참여 완료", cls: "text-[#6B7090] bg-[#EEF0F7]" }
                    : { label: "미참여", cls: "text-[#C4332B] bg-[#FDEBEC]" };
                return (
                  <div key={vote.id} className="flex flex-col gap-1 py-2.5 border-b border-[#EEF0F7] last:border-b-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{vote.title}</span>
                      <span className={`text-xs font-bold px-2.5 py-[3px] rounded-full shrink-0 ${pill.cls}`}>{pill.label}</span>
                    </div>
                    <span className="text-xs text-[#8A8FAD]">
                      {vote.participantsCount}명 참여 · {vote.deadline}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        );

      case "minigame":
        return (
          <>
            <div className="flex items-center justify-between">
              <span className={cardTitle}>미니게임</span>
              <button
                onClick={() => router.push("/minigamearchive")}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                title="미니게임 보관함으로 이동"
              >
                <House className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2.5 mt-auto pt-6">
              <button
                onClick={openDrawLotsModal}
                className="flex items-center gap-3 p-4 rounded-[14px] bg-white/[0.08] hover:bg-white/[0.16] text-[15px] font-semibold transition-colors"
              >
                <Shuffle className="w-[18px] h-[18px] opacity-85" />
                제비뽑기
              </button>
              <button
                onClick={openLadderModal}
                className="flex items-center gap-3 p-4 rounded-[14px] bg-white/[0.08] hover:bg-white/[0.16] text-[15px] font-semibold transition-colors"
              >
                <Rows3 className="w-[18px] h-[18px] opacity-85" />
                사다리타기
              </button>
            </div>
          </>
        );

      case "recent":
        return (
          <>
            <div className={`${cardTitle} mb-3.5`}>최신 작업</div>
            {recentTasks.length === 0 && <div className="py-6 text-center text-[13px] text-[#8A8FAD]">아직 작업 내역이 없습니다.</div>}
            <div className="grid grid-cols-4 gap-2.5">
              {recentTasks.map((task) => (
                <div key={task.id} className={tileClass}>
                  {task.icon === "file" ? (
                    <FileText className="w-[22px] h-[22px] text-[#6B7090]" />
                  ) : (
                    <CalendarIcon className="w-[22px] h-[22px] text-[#6B7090]" />
                  )}
                  <span className="text-xs font-semibold max-w-full truncate">{task.name}</span>
                </div>
              ))}
            </div>
          </>
        );

      case "resources":
        return (
          <>
            <div className="flex items-center justify-between mb-3.5">
              <span className={cardTitle}>자료 보관함</span>
              <button onClick={() => router.push("/storage")} className="text-[13px] font-semibold text-[#3D5BD9] hover:underline">
                전체 보기
              </button>
            </div>
            {recentResources.length === 0 && <div className="py-6 text-center text-[13px] text-[#8A8FAD]">아직 자료가 없습니다.</div>}
            <div className="grid grid-cols-4 gap-2.5">
              {recentResources.map((resource) => (
                <div key={resource.id} className={tileClass}>
                  {renderItemIcon(resource)}
                  <span className="text-xs font-semibold max-w-full truncate">{resource.name}</span>
                </div>
              ))}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F6FC] text-[#1F2340]">
        <div className="text-center space-y-3">
          <p className="text-lg font-bold">존재하지 않거나 접근 권한이 없는 프로젝트입니다.</p>
          <button onClick={() => router.push("/mainpage")} className="text-sm font-semibold text-[#3D5BD9] hover:underline">
            메인페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const activePanel = openPanel ? panelConfig[openPanel] : null;

  return (
    <div className="min-h-screen bg-[#F4F6FC] text-[#1F2340] antialiased flex flex-col select-none">
      {/* 상단 바 (메인페이지와 공통) */}
      <header className="h-[68px] shrink-0 flex items-center gap-6 px-6 md:px-10 relative z-40">
        <Link href="/mainpage" className="shrink-0 hover:opacity-80 transition-opacity">
          <img src="/logo/cobalt-hub-logo.svg" alt="CobaltHUB" className="h-[26px] w-auto" />
        </Link>

        <div className="flex-1 max-w-[440px] mx-auto relative">
          <label className="flex items-center gap-2 bg-white rounded-full px-4 py-2.5 text-sm shadow-[0_1px_2px_rgba(31,35,64,0.06)] focus-within:ring-2 focus-within:ring-[#8CA5FF]">
            <Search className="w-[15px] h-[15px] text-[#8A8FAD] shrink-0" />
            <input
              type="text"
              placeholder="이 프로젝트에서 검색"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none placeholder-[#8A8FAD]"
            />
            {globalSearch && (
              <button onClick={() => setGlobalSearch("")} title="검색 지우기">
                <X className="w-4 h-4 text-[#8A8FAD]" />
              </button>
            )}
          </label>
          {globalSearch.trim() && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl p-2 shadow-[0_4px_12px_rgba(31,35,64,0.08),0_16px_40px_rgba(31,35,64,0.14)]">
              {globalResults.length === 0 ? (
                <div className="px-3 py-4 text-center text-[13px] text-[#8A8FAD]">검색 결과가 없습니다.</div>
              ) : (
                globalResults.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#F4F6FC] text-sm">
                    {renderItemIcon(item)}
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="text-xs text-[#8A8FAD]">
                      {item.type === "file" ? "파일" : item.type === "calendar" ? "달력" : "자료"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-sm shrink-0">
          <span className="hidden md:inline text-[#6B7090]">기본 플랜</span>
          <button onClick={() => setIsUpgradeModalOpen(true)} className="hidden md:inline font-semibold text-[#3D5BD9] hover:underline">
            업그레이드
          </button>
          <div className="relative ml-1.5" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              title={`${activeAccount}님`}
              className="w-[34px] h-[34px] rounded-full bg-[#8CA5FF] text-white text-[13px] font-bold flex items-center justify-center hover:ring-4 hover:ring-[#DDE5FF] transition"
            >
              {activeAccount.charAt(0)}
            </button>
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl p-2 z-50 shadow-[0_4px_12px_rgba(31,35,64,0.08),0_16px_40px_rgba(31,35,64,0.14)] text-sm">
                <div className="px-3 py-2 text-[13px] text-[#6B7090]">
                  <strong className="font-semibold text-[#1F2340]">{activeAccount}</strong>님 환영합니다
                </div>
                {[
                  { label: "플랜 업그레이드", icon: Crown, onClick: () => setIsUpgradeModalOpen(true) },
                  { label: "사용자 프로필", icon: User, onClick: () => router.push("/profile") },
                  { label: "계정 변경", icon: Settings, onClick: () => setIsAccountSwitchModalOpen(true) },
                ].map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onClick();
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

      <div className="flex-1 flex gap-6 pl-4 md:pl-6 pr-6 md:pr-10 pt-4 pb-10 relative">
        {/* 팝오버 바깥 클릭 시 닫기 */}
        {openPanel && <div className="fixed inset-0 z-20" onClick={() => setOpenPanel(null)} />}

        {/* 아이콘 레일 */}
        <aside className="z-30 w-14 shrink-0 self-start sticky top-4 bg-white rounded-[20px] flex flex-col items-center py-3 gap-1.5 shadow-[0_1px_2px_rgba(31,35,64,0.05)]">
          <Link
            href="/mainpage"
            title="메인페이지로 돌아가기"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8A8FAD] hover:bg-[#F4F6FC] hover:text-[#1F2340] transition-colors"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </Link>
          <div className="w-7 h-px bg-[#EEF0F7] my-1" />
          {PANEL_ORDER.map((key, index) => {
            const { name, icon: Icon } = panelConfig[key];
            const active = openPanel === key;
            return (
              <div key={key} className="relative">
                <button
                  onClick={() => setOpenPanel(active ? null : key)}
                  title={name}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active ? "bg-[#E6EBFF] text-[#3D5BD9]" : "text-[#8A8FAD] hover:bg-[#F4F6FC] hover:text-[#1F2340]"}`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </button>

                {/* 팝오버 패널 */}
                {active && activePanel && (
                  <div
                    className="absolute left-[calc(100%+20px)] -top-5 w-[264px] bg-white rounded-[20px] px-4 py-5 flex flex-col gap-3.5 shadow-[0_4px_12px_rgba(31,35,64,0.08),0_16px_40px_rgba(31,35,64,0.14)]"
                    data-panel-index={index}
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[17px] font-bold">{activePanel.name}</span>
                      <span className="text-xs font-semibold text-[#6B7090] bg-[#EEF0F7] px-2 py-0.5 rounded-full">{activePanel.total}</span>
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center gap-2 bg-[#F4F6FC] rounded-full px-3 py-2 text-[13px] focus-within:ring-2 focus-within:ring-[#8CA5FF]">
                        <Search className="w-3.5 h-3.5 text-[#8A8FAD] shrink-0" />
                        <input
                          type="text"
                          placeholder="검색"
                          value={activePanel.search}
                          onChange={(e) => activePanel.setSearch(e.target.value)}
                          className="flex-1 min-w-0 bg-transparent outline-none placeholder-[#8A8FAD]"
                        />
                      </label>
                      <button
                        onClick={() => setAddItemModal(key)}
                        title={`${activePanel.name} 추가`}
                        className="w-[34px] h-[34px] rounded-full bg-[#3D5BD9] hover:bg-[#2A44B8] text-white flex items-center justify-center shrink-0 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-0.5 max-h-[420px] overflow-y-auto scrollbar-thin">
                      {activePanel.items.length === 0 && (
                        <div className="py-6 text-center text-[13px] text-[#8A8FAD]">항목이 없습니다.</div>
                      )}
                      {activePanel.items.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(key, item.id)}
                          onDragOver={(e) => handleDragOverItem(e, item.id)}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDrop(key, item.id);
                          }}
                          onDragEnd={handleDragEnd}
                          onContextMenu={(e) => handleItemContextMenu(e, key, item.id)}
                          className={`group flex items-center gap-2.5 px-2.5 py-[9px] rounded-xl text-sm font-medium hover:bg-[#F4F6FC] cursor-pointer transition-colors ${draggedItem?.id === item.id ? "opacity-40" : ""} ${dragOverId === item.id && draggedItem?.id !== item.id ? "ring-2 ring-[#8CA5FF] bg-[#F4F6FC]" : ""}`}
                        >
                          <GripVertical className="w-[13px] h-[13px] text-[#C9CEE6] shrink-0 opacity-0 group-hover:opacity-100" />
                          {renderItemIcon(item)}
                          <span className="flex-1 truncate">{item.name}</span>
                          {(item.subType === "png" || item.subType === "jpg" || item.subType === "ppt") && (
                            <span className="text-[10px] font-bold text-[#3D5BD9] bg-[#E6EBFF] px-1.5 py-0.5 rounded-md">
                              {item.subType.toUpperCase()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-[#8A8FAD] px-1">드래그로 순서 변경 · 우클릭으로 삭제</div>
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* 본문 */}
        <main className="flex-1 min-w-0 flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4 pt-2 px-1">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-[#6B7090]">
                <Link href="/mainpage" className="hover:underline">
                  내 프로젝트
                </Link>{" "}
                / {projectTitle}
              </span>
              <h1 className="text-[28px] md:text-[32px] font-bold tracking-[-0.025em]">{projectTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex">
                {members.slice(0, 5).map((m, i) => (
                  <div
                    key={m.id}
                    title={m.name}
                    className="w-[30px] h-[30px] rounded-full border-2 border-[#F4F6FC] -ml-1.5 first:ml-0 text-[11px] font-bold flex items-center justify-center"
                    style={{ background: MEMBER_TINTS[i % MEMBER_TINTS.length] }}
                  >
                    {m.name.charAt(0)}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3D5BD9] hover:bg-[#2A44B8] text-white text-sm font-semibold transition-colors"
              >
                <UserPlus className="w-[15px] h-[15px]" />
                초대하기
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* D-Day / 프로젝트 설명 카드 (고정) */}
            <button
              onClick={() => setIsDescModalOpen(true)}
              className="lg:col-span-4 bg-[#8CA5FF] hover:bg-[#7F99FA] text-white rounded-[20px] p-[26px] flex flex-col min-h-[260px] text-left transition-colors"
            >
              <span className="text-sm font-semibold">{projectDeadlineLabel}</span>
              <span className="text-[72px] xl:text-[88px] font-extrabold tracking-[-0.04em] leading-none mt-auto">
                {compactDDay(projectDDay)}
              </span>
              <span className="text-sm leading-relaxed mt-4 font-medium line-clamp-3">
                {projectDescription ||
                  "실시간 소통과 팀원 작업 상황 공유, 회의록 및 자료 보관을 한 번에 관리하는 차세대 팀 프로젝트 협업 플랫폼입니다."}
              </span>
            </button>

            {cardOrder.map((key, slot) => (
              <div
                key={key}
                onDragOver={(e) => handleCardDragOver(e, key)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleCardDrop(key);
                }}
                className={`group relative flex flex-col ${BENTO_SLOT_SPANS[slot]} ${key === "minigame" ? "bg-[#1F2340] text-white rounded-[20px] px-[26px] py-6" : cardShell} ${draggedCardKey === key ? "opacity-40" : ""} ${cardDragOverKey === key && draggedCardKey !== key ? "ring-4 ring-[#8CA5FF]/50" : ""}`}
              >
                {/* 카드 자리 바꾸기용 드래그 핸들 (hover 시 노출) */}
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleCardDragStart(key);
                  }}
                  onDragEnd={handleCardDragEnd}
                  title="카드 위치 이동"
                  className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-white shadow-[0_1px_4px_rgba(31,35,64,0.15)] flex items-center justify-center text-[#8A8FAD] hover:text-[#3D5BD9] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition z-10"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
                {renderDashboardCard(key)}
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Project Description Modal */}
      {isDescModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-extrabold text-gray-900">
                프로젝트 설명
              </h3>
              <button
                onClick={() => setIsDescModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed space-y-3">
              <p className="font-bold text-gray-900 text-base">
                📌 {projectTitle}
              </p>
              <p>
                {projectDescription || "등록된 프로젝트 설명이 없습니다."}
              </p>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-1 text-xs text-blue-900 font-medium">
                <div>• {projectDeadlineLabel}</div>
                <div>
                  • 총 팀원 수: {members.length}명
                  {members.find((m) => m.isLeader)
                    ? ` (팀장 ${members.find((m) => m.isLeader)?.name} 외 ${Math.max(
                        members.length - 1,
                        0
                      )}명)`
                    : ""}
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsDescModalOpen(false)}
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Invite Team Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleInviteMember}
            className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-extrabold text-gray-900">
                팀원 초대하기
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">
                초대할 팀원의 이메일 주소
              </label>
              <input
                type="email"
                required
                placeholder="example@node.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-400">
                가입된 사용자는 알림으로, 미가입자는 이메일로 초대가 가도록
                보내고, 상대방이 수락하면 팀원으로 추가됩니다.
              </p>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors disabled:opacity-50"
              >
                {isInviting ? "보내는 중..." : "초대 보내기"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. New Vote Modal */}
      {isNewVoteModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateVote}
            className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-extrabold text-gray-900">
                새 투표 만들기
              </h3>
              <button
                type="button"
                onClick={closeNewVoteModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">
                  투표 안건 제목
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 8주차 회의 날짜 선택"
                  value={newVoteTitle}
                  onChange={(e) => setNewVoteTitle(e.target.value)}
                  className="w-full px-4 py-2.5 mt-1 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">
                  마감일 설정
                </label>
                <input
                  type="date"
                  value={newVoteDeadline}
                  onChange={(e) => setNewVoteDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 mt-1 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* 투표 목록 (선택지) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    투표 목록
                  </label>
                  <button
                    type="button"
                    onClick={addVoteOption}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    항목 추가
                  </button>
                </div>

                <div className="space-y-2">
                  {newVoteOptions.map((option, index) => (
                    <div
                      key={option.id}
                      className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 bg-gray-50/60"
                    >
                      {/* 이미지 드래그 앤 드롭 영역 */}
                      <input
                        ref={(el) => {
                          voteOptionFileInputs.current[option.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setVoteOptionImage(option.id, e.target.files?.[0])
                        }
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          voteOptionFileInputs.current[option.id]?.click()
                        }
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDraggingOptionId(option.id);
                        }}
                        onDragLeave={() =>
                          setDraggingOptionId((prev) =>
                            prev === option.id ? null : prev
                          )
                        }
                        onDrop={(e) => {
                          e.preventDefault();
                          setDraggingOptionId(null);
                          setVoteOptionImage(
                            option.id,
                            e.dataTransfer.files?.[0]
                          );
                        }}
                        title="이미지를 드래그하거나 클릭해서 추가"
                        className={`shrink-0 w-12 h-12 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${
                          draggingOptionId === option.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-blue-200 bg-white hover:bg-blue-50"
                        }`}
                      >
                        {option.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={option.imageUrl}
                            alt={option.text || "투표 항목 이미지"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UploadCloud
                            className={`w-5 h-5 ${
                              draggingOptionId === option.id
                                ? "text-blue-600"
                                : "text-[#8CA5FF]"
                            }`}
                          />
                        )}
                      </button>

                      <input
                        type="text"
                        placeholder={`항목 ${index + 1} (예: 시안 A)`}
                        value={option.text}
                        onChange={(e) =>
                          updateVoteOptionText(option.id, e.target.value)
                        }
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                      />

                      {newVoteOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVoteOption(option.id)}
                          title="항목 삭제"
                          className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNewVoteModal}
                className="px-4 py-2 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="submit"
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                투표 등록
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Add Todo Modal */}
      {isAddTodoModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddTodo}
            className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-extrabold text-gray-900">
                새 TO DO 추가
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTodoModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">
                  할 일 내용
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 데이터베이스 스키마 설계"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  className="w-full px-4 py-2.5 mt-1 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">
                  마감일
                </label>
                <input
                  type="date"
                  required
                  value={newTodoDueDate}
                  onChange={(e) => setNewTodoDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 mt-1 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddTodoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="submit"
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                추가
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 팀원 설정 모달 (팀원 현황 카드의 설정 아이콘): 삭제 / 권한 설정 */}
      {isMemberSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-extrabold text-gray-900">팀원 설정</h3>
              <button
                onClick={() => setIsMemberSettingsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto -mr-2 pr-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center text-gray-600 shrink-0">
                    <User className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-gray-900 truncate">
                        {member.name}
                      </span>
                      {member.isLeader && (
                        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{member.role}</span>
                  </div>

                  {member.isLeader ? (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shrink-0">
                      관리자 (팀장)
                    </span>
                  ) : (
                    <>
                      <select
                        value={member.permission}
                        onChange={(e) =>
                          handleChangePermission(
                            member.id,
                            e.target.value as MemberPermission
                          )
                        }
                        className="text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 shrink-0"
                      >
                        {(Object.keys(permissionLabels) as MemberPermission[]).map(
                          (key) => (
                            <option key={key} value={key}>
                              {permissionLabels[key]}
                            </option>
                          )
                        )}
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        title="팀원 삭제"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsMemberSettingsModalOpen(false)}
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 사이드바 항목 추가 팝업: 파일 / 달력 (이름 입력) */}
      {(addItemModal === "files" || addItemModal === "calendars") && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddItemSubmit}
            className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-base font-extrabold text-gray-900">
                {addItemModalConfig[addItemModal].title}
              </h3>
              <button
                type="button"
                onClick={closeAddItemModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700">
                {addItemModalConfig[addItemModal].label}
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder={addItemModalConfig[addItemModal].placeholder}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 mt-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>

            <div className="pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAddItemModal}
                className="px-3 py-1.5 rounded-lg text-gray-600 font-bold text-sm hover:bg-gray-100"
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

      {/* 6. 자료 보관함 추가 팝업: 파일 드래그 앤 드롭 업로드 */}
      {addItemModal === "resources" && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-base font-extrabold text-gray-900">
                새 자료 추가
              </h3>
              <button
                type="button"
                onClick={closeAddItemModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={resourceFileInputRef}
              type="file"
              multiple
              onChange={(e) => handleResourceFilesAdded(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => resourceFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                handleResourceFilesAdded(e.dataTransfer.files);
              }}
              className={`w-full flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed text-center transition-colors ${
                isDraggingFile
                  ? "border-blue-500 bg-blue-50"
                  : "border-blue-200 bg-blue-50/40 hover:bg-blue-50"
              }`}
            >
              <UploadCloud
                className={`w-8 h-8 ${
                  isDraggingFile ? "text-blue-600" : "text-[#8CA5FF]"
                }`}
              />
              <span className="text-sm font-bold text-gray-800">
                파일을 여기로 드래그하세요
              </span>
              <span className="text-xs text-gray-500">
                또는 클릭해서 파일 선택
              </span>
            </button>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeAddItemModal}
                className="px-3 py-1.5 rounded-lg text-gray-600 font-bold text-sm hover:bg-gray-100"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. 사이드바 항목 우클릭 컨텍스트 메뉴 (삭제) */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 py-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={handleRequestDeleteItem}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
        </div>
      )}

      {/* 8. 삭제 확인 팝업 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-800">
              <span className="font-bold text-gray-900">
                &quot;{deleteConfirm.name}&quot;
              </span>{" "}
              항목을 삭제하시겠습니까?
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={closeDeleteConfirm}
                className="flex-1 py-2 rounded-lg text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDeleteItem}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-md transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 플랜 업그레이드 모달 */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-3xl shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-bold text-gray-900">플랜 업그레이드</h3>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              더 많은 프로젝트와 기능이 필요하다면 나에게 맞는 플랜으로 업그레이드하세요.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 기본 플랜 (현재 이용 중) */}
              <div className="rounded-2xl border-2 border-gray-200 p-5 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-lg font-bold text-gray-900">기본 플랜</h4>
                  <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    현재 플랜
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900 mb-4">무료</p>
                <ul className="space-y-2 text-sm text-gray-600 flex-1">
                  {["프로젝트 최대 8개 생성", "팀원 최대 5명 초대", "기본 통계 제공"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled
                  className="mt-4 w-full py-2.5 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-not-allowed"
                >
                  이용 중
                </button>
              </div>

              {/* 프리미엄 플랜 */}
              <div className="relative rounded-2xl border-2 border-[#8CA5FF] bg-blue-50/40 p-5 flex flex-col overflow-hidden">
                <span className="absolute top-0 right-0 bg-[#8CA5FF] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  추천
                </span>
                <h4 className="text-lg font-bold text-gray-900 mb-1">프리미엄 플랜</h4>
                <p className="text-2xl font-extrabold text-gray-900 mb-4">
                  ₩9,900<span className="text-sm font-medium text-gray-500"> / 월</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-700 flex-1">
                  {["프로젝트 무제한 생성", "팀원 무제한 초대", "고급 통계 및 리포트", "우선 고객 지원"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    router.push("/payment?plan=premium");
                  }}
                  className="mt-4 w-full py-2.5 bg-[#8CA5FF] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
                >
                  업그레이드하기
                </button>
              </div>

              {/* Pro 플랜 */}
              <div className="relative rounded-2xl border-2 border-gray-900 p-5 flex flex-col overflow-hidden">
                <span className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  PRO
                </span>
                <h4 className="text-lg font-bold text-gray-900 mb-1">프로 플랜</h4>
                <p className="text-2xl font-extrabold text-gray-900 mb-4">
                  ₩19,900<span className="text-sm font-medium text-gray-500"> / 월</span>
                </p>
                <ul className="space-y-2 text-sm text-gray-700 flex-1">
                  {["프리미엄 기능 모두 포함", "전담 매니저 배정", "API 연동 지원", "맞춤형 보안 설정"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-900 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    router.push("/payment?plan=pro");
                  }}
                  className="mt-4 w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
                >
                  업그레이드하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 계정 변경 모달 */}
      {isAccountSwitchModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">계정 변경</h3>
              <button
                onClick={() => setIsAccountSwitchModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">전환할 계정을 선택하세요.</p>
            <div className="space-y-2">
              {savedAccounts.map((account) => (
                <button
                  key={account}
                  onClick={() => {
                    setActiveAccount(account);
                    setIsAccountSwitchModalOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    account === activeAccount
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-200 hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    {account}
                  </span>
                  {account === activeAccount && (
                    <span className="text-xs font-bold text-blue-600">사용 중</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setIsAccountSwitchModalOpen(false);
                router.push("/login");
              }}
              className="w-full mt-4 py-2.5 bg-[#8CA5FF] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-md"
            >
              다른 계정으로 로그인
            </button>
          </div>
        </div>
      )}

      {/* 미니게임: 제비뽑기 모달 */}
      {isDrawLotsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-[#8CA5FF]" />
                제비뽑기
              </h3>
              <button
                onClick={closeDrawLotsModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600">
            </p>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-gray-700">뽑을 인원 수</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDrawCount((c) => Math.max(1, c - 1))}
                  disabled={isDrawing || drawCount <= 1}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold text-gray-900">{drawCount}</span>
                <button
                  type="button"
                  onClick={() => setDrawCount((c) => Math.min(members.length, c + 1))}
                  disabled={isDrawing || drawCount >= members.length}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {members.map((member) => {
                const isHighlighted = drawHighlightId === member.id;
                const isWinner = drawWinnerIds.includes(member.id) && !isDrawing;
                return (
                  <div
                    key={member.id}
                    className={`rounded-xl border-2 py-3 px-2 text-center text-sm font-bold transition-all duration-100 ${
                      isWinner
                        ? "border-amber-400 bg-amber-50 text-amber-600 scale-105 shadow-md"
                        : isHighlighted
                        ? "border-blue-400 bg-blue-50 text-blue-600"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    {member.name}
                  </div>
                );
              })}
            </div>

            {drawWinnerIds.length > 0 && !isDrawing && (
              <p className="text-center text-lg font-extrabold text-amber-600">
                🎉 당첨:{" "}
                {drawWinnerIds
                  .map((id) => members.find((m) => m.id === id)?.name)
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={closeDrawLotsModal}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleStartDraw}
                disabled={isDrawing || members.length < 2}
                className="flex-1 py-2.5 bg-[#8CA5FF] hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
              >
                {isDrawing ? "뽑는 중..." : drawWinnerIds.length > 0 ? "다시 뽑기" : "뽑기 시작"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 미니게임: 사다리타기 모달 */}
      {isLadderModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <Rows3 className="w-5 h-5 text-[#8CA5FF]" />
                사다리타기
              </h3>
              <button
                onClick={closeLadderModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                결과 항목 (자유롭게 입력해보세요)
              </label>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}
              >
                {ladderOutcomes.map((outcome, i) => (
                  <input
                    key={i}
                    value={outcome}
                    onChange={(e) => updateLadderOutcome(i, e.target.value)}
                    className="w-full min-w-0 px-2 py-1.5 text-xs text-center rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                ))}
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <div
                className="mx-auto"
                style={{ width: Math.max(members.length * 64, 240) }}
              >
                {/* 참가자 이름 */}
                <div
                  className="grid mb-1"
                  style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}
                >
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="text-center text-xs font-bold text-gray-800 px-1 truncate"
                    >
                      {member.name}
                    </div>
                  ))}
                </div>

                {/* 사다리 시각화 */}
                <svg
                  width={members.length * 64}
                  height={LADDER_ROW_COUNT * 28}
                  className="block"
                >
                  {members.map((_, i) => (
                    <line
                      key={`col-${i}`}
                      x1={i * 64 + 32}
                      y1={0}
                      x2={i * 64 + 32}
                      y2={LADDER_ROW_COUNT * 28}
                      stroke="#D1D5DB"
                      strokeWidth={3}
                    />
                  ))}
                  {ladderRungs.map((row, r) =>
                    row.map(
                      (hasRung, i) =>
                        hasRung && (
                          <line
                            key={`rung-${r}-${i}`}
                            x1={i * 64 + 32}
                            y1={r * 28 + 14}
                            x2={(i + 1) * 64 + 32}
                            y2={r * 28 + 14}
                            stroke="#8CA5FF"
                            strokeWidth={3}
                          />
                        )
                    )
                  )}
                </svg>

                {/* 결과 라벨 */}
                <div
                  className="grid mt-1"
                  style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}
                >
                  {ladderOutcomes.map((outcome, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-bold text-gray-500 px-1 truncate"
                    >
                      {outcome}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRegenerateLadder}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                다시 섞기
              </button>
              <button
                onClick={() => setShowLadderResult(true)}
                className="flex-1 py-2.5 bg-[#8CA5FF] hover:bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
              >
                결과 보기
              </button>
            </div>

            {showLadderResult && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                {members.map((member, i) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <span className="font-bold text-gray-900">{member.name}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold text-blue-600">
                      {ladderOutcomes[ladderResultMap[i]]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
