"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Home,
} from "lucide-react";

// Types
type MemberPermission = "read" | "write" | "admin";

interface TeamMember {
  id: number;
  name: string;
  role: "팀장" | "팀원";
  progress: number;
  isLeader?: boolean;
  permission: MemberPermission;
}

interface SidebarItem {
  id: number;
  name: string;
  type: "file" | "calendar" | "resource";
  subType?: "png" | "jpg" | "url" | "audio" | "ppt" | "file";
}

interface VoteOption {
  id: number;
  text: string;
  imageUrl?: string;
}

interface VoteItem {
  id: number;
  title: string;
  participantsCount: number;
  hasVoted: boolean;
  deadline: string;
  status: "in-progress" | "completed";
  options: VoteOption[];
}

interface TodoItem {
  id: number;
  text: string;
  dDay: string;
  completed: boolean;
}

export default function ProjectMainPage() {
  const router = useRouter();

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Search queries for sidebar sections
  const [fileSearch, setFileSearch] = useState("");
  const [calendarSearch, setCalendarSearch] = useState("");
  const [resourceSearch, setResourceSearch] = useState("");

  // Data States
  const [files, setFiles] = useState<SidebarItem[]>([
    { id: 1, name: "1주차 회의록", type: "file" },
    { id: 2, name: "2주차 회의록", type: "file" },
    { id: 3, name: "3주차 회의록", type: "file" },
    { id: 4, name: "4주차 회의록", type: "file" },
    { id: 5, name: "5주차 회의록", type: "file" },
    { id: 6, name: "프로젝트 기획서", type: "file" },
  ]);

  const [calendars, setCalendars] = useState<SidebarItem[]>([
    { id: 1, name: "캘린더 1", type: "calendar" },
    { id: 2, name: "캘린더 2", type: "calendar" },
  ]);

  const [resources, setResources] = useState<SidebarItem[]>([
    { id: 1, name: "디자인 초안", type: "resource", subType: "png" },
    { id: 2, name: "버튼 디자인", type: "resource", subType: "jpg" },
    { id: 3, name: "참고하는 URL", type: "resource", subType: "url" },
    { id: 4, name: "버튼 클릭 효과음", type: "resource", subType: "audio" },
    { id: 5, name: "1차 발표 자료", type: "resource", subType: "ppt" },
    { id: 6, name: "로고 시안", type: "resource", subType: "png" },
    { id: 7, name: "발표 스크립트", type: "resource", subType: "file" },
    { id: 8, name: "회의 녹음 파일", type: "resource", subType: "audio" },
  ]);

  // Team Members
  const [members, setMembers] = useState<TeamMember[]>([
    { id: 1, name: "박성빈", role: "팀장", progress: 10, isLeader: true, permission: "admin" },
    { id: 2, name: "박기완", role: "팀원", progress: 10, permission: "write" },
    { id: 3, name: "한주현", role: "팀원", progress: 10, permission: "write" },
    { id: 4, name: "권소희", role: "팀원", progress: 10, permission: "write" },
    { id: 5, name: "박서연", role: "팀원", progress: 40, permission: "write" },
  ]);

  // 팀원 설정(권한/삭제) 모달 상태
  const [isMemberSettingsModalOpen, setIsMemberSettingsModalOpen] = useState(false);

  const permissionLabels: Record<MemberPermission, string> = {
    read: "읽기만 허용",
    write: "읽기 쓰기 허용",
    admin: "관리자 위임",
  };

  const handleChangePermission = (id: number, permission: MemberPermission) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, permission } : m))
    );
  };

  const handleRemoveMember = (id: number, name: string) => {
    if (confirm(`${name} 님을 팀에서 삭제하시겠습니까?`)) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Recent Tasks
  const [recentTasks] = useState([
    { id: 1, name: "5주차 회의록", type: "file", icon: "file" },
    { id: 2, name: "프로젝트 기획서", type: "file", icon: "file" },
    { id: 3, name: "캘린더 1", type: "calendar", icon: "calendar" },
    { id: 4, name: "4주차 회의록", type: "file", icon: "file" },
    { id: 5, name: "캘린더 2", type: "calendar", icon: "calendar" },
    { id: 6, name: "3주차 회의록", type: "file", icon: "file" },
    { id: 7, name: "2주차 회의록", type: "file", icon: "file" },
    { id: 8, name: "1주차 회의록", type: "file", icon: "file" },
  ]);

  // Votes
  const [votes, setVotes] = useState<VoteItem[]>([
    {
      id: 1,
      title: "버튼 UI 선택",
      participantsCount: 3,
      hasVoted: true,
      deadline: "2026/08/15 마감",
      status: "in-progress",
      options: [
        { id: 1, text: "시안 A" },
        { id: 2, text: "시안 B" },
      ],
    },
    {
      id: 2,
      title: "7주차 회의 날짜",
      participantsCount: 1,
      hasVoted: false,
      deadline: "2026/08/05 마감",
      status: "in-progress",
      options: [
        { id: 1, text: "화요일" },
        { id: 2, text: "목요일" },
      ],
    },
    {
      id: 3,
      title: "6주차 회의 날짜",
      participantsCount: 5,
      hasVoted: true,
      deadline: "2026/07/15 종료",
      status: "completed",
      options: [
        { id: 1, text: "월요일" },
        { id: 2, text: "수요일" },
      ],
    },
  ]);

  // Todo Items
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: "피그마 디자인 하기", dDay: "D - Day 1", completed: false },
    { id: 2, text: "메인페이지 프론트 코드 짜기", dDay: "D - Day 7", completed: false },
    { id: 3, text: "메인페이지 백앤드 코드 짜기", dDay: "D - Day 7", completed: false },
  ]);

  // Modal States
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isNewVoteModalOpen, setIsNewVoteModalOpen] = useState(false);
  const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // 미니게임: 제비뽑기 상태
  const [isDrawLotsModalOpen, setIsDrawLotsModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawHighlightId, setDrawHighlightId] = useState<number | null>(null);
  const [drawWinnerIds, setDrawWinnerIds] = useState<number[]>([]);
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
  const MIN_LADDER_COUNT = 2;
  const MAX_LADDER_COUNT = 10;
  const [isLadderModalOpen, setIsLadderModalOpen] = useState(false);
  const [ladderParticipants, setLadderParticipants] = useState<string[]>(
    members.map((m) => m.name)
  );
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
    setLadderRungs(generateLadderRungs(ladderParticipants.length));
    setShowLadderResult(false);
    setSelectedLadderStart(null);
    setLadderPathDrawn(false);
    setIsLadderModalOpen(true);
  };

  const closeLadderModal = () => setIsLadderModalOpen(false);

  const handleRegenerateLadder = () => {
    setLadderRungs(generateLadderRungs(ladderParticipants.length));
    setShowLadderResult(false);
    setSelectedLadderStart(null);
    setLadderPathDrawn(false);
  };

  const updateLadderParticipant = (index: number, value: string) => {
    setLadderParticipants((prev) =>
      prev.map((name, i) => (i === index ? value : name))
    );
  };

  const updateLadderOutcome = (index: number, value: string) => {
    setLadderOutcomes((prev) =>
      prev.map((outcome, i) => (i === index ? value : outcome))
    );
  };

  const addLadderColumn = () => {
    if (ladderParticipants.length >= MAX_LADDER_COUNT) return;
    const newCount = ladderParticipants.length + 1;
    setLadderParticipants((prev) => [...prev, `참가자 ${prev.length + 1}`]);
    setLadderOutcomes((prev) => [...prev, `결과 ${prev.length + 1}`]);
    setLadderRungs(generateLadderRungs(newCount));
    setShowLadderResult(false);
    setSelectedLadderStart(null);
    setLadderPathDrawn(false);
  };

  const removeLadderColumn = () => {
    if (ladderParticipants.length <= MIN_LADDER_COUNT) return;
    const newCount = ladderParticipants.length - 1;
    setLadderParticipants((prev) => prev.slice(0, -1));
    setLadderOutcomes((prev) => prev.slice(0, -1));
    setLadderRungs(generateLadderRungs(newCount));
    setShowLadderResult(false);
    setSelectedLadderStart(null);
    setLadderPathDrawn(false);
  };

  const ladderResultMap = useMemo(() => {
    const count = ladderParticipants.length;
    const results: number[] = [];
    for (let start = 0; start < count; start++) {
      let pos = start;
      for (const row of ladderRungs) {
        if (pos > 0 && row[pos - 1]) {
          pos -= 1;
        } else if (pos < count - 1 && row[pos]) {
          pos += 1;
        }
      }
      results.push(pos);
    }
    return results;
  }, [ladderRungs, ladderParticipants.length]);

  // 사다리타기 결과 공개 후 이름 클릭 시 본인 경로 애니메이션
  const LADDER_COL_WIDTH = 64;
  const [selectedLadderStart, setSelectedLadderStart] = useState<number | null>(null);
  const [ladderPathDrawn, setLadderPathDrawn] = useState(false);

  const handleSelectLadderPath = (index: number) => {
    setSelectedLadderStart(index);
    setLadderPathDrawn(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setLadderPathDrawn(true));
    });
  };

  const selectedLadderPathPoints = useMemo(() => {
    if (selectedLadderStart === null) return [] as { x: number; y: number }[];
    const points: { x: number; y: number }[] = [];
    let pos = selectedLadderStart;
    points.push({ x: pos * LADDER_COL_WIDTH + LADDER_COL_WIDTH / 2, y: 0 });
    ladderRungs.forEach((row, r) => {
      const y = r * 28 + 14;
      if (pos > 0 && row[pos - 1]) {
        points.push({ x: pos * LADDER_COL_WIDTH + LADDER_COL_WIDTH / 2, y });
        pos -= 1;
        points.push({ x: pos * LADDER_COL_WIDTH + LADDER_COL_WIDTH / 2, y });
      } else if (pos < ladderParticipants.length - 1 && row[pos]) {
        points.push({ x: pos * LADDER_COL_WIDTH + LADDER_COL_WIDTH / 2, y });
        pos += 1;
        points.push({ x: pos * LADDER_COL_WIDTH + LADDER_COL_WIDTH / 2, y });
      }
    });
    points.push({ x: pos * LADDER_COL_WIDTH + LADDER_COL_WIDTH / 2, y: LADDER_ROW_COUNT * 28 });
    return points;
  }, [selectedLadderStart, ladderRungs, ladderParticipants.length]);

  // 사용자 프로필 메뉴 및 계정 변경 관련 상태 (mainpage와 동일)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [activeAccount, setActiveAccount] = useState("박성빈");
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
  const [newVoteOptions, setNewVoteOptions] = useState<VoteOption[]>([
    { id: 1, text: "" },
    { id: 2, text: "" },
  ]);
  const [draggingOptionId, setDraggingOptionId] = useState<number | null>(null);
  const voteOptionFileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const addVoteOption = () => {
    setNewVoteOptions((prev) => [...prev, { id: Date.now(), text: "" }]);
  };

  const removeVoteOption = (id: number) => {
    setNewVoteOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateVoteOptionText = (id: number, text: string) => {
    setNewVoteOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, text } : o))
    );
  };

  const setVoteOptionImage = (id: number, file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewVoteOptions((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, imageUrl: reader.result as string } : o
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const resetNewVoteForm = () => {
    setNewVoteTitle("");
    setNewVoteDeadline("");
    setNewVoteOptions([
      { id: 1, text: "" },
      { id: 2, text: "" },
    ]);
    setDraggingOptionId(null);
  };

  const closeNewVoteModal = () => {
    setIsNewVoteModalOpen(false);
    resetNewVoteForm();
  };

  // New Todo Form State
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDDay, setNewTodoDDay] = useState("D - Day 7");

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");

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

  // Handlers
  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleCreateVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoteTitle.trim()) return;

    const validOptions = newVoteOptions
      .filter((o) => o.text.trim())
      .map((o) => ({ id: o.id, text: o.text, imageUrl: o.imageUrl }));

    setVotes((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: newVoteTitle,
        participantsCount: 1,
        hasVoted: true,
        deadline: newVoteDeadline || "2026/08/30 마감",
        status: "in-progress",
        options: validOptions,
      },
    ]);
    setIsNewVoteModalOpen(false);
    resetNewVoteForm();
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    setTodos((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: newTodoText,
        dDay: newTodoDDay || "D - Day 7",
        completed: false,
      },
    ]);
    setNewTodoText("");
    setIsAddTodoModalOpen(false);
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    alert(`${inviteEmail} 님에게 초대 메일을 발송했습니다.`);
    setInviteEmail("");
    setIsInviteModalOpen(false);
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

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemModal || addItemModal === "resources" || !newItemName.trim())
      return;

    if (addItemModal === "files") {
      setFiles((prev) => [
        ...prev,
        { id: Date.now(), name: newItemName, type: "file" },
      ]);
    } else {
      setCalendars((prev) => [
        ...prev,
        { id: Date.now(), name: newItemName, type: "calendar" },
      ]);
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

  const handleResourceFilesAdded = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: SidebarItem[] = Array.from(fileList).map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      type: "resource",
      subType: inferResourceSubType(file.name),
    }));

    setResources((prev) => [...prev, ...newItems]);
    closeAddItemModal();
  };

  // 드래그 앤 드롭으로 사이드바 항목 순서 변경
  const [draggedItem, setDraggedItem] = useState<{
    section: "files" | "calendars" | "resources";
    id: number;
  } | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  // 검색으로 필터링된 상태에서도 정확히 동작하도록 id 기준으로 원본 배열 순서를 변경
  const reorderById = <T extends { id: number }>(
    list: T[],
    draggedId: number,
    targetId: number
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

  const handleDragStart = (
    section: "files" | "calendars" | "resources",
    id: number
  ) => {
    setDraggedItem({ section, id });
  };

  const handleDragOverItem = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (
    section: "files" | "calendars" | "resources",
    targetId: number
  ) => {
    if (draggedItem && draggedItem.section === section) {
      if (section === "files") {
        setFiles((prev) => reorderById(prev, draggedItem.id, targetId));
      } else if (section === "calendars") {
        setCalendars((prev) => reorderById(prev, draggedItem.id, targetId));
      } else {
        setResources((prev) => reorderById(prev, draggedItem.id, targetId));
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
    id: number;
    x: number;
    y: number;
  } | null>(null);

  const handleItemContextMenu = (
    e: React.MouseEvent,
    section: "files" | "calendars" | "resources",
    id: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ section, id, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  // 삭제 확인 팝업 상태
  const [deleteConfirm, setDeleteConfirm] = useState<{
    section: "files" | "calendars" | "resources";
    id: number;
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

  const handleConfirmDeleteItem = () => {
    if (!deleteConfirm) return;
    const { section, id } = deleteConfirm;
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
  const [cardOrder, setCardOrder] = useState<DashboardCardKey[]>([
    "team",
    "recent",
    "vote",
    "todo",
    "resources",
    "minigame",
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

  const renderDashboardCard = (key: DashboardCardKey) => {
    switch (key) {
      case "team":
        return (
          <>
            {/* Card Title Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-900 font-extrabold text-lg">
                <Users className="w-5 h-5 text-gray-700" />
                <span>팀원 현황</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="bg-[#8CA5FF] hover:bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors shadow-sm flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>초대하기</span>
                </button>
                <button
                  onClick={() => setIsMemberSettingsModalOpen(true)}
                  className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                  title="팀 설정"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Members Horizontal Grid */}
            <div className="grid grid-cols-5 gap-3 items-end pt-2 pb-1">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col items-center text-center space-y-2 group"
                >
                  {/* Crown icon for leader */}
                  <div className="h-6 flex items-center justify-center">
                    {member.isLeader && (
                      <Crown className="w-5 h-5 text-amber-500 fill-amber-400 animate-bounce" />
                    )}
                  </div>

                  {/* Avatar Circle */}
                  <button
                    onClick={() => router.push("/profile")}
                    title={`${member.name} 프로필 보기`}
                    className="w-16 h-16 rounded-full border-2 border-gray-200 bg-gray-50 flex items-center justify-center text-gray-600 shadow-sm group-hover:border-blue-400 group-hover:bg-blue-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <User className="w-8 h-8" />
                  </button>

                  {/* Name & Role */}
                  <div className="space-y-1">
                    <div className="font-extrabold text-base text-gray-900 leading-tight">
                      {member.name}
                    </div>
                    <div className="text-sm font-medium text-gray-500">
                      {member.role}
                    </div>
                  </div>

                  {/* Progress Pill Bar */}
                  <div className="w-full max-w-[84px] bg-gray-100 rounded-full h-5 relative overflow-hidden border border-gray-200 flex items-center justify-center">
                    <div
                      className="bg-[#FF4D4D] h-full absolute left-0 top-0 transition-all duration-300 rounded-full"
                      style={{ width: `${member.progress}%` }}
                    />
                    <span className="relative z-10 text-xs font-bold text-gray-900 leading-none">
                      {member.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        );

      case "recent":
        return (
          <>
            {/* Card Header */}
            <div className="flex items-center gap-2 text-gray-900 font-extrabold text-lg mb-4">
              <Clock className="w-5 h-5 text-gray-700" />
              <span>최신 작업</span>
            </div>

            {/* Items Grid (위 4개 / 아래 4개, 총 8개) */}
            <div className="grid grid-cols-4 gap-x-3 gap-y-4 items-start justify-items-center">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col items-center text-center space-y-2 cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-800 flex items-center justify-center text-gray-800 shadow-md group-hover:scale-105 group-hover:border-blue-600 group-hover:text-blue-600 transition-all">
                    {task.icon === "file" ? (
                      <FileText className="w-7 h-7 stroke-[1.8]" />
                    ) : (
                      <CalendarIcon className="w-7 h-7 stroke-[1.8]" />
                    )}
                  </div>
                  <span className="font-extrabold text-xs text-gray-800 group-hover:text-blue-600 transition-colors truncate max-w-[76px]">
                    {task.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        );

      case "resources":
        return (
          <>
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-900 font-extrabold text-lg">
                <Folder className="w-5 h-5 text-gray-700" />
                <span>자료 보관함</span>
              </div>
              <button
                onClick={() => router.push("/storage")}
                title="자료보관함으로 이동"
                className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <Home className="w-4 h-4" />
              </button>
            </div>

            {/* 가장 최근에 사용한 자료 8개 (위 4개 / 아래 4개) */}
            <div className="grid grid-cols-4 gap-x-3 gap-y-4 items-start justify-items-center">
              {recentResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex flex-col items-center text-center space-y-2 cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-800 flex items-center justify-center text-gray-800 shadow-md group-hover:scale-105 group-hover:border-blue-600 group-hover:text-blue-600 transition-all">
                    {resource.subType === "png" || resource.subType === "jpg" ? (
                      <FileImage className="w-7 h-7 stroke-[1.8]" />
                    ) : resource.subType === "url" ? (
                      <LinkIcon className="w-7 h-7 stroke-[1.8]" />
                    ) : resource.subType === "audio" ? (
                      <Mic className="w-7 h-7 stroke-[1.8]" />
                    ) : resource.subType === "ppt" ? (
                      <Presentation className="w-7 h-7 stroke-[1.8]" />
                    ) : (
                      <FileText className="w-7 h-7 stroke-[1.8]" />
                    )}
                  </div>
                  <span className="font-extrabold text-xs text-gray-800 group-hover:text-blue-600 transition-colors truncate max-w-[76px]">
                    {resource.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        );

      case "minigame":
        return (
          <>
            {/* Card Header */}
            <div className="flex items-center gap-2 text-gray-900 font-extrabold text-lg mb-4">
              <Dices className="w-5 h-5 text-gray-700" />
              <span>미니게임</span>
            </div>

            {/* 미니게임 목록 */}
            <div className="grid grid-cols-2 gap-3 flex-1">
              <button
                onClick={openDrawLotsModal}
                className="group rounded-2xl border-2 border-[#8CA5FF] hover:bg-blue-50/40 hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-2 py-6 text-[#8CA5FF] group-hover:text-blue-600 font-bold text-sm"
              >
                <Shuffle className="w-7 h-7 group-hover:text-blue-600 transition-colors" />
                <span className="group-hover:text-blue-600 transition-colors">제비뽑기</span>
              </button>
              <button
                onClick={openLadderModal}
                className="group rounded-2xl border-2 border-[#8CA5FF] hover:bg-blue-50/40 hover:border-blue-500 transition-all flex flex-col items-center justify-center gap-2 py-6 text-[#8CA5FF] group-hover:text-blue-600 font-bold text-sm"
              >
                <Rows3 className="w-7 h-7 group-hover:text-blue-600 transition-colors" />
                <span className="group-hover:text-blue-600 transition-colors">사다리타기</span>
              </button>
            </div>
          </>
        );

      case "vote":
        return (
          <>
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-900 font-extrabold text-lg">
                <span className="bg-gray-100 border border-gray-300 text-gray-800 text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  VOTE
                </span>
                <span>투표</span>
              </div>
              <button
                onClick={() => setIsNewVoteModalOpen(true)}
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition-colors shadow-sm"
              >
                NEW
              </button>
            </div>

            {/* 2 Column Voting Layout */}
            <div className="grid grid-cols-2 gap-4 divide-x divide-gray-100">
              {/* Column 1: 진행중인 투표 */}
              <div className="space-y-3 pr-2">
                <h4 className="text-xs font-bold text-gray-600">진행중인 투표</h4>
                <div className="space-y-3">
                  {votes
                    .filter((v) => v.status === "in-progress")
                    .map((vote) => (
                      <div key={vote.id} className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                          <Circle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>&quot;{vote.title}&quot;</span>
                        </div>
                        <div className="pl-5 text-[11px] font-medium text-gray-600 flex items-center gap-2">
                          <span>{vote.participantsCount}명 참여</span>
                          <span className="text-gray-400">•</span>
                          <span className={vote.hasVoted ? "text-gray-800 font-semibold" : "text-red-500"}>
                            {vote.hasVoted ? "참여 완료" : "참여 X"}
                          </span>
                        </div>
                        <div className="pl-5 text-[10px] font-medium text-gray-600">
                          {vote.deadline}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Column 2: 완료된 투표 */}
              <div className="space-y-3 pl-4">
                <h4 className="text-xs font-bold text-gray-600">완료된 투표</h4>
                <div className="space-y-3">
                  {votes
                    .filter((v) => v.status === "completed")
                    .map((vote) => (
                      <div key={vote.id} className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                          <Circle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>&quot;{vote.title}&quot;</span>
                        </div>
                        <div className="pl-5 text-[11px] font-medium text-gray-600 flex items-center gap-2">
                          <span>{vote.participantsCount}명 참여</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-800 font-semibold">참여 완료</span>
                        </div>
                        <div className="pl-5 text-[10px] font-medium text-gray-600">
                          {vote.deadline}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        );

      case "todo":
        return (
          <>
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-900 font-extrabold text-lg">
                <ListTodo className="w-5 h-5 text-gray-700" />
                <span>TO DO LIST</span>
              </div>
              <button
                onClick={() => setIsAddTodoModalOpen(true)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                title="할 일 추가"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Todo Item List */}
            <div className="space-y-3 flex-1">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => toggleTodo(todo.id)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {todo.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span
                      className={`text-sm font-bold text-gray-900 ${
                        todo.completed ? "line-through text-gray-400" : ""
                      }`}
                    >
                      &quot;{todo.text}&quot;
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                    {todo.dDay}
                  </span>
                </div>
              ))}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden font-sans select-none">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (LIGHT BLUE / INDIGO SOFT THEME) */}
      {/* ========================================================================= */}
      <aside
        className={`transition-all duration-300 bg-[#DDE5FF] border-r border-blue-200/80 flex flex-col z-20 shadow-md ${
          isSidebarCollapsed ? "w-16" : "w-72"
        }`}
      >
        {/* Sidebar Header: D-Day & Collapse Button */}
        <div className="p-4 flex items-center justify-between border-b border-blue-200/60">
          {!isSidebarCollapsed && (
            <div className="flex flex-col">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                D - Day 200
              </h2>
              <span className="text-xs font-semibold text-gray-600 mt-0.5">
                마감 : 2026/12/23
              </span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-blue-300/50 text-gray-700 transition-colors ml-auto"
            title={isSidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Sidebar Scrollable Body */}
        {!isSidebarCollapsed ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {/* Section 1: 파일 (Files) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-900 font-bold text-base">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-700" />
                  <span>파일</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="검색"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded-full border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 shadow-sm"
                  />
                </div>
                <button
                  onClick={() => setAddItemModal("files")}
                  className="p-1 bg-white border border-blue-200 rounded-full hover:bg-blue-50 text-gray-700 transition-colors shadow-sm"
                  title="파일 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* File Item List */}
              <div className="space-y-1 pt-1">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={() => handleDragStart("files", file.id)}
                    onDragOver={(e) => handleDragOverItem(e, file.id)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop("files", file.id);
                    }}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => handleItemContextMenu(e, "files", file.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/60 text-gray-800 text-sm font-semibold transition-colors ${
                      draggedItem?.id === file.id ? "opacity-40" : ""
                    } ${
                      dragOverId === file.id && draggedItem?.id !== file.id
                        ? "ring-2 ring-blue-400 bg-white/80"
                        : ""
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <FileText className="w-4 h-4 text-gray-600 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: 달력 (Calendar) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-900 font-bold text-base">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-700" />
                  <span>달력</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="검색"
                    value={calendarSearch}
                    onChange={(e) => setCalendarSearch(e.target.value)}
                    className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded-full border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 shadow-sm"
                  />
                </div>
                <button
                  onClick={() => setAddItemModal("calendars")}
                  className="p-1 bg-white border border-blue-200 rounded-full hover:bg-blue-50 text-gray-700 transition-colors shadow-sm"
                  title="달력 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar Item List */}
              <div className="space-y-1 pt-1">
                {filteredCalendars.map((cal) => (
                  <div
                    key={cal.id}
                    draggable
                    onDragStart={() => handleDragStart("calendars", cal.id)}
                    onDragOver={(e) => handleDragOverItem(e, cal.id)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop("calendars", cal.id);
                    }}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => handleItemContextMenu(e, "calendars", cal.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/60 text-gray-800 text-sm font-semibold transition-colors ${
                      draggedItem?.id === cal.id ? "opacity-40" : ""
                    } ${
                      dragOverId === cal.id && draggedItem?.id !== cal.id
                        ? "ring-2 ring-blue-400 bg-white/80"
                        : ""
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <CalendarIcon className="w-4 h-4 text-gray-600 shrink-0" />
                    <span className="truncate">{cal.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: 자료 보관함 (Archive/Resources) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-900 font-bold text-base">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-700" />
                  <span>자료 보관함</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="검색"
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded-full border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 shadow-sm"
                  />
                </div>
                <button
                  onClick={() => setAddItemModal("resources")}
                  className="p-1 bg-white border border-blue-200 rounded-full hover:bg-blue-50 text-gray-700 transition-colors shadow-sm"
                  title="자료 추가"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Resource Item List */}
              <div className="space-y-1 pt-1">
                {filteredResources.map((res) => (
                  <div
                    key={res.id}
                    draggable
                    onDragStart={() => handleDragStart("resources", res.id)}
                    onDragOver={(e) => handleDragOverItem(e, res.id)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop("resources", res.id);
                    }}
                    onDragEnd={handleDragEnd}
                    onContextMenu={(e) => handleItemContextMenu(e, "resources", res.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/60 text-gray-800 text-sm font-semibold transition-colors ${
                      draggedItem?.id === res.id ? "opacity-40" : ""
                    } ${
                      dragOverId === res.id && draggedItem?.id !== res.id
                        ? "ring-2 ring-blue-400 bg-white/80"
                        : ""
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {res.subType === "png" && (
                      <span className="bg-[#B0C7FF] text-[#1E3A8A] text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-300">
                        PNG
                      </span>
                    )}
                    {res.subType === "jpg" && (
                      <span className="bg-[#B0C7FF] text-[#1E3A8A] text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-300">
                        JPG
                      </span>
                    )}
                    {res.subType === "url" && (
                      <LinkIcon className="w-4 h-4 text-gray-600 shrink-0" />
                    )}
                    {res.subType === "audio" && (
                      <Mic className="w-4 h-4 text-gray-600 shrink-0" />
                    )}
                    {res.subType === "ppt" && (
                      <span className="bg-[#B0C7FF] text-[#1E3A8A] text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-300">
                        PPT
                      </span>
                    )}
                    {res.subType === "file" && (
                      <FileText className="w-4 h-4 text-gray-600 shrink-0" />
                    )}
                    <span className="truncate">{res.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed Icon Bar */
          <div className="flex-1 overflow-y-auto p-2 space-y-6 flex flex-col items-center pt-6">
            <button title="파일" className="p-2 hover:bg-white/50 rounded-lg text-gray-700">
              <FileText className="w-5 h-5" />
            </button>
            <button title="달력" className="p-2 hover:bg-white/50 rounded-lg text-gray-700">
              <CalendarIcon className="w-5 h-5" />
            </button>
            <button title="자료 보관함" className="p-2 hover:bg-white/50 rounded-lg text-gray-700">
              <Folder className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-white">
        {/* Top Header */}
        <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link
              href="/mainpage"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
              title="메인 목록으로 돌아가기"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>메인페이지</span>
            </Link>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            프로젝트 NODE
          </h1>

          <div className="relative" ref={userMenuRef}>
            <div className="flex items-center space-x-2 text-gray-700 text-sm font-medium">
              <span>
                <span className="relative inline-block">
                  <strong
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="text-blue-600 font-semibold cursor-pointer hover:underline"
                  >
                    {activeAccount}
                  </strong>

                  {/* 사용자 드롭다운 메뉴 */}
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
                          setIsUserMenuOpen(false);
                          router.push("/profile");
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
                          setIsUserMenuOpen(false);
                          setIsAccountSwitchModalOpen(true);
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
        </header>

        {/* Content Body Container */}
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {/* Banner Button: 프로젝트 설명 */}
          <div className="w-full">
            <button
              onClick={() => setIsDescModalOpen(true)}
              className="w-full bg-[#8CA5FF] hover:bg-blue-600 text-white py-4 px-6 rounded-2xl shadow-md transition-all duration-200 flex items-center justify-center font-bold text-base md:text-lg tracking-tight cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 text-center leading-snug"
            >
              실시간 소통과 팀원 작업 상황 공유, 회의록 및 자료 보관을 한 번에 관리하는 차세대 팀 프로젝트 협업 플랫폼입니다.
            </button>
          </div>

          {/* 대시보드 카드 그리드 (드래그로 위치 맞바꾸기 가능) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cardOrder.map((key) => (
              <div
                key={key}
                onDragOver={(e) => handleCardDragOver(e, key)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleCardDrop(key);
                }}
                className={`relative bg-white rounded-2xl pt-6 px-6 pb-6 border-2 border-[#8CA5FF] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[250px] ${
                  draggedCardKey === key ? "opacity-40" : ""
                } ${
                  cardDragOverKey === key && draggedCardKey !== key
                    ? "ring-4 ring-blue-200 border-blue-500"
                    : ""
                }`}
              >
                {/* 박스 위치 이동용 드래그 핸들 */}
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleCardDragStart(key);
                  }}
                  onDragEnd={handleCardDragEnd}
                  title="박스 위치 이동"
                  className="absolute -top-3.5 -left-3.5 w-7 h-7 rounded-full bg-white border-2 border-[#8CA5FF] shadow-sm flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-500 cursor-grab active:cursor-grabbing transition-colors z-20"
                >
                  <GripVertical className="w-4 h-4" />
                </button>

                {renderDashboardCard(key)}
              </div>
            ))}
          </div>
        </div>
      </main>

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
                📌 프로젝트 NODE 
              </p>
              <p>
                실시간 소통과 팀원 작업 상황 공유, 회의록 및 자료 보관을 한 번에
                관리하는 차세대 팀 프로젝트 협업 플랫폼입니다.
              </p>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-1 text-xs text-blue-900 font-medium">
                <div>• 목표: 팀원 간 원활한 문서 및 투표 공유</div>
                <div>• 마감일: 2026년 12월 23일</div>
                <div>• 총 팀원 수: 5명 (팀장 박성빈 외 4명)</div>
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
                className="bg-[#8CA5FF] hover:bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                초대 메일 보내기
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
                  type="text"
                  placeholder="예: 2026/08/20 마감"
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
                  D-Day 표시
                </label>
                <input
                  type="text"
                  placeholder="D - Day 7"
                  value={newTodoDDay}
                  onChange={(e) => setNewTodoDDay(e.target.value)}
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
              팀원 중 몇 명을 뽑을지 정하고 무작위로 뽑습니다.
            </p>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
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

            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-gray-700">참가자 수</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={removeLadderColumn}
                  disabled={ladderParticipants.length <= MIN_LADDER_COUNT}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold text-gray-900">
                  {ladderParticipants.length}
                </span>
                <button
                  type="button"
                  onClick={addLadderColumn}
                  disabled={ladderParticipants.length >= MAX_LADDER_COUNT}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="overflow-x-auto pb-1">
              <div
                className="mx-auto space-y-1"
                style={{ width: Math.max(ladderParticipants.length * 64, 240) }}
              >
                {/* 참가자 이름 (결과 공개 전엔 수정, 공개 후엔 클릭해서 본인 경로 확인) */}
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${ladderParticipants.length}, minmax(0, 1fr))` }}
                >
                  {ladderParticipants.map((name, i) =>
                    showLadderResult ? (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectLadderPath(i)}
                        title="클릭하면 본인 경로가 표시됩니다"
                        className={`w-full min-w-0 px-2 py-1.5 text-xs text-center font-bold rounded-lg border-2 truncate transition-colors ${
                          selectedLadderStart === i
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 text-gray-800 hover:border-gray-400"
                        }`}
                      >
                        {name}
                      </button>
                    ) : (
                      <input
                        key={i}
                        value={name}
                        onChange={(e) => updateLadderParticipant(i, e.target.value)}
                        className="w-full min-w-0 px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    )
                  )}
                </div>

                {/* 사다리 시각화 */}
                <svg
                  width={ladderParticipants.length * 64}
                  height={LADDER_ROW_COUNT * 28}
                  className="block"
                >
                  {ladderParticipants.map((_, i) => (
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
                  {selectedLadderStart !== null && (
                    <polyline
                      points={selectedLadderPathPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="#000000"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength={1}
                      style={{
                        strokeDasharray: 1,
                        strokeDashoffset: ladderPathDrawn ? 0 : 1,
                        transition: "stroke-dashoffset 1s linear",
                      }}
                    />
                  )}
                </svg>

                {/* 결과 항목 (자유롭게 수정 가능) */}
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${ladderOutcomes.length}, minmax(0, 1fr))` }}
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
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRegenerateLadder}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
              >
                다시 섞기
              </button>
              <button
                onClick={() => {
                  setShowLadderResult(true);
                  setSelectedLadderStart(null);
                  setLadderPathDrawn(false);
                }}
                className="flex-1 py-2.5 bg-[#8CA5FF] hover:bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
              >
                결과 보기
              </button>
            </div>

            {showLadderResult && (
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  위에서 본인 이름을 클릭하면 경로가 색칠됩니다.
                </p>
                {ladderParticipants.map((name, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-sm rounded-lg px-3 py-2 transition-colors ${
                      selectedLadderStart === i ? "bg-gray-900 text-white" : "bg-gray-50"
                    }`}
                  >
                    <span className={`font-bold ${selectedLadderStart === i ? "text-white" : "text-gray-900"}`}>
                      {name}
                    </span>
                    <span className={selectedLadderStart === i ? "text-gray-300" : "text-gray-400"}>→</span>
                    <span className={`font-semibold ${selectedLadderStart === i ? "text-white" : "text-blue-600"}`}>
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
