"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  FileText,
  Calendar as CalendarIcon,
  Folder,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  Mic,
  X,
} from "lucide-react";

// Projectmainpage 의 사이드바를 shareSheet 전용으로 복사한 것.
// 팀원 파일을 건드리지 않기 위해 공통 컴포넌트로 빼지 않고 이 폴더 안에 따로 둔다.

import {
  createId,
  inferResourceSubType,
  loadSidebar,
  saveSidebar,
  type SidebarItem,
} from "./data";

type SectionKey = "files" | "calendars" | "resources";

const SECTION_LABELS: Record<SectionKey, string> = {
  files: "파일",
  calendars: "캘린더",
  resources: "자료 보관함",
};

const ADD_MODAL_TEXT: Record<SectionKey, { title: string; placeholder: string }> = {
  files: { title: "새 파일 추가", placeholder: "예: 6주차 회의록" },
  calendars: { title: "새 캘린더 추가", placeholder: "예: 팀 캘린더" },
  resources: { title: "새 자료 추가", placeholder: "예: 2차 발표 자료.pptx" },
};

function ResourceIcon({ subType }: { subType: SidebarItem["subType"] }) {
  const badge = "bg-[#B0C7FF] text-[#1E3A8A] text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-300 shrink-0";

  if (subType === "png") return <span className={badge}>PNG</span>;
  if (subType === "jpg") return <span className={badge}>JPG</span>;
  if (subType === "ppt") return <span className={badge}>PPT</span>;
  if (subType === "url") return <LinkIcon className="w-4 h-4 text-gray-600 shrink-0" />;
  if (subType === "audio") return <Mic className="w-4 h-4 text-gray-600 shrink-0" />;
  return <FileText className="w-4 h-4 text-gray-600 shrink-0" />;
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 목록은 data.ts 에서 불러온다. 불러오기 전에는 빈 상태로 그린다.
  const [files, setFiles] = useState<SidebarItem[]>([]);
  const [calendars, setCalendars] = useState<SidebarItem[]>([]);
  const [resources, setResources] = useState<SidebarItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSidebar().then((data) => {
      if (!alive) return;
      setFiles(data.files);
      setCalendars(data.calendars);
      setResources(data.resources);
      setIsLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 불러오기가 끝난 뒤의 변경만 저장한다.
  // (이 검사가 없으면 첫 렌더의 빈 목록이 저장된 내용을 덮어쓴다.)
  const isLoadedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded) return;
    if (!isLoadedRef.current) {
      isLoadedRef.current = true;
      return;
    }
    saveSidebar({ files, calendars, resources });
  }, [isLoaded, files, calendars, resources]);

  const [search, setSearch] = useState<Record<SectionKey, string>>({
    files: "",
    calendars: "",
    resources: "",
  });

  const [addModal, setAddModal] = useState<SectionKey | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const filtered = useMemo(
    () => ({
      files: files.filter((f) => f.name.toLowerCase().includes(search.files.toLowerCase())),
      calendars: calendars.filter((c) =>
        c.name.toLowerCase().includes(search.calendars.toLowerCase())
      ),
      resources: resources.filter((r) =>
        r.name.toLowerCase().includes(search.resources.toLowerCase())
      ),
    }),
    [files, calendars, resources, search]
  );

  const closeAddModal = () => {
    setAddModal(null);
    setNewItemName("");
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newItemName.trim();
    if (!addModal || !name) return;

    const item: SidebarItem = { id: createId(), name };
    if (addModal === "files") {
      setFiles((prev) => [...prev, item]);
    } else if (addModal === "calendars") {
      setCalendars((prev) => [...prev, item]);
    } else {
      setResources((prev) => [...prev, { ...item, subType: inferResourceSubType(name) }]);
    }
    closeAddModal();
  };

  const renderSection = (section: SectionKey, HeaderIcon: typeof FileText) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
        <HeaderIcon className="w-4 h-4 text-gray-700" />
        <span>{SECTION_LABELS[section]}</span>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="검색"
            value={search[section]}
            onChange={(e) => setSearch((prev) => ({ ...prev, [section]: e.target.value }))}
            className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded-full border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 shadow-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setAddModal(section)}
          className="p-1 bg-white border border-blue-200 rounded-full hover:bg-blue-50 text-gray-700 transition-colors shadow-sm"
          title={`${SECTION_LABELS[section]} 추가`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1 pt-1">
        {filtered[section].map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/60 text-gray-800 text-sm font-semibold transition-colors cursor-pointer"
          >
            {section === "resources" ? (
              <ResourceIcon subType={item.subType} />
            ) : section === "calendars" ? (
              <CalendarIcon className="w-4 h-4 text-gray-600 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-gray-600 shrink-0" />
            )}
            <span className="truncate">{item.name}</span>
          </div>
        ))}

        {filtered[section].length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-500">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`transition-all duration-300 bg-[#DDE5FF] border-r border-blue-200/80 flex flex-col z-20 shadow-md shrink-0 ${
          isCollapsed ? "w-16" : "w-72"
        }`}
      >
        {/* D-Day 헤더 */}
        <div className="p-4 flex items-center justify-between border-b border-blue-200/60">
          {!isCollapsed && (
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
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-blue-300/50 text-gray-700 transition-colors ml-auto"
            title={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 본문 */}
        {isCollapsed ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-6 flex flex-col items-center pt-6">
            <button type="button" title="파일" className="p-2 hover:bg-white/50 rounded-lg text-gray-700">
              <FileText className="w-5 h-5" />
            </button>
            <button type="button" title="캘린더" className="p-2 hover:bg-white/50 rounded-lg text-gray-700">
              <CalendarIcon className="w-5 h-5" />
            </button>
            <button type="button" title="자료 보관함" className="p-2 hover:bg-white/50 rounded-lg text-gray-700">
              <Folder className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {renderSection("files", FileText)}
            {renderSection("calendars", CalendarIcon)}
            {renderSection("resources", Folder)}
          </div>
        )}
      </aside>

      {/* 항목 추가 모달 */}
      {addModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddItem}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-extrabold text-gray-900">
                {ADD_MODAL_TEXT[addModal].title}
              </h3>
              <button
                type="button"
                onClick={closeAddModal}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              required
              placeholder={ADD_MODAL_TEXT[addModal].placeholder}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeAddModal}
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
    </>
  );
}
