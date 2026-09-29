"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Pencil,
  Keyboard,
  Plus,
  Lock,
  Unlock,
  FileText,
  Table,
  Calendar as CalendarIcon,
  Vote,
  User,
  Loader2,
  Check,
  LogIn,
} from "lucide-react";

export type EditorMode = "typing" | "drawing";

export type SaveState = "saving" | "saved";

export interface Member {
  id: number;
  name: string;
  /** 지금 이 문서를 보고 있는 사람이면 초록 테두리가 들어온다. */
  isActive: boolean;
}

interface ToolbarProps {
  title: string;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  members: Member[];
  /** 지금 열려 있는 창 수. 한 사람이 두 창을 열면 2가 된다. */
  connections: number;
  /** 실시간 신호가 연결됐는지. 끊겨 있으면 접속자 정보가 낡은 값이다. */
  isPresenceConnected: boolean;
  onInsertImage: () => void;
  onInsertTable: () => void;
  onInsertVote: () => void;
  onInsertCalendar: () => void;
  saveState: SaveState;
  /** ISO 문자열. 마지막으로 저장된 시각. */
  updatedAt: string;
  /** 지금 보고 있는 사람의 이름. 아직 확인 중이면 null. */
  myName: string | null;
  /** 로그인 여부. 확인 중에는 null 이라서 버튼이 깜빡이지 않는다. */
  isLoggedIn: boolean | null;
  /** 지금 고칠 수 있는지. 자물쇠와 편집 권한을 모두 따진 결과다. */
  canEdit: boolean;
  /**
   * 편집 권한이 있는지. 자물쇠는 따지지 않는다.
   * 자물쇠 버튼에는 이걸 써야 한다 — canEdit 으로 막으면 한 번 잠근 뒤에
   * 아무도 풀 수 없게 된다.
   */
  hasEditRight: boolean;
}

/** 추가 버튼 드롭다운 항목. 1단계에서는 '파일'만 실제로 동작한다. */
const ADD_MENU = [
  { key: "file", label: "파일", icon: FileText, ready: true },
  { key: "table", label: "표", icon: Table, ready: true },
  { key: "calendar", label: "달력", icon: CalendarIcon, ready: true },
  { key: "vote", label: "투표", icon: Vote, ready: true },
] as const;

export default function Toolbar({
  title,
  mode,
  onModeChange,
  isLocked,
  onToggleLock,
  members,
  connections,
  isPresenceConnected,
  onInsertImage,
  onInsertTable,
  onInsertVote,
  onInsertCalendar,
  saveState,
  updatedAt,
  myName,
  isLoggedIn,
  canEdit,
  hasEditRight,
}: ToolbarProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // 드롭다운 바깥을 누르거나 ESC 를 누르면 닫는다.
  useEffect(() => {
    if (!isAddMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsAddMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAddMenuOpen]);

  const handleAddMenuClick = (key: (typeof ADD_MENU)[number]["key"]) => {
    setIsAddMenuOpen(false);
    if (key === "file") onInsertImage();
    if (key === "table") onInsertTable();
    if (key === "vote") onInsertVote();
    if (key === "calendar") onInsertCalendar();
  };

  const modeButtonClass = (active: boolean) =>
    `p-2 rounded-lg border transition-colors ${
      active
        ? "bg-[#8CA5FF] border-[#8CA5FF] text-white shadow-sm"
        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
      {/* 문서 제목 + 저장 상태 */}
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="w-5 h-5 text-gray-700 shrink-0" />
        <span className="text-sm font-bold text-gray-800 truncate">{title}</span>
        <span
          className={`text-[11px] font-semibold shrink-0 flex items-center gap-1 ${
            saveState === "saving" ? "text-gray-400" : "text-green-600"
          }`}
          title={updatedAt ? `마지막 저장: ${new Date(updatedAt).toLocaleString("ko-KR")}` : ""}
        >
          {saveState === "saving" ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              저장 중…
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              저장됨
            </>
          )}
        </span>
      </div>

      {/* 가운데 도구 모음 */}
      <div className="flex items-center gap-2 mx-auto">
        <button
          type="button"
          onClick={() => onModeChange("drawing")}
          className={modeButtonClass(mode === "drawing")}
          title="드로잉 모드"
        >
          <Pencil className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => onModeChange("typing")}
          className={modeButtonClass(mode === "typing")}
          title="타이핑 모드"
        >
          <Keyboard className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* 추가 버튼 + 드롭다운 */}
        <div className="relative" ref={addMenuRef}>
          <button
            type="button"
            onClick={() => setIsAddMenuOpen((prev) => !prev)}
            disabled={!canEdit}
            className="flex items-center gap-1 bg-[#FF4D4D] hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm px-3.5 py-1.5 rounded-xl shadow-sm transition-colors"
            title={
              isLocked
                ? "잠금 상태에서는 추가할 수 없습니다"
                : !canEdit
                  ? "편집 권한이 없어서 추가할 수 없습니다"
                  : "파일·표·달력·투표 추가"
            }
          >
            <Plus className="w-4 h-4" />
            <span>추가</span>
          </button>

          {isAddMenuOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 flex gap-1 z-30">
              {ADD_MENU.map(({ key, label, icon: Icon, ready }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleAddMenuClick(key)}
                  disabled={!ready}
                  className="flex flex-col items-center gap-1 w-16 px-2 py-2 rounded-lg text-gray-700 hover:bg-blue-50 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                  title={ready ? `${label} 추가` : `${label}은(는) 다음 단계에서 연결됩니다`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* 잠금 버튼 */}
        <button
          type="button"
          onClick={onToggleLock}
          disabled={!hasEditRight}
          className={`p-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isLocked
              ? "bg-[#FF4D4D] border-[#FF4D4D] text-white shadow-sm"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
          title={
            !hasEditRight
              ? "편집 권한이 없어서 자물쇠를 바꿀 수 없습니다"
              : isLocked
                ? "잠금 해제 (편집 가능)"
                : "잠그기 (편집 불가)"
          }
        >
          {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
        </button>
      </div>

      {/* 접속자 목록 */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 실시간 접속 상태 */}
        <div
          className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${
            isPresenceConnected
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}
          title={
            isPresenceConnected
              ? `지금 ${connections}개의 창이 이 문서를 열고 있습니다`
              : "실시간 연결을 기다리는 중"
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPresenceConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
            }`}
          />
          {isPresenceConnected ? `${connections}명 접속 중` : "연결 중…"}
        </div>

        <div className="flex items-center gap-1.5">
          {members.map((member) => (
            <div key={member.id} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 transition-colors ${
                  member.isActive
                    ? "border-2 border-green-500 text-gray-700"
                    : "border border-gray-300"
                }`}
                title={member.isActive ? `${member.name} — 작업 중` : member.name}
              >
                <User className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-gray-600 leading-none">
                {member.name}
              </span>
            </div>
          ))}
        </div>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/*
          로그인을 안 했으면 여기가 "로그인" 버튼이 된다.
          로그인을 안 해도 편집은 되지만, 접속자 목록에 실명 대신 손님으로 뜬다.
        */}
        {isLoggedIn === false ? (
          <a
            href="/login"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#8CA5FF] text-[11px] font-bold text-[#4457B4] hover:bg-[#EEF2FF] transition-colors"
            title="로그인하면 접속자 목록에 실제 이름으로 표시됩니다"
          >
            <LogIn className="w-4 h-4" />
            로그인
          </a>
        ) : (
          <a
            href="/profile"
            className="p-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
            title={myName ? `${myName} — 내 프로필` : "내 프로필"}
          >
            <User className="w-5 h-5" />
          </a>
        )}
      </div>
    </header>
  );
}
