//Projectmainpage 에서 일부 가져옴.
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FileText,
  Calendar as CalendarIcon,
  Folder,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  Mic,
  X,
  Trash2,
  GripVertical,
  UploadCloud,
} from "lucide-react";

// Types
type MemberPermission = "read" | "write" | "admin";

interface SidebarItem {
  id: number;
  name: string;
  type: "file" | "calendar" | "resource";
  subType?: "png" | "jpg" | "url" | "audio" | "ppt" | "file";
}

export default function ProjectSidebar() {
  const router = useRouter();

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modal State (Upgrade Modal)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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

  // 사이드바 항목 추가 팝업 상태
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

  // 자료 보관함 파일 업로드 관련
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

  // 사이드바 항목 우클릭 컨텍스트 메뉴
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

  return (
    <>
      <aside
        className={`transition-all duration-300 bg-[#DDE5FF] border-r border-blue-200/80 flex flex-col h-screen z-20 shadow-md ${
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
            {/* Section 1: 파일 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-900 font-bold text-base">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-700" />
                  <span>파일</span>
                </div>
              </div>

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

            {/* Section 2: 달력 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-900 font-bold text-base">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-700" />
                  <span>달력</span>
                </div>
              </div>

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

            {/* Section 3: 자료 보관함 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-gray-900 font-bold text-base">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-700" />
                  <span>자료 보관함</span>
                </div>
              </div>

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

      {/* 모달 1: 파일 / 달력 추가 */}
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

      {/* 모달 2: 자료 보관함 추가 */}
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

      {/* 우클릭 메뉴 */}
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

      {/* 모달 3: 삭제 확인 */}
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
    </>
  );
}