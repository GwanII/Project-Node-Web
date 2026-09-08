"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import {
  Square,
  SquareRoundCorner,
  Circle,
  Triangle,
  Diamond,
  Pentagon,
  Star,
  MessageSquare,
  Minus,
  MoveUpRight,
  MousePointer2,
  Type,
  Table,
  Calendar,
  Vote,
  Shapes,
  ChevronDown,
  Group,
  Ungroup,
  Trash2,
  Undo2,
  Redo2,
  User,
  Play,
} from "lucide-react";

import Sidebar from "../shareSheet/Sidebar";
import { getMyName, loadDocument } from "../shareSheet/data";
import { useCollaboration } from "../shareSheet/useCollaboration";
import { usePresence } from "../shareSheet/usePresence";
import SlideCanvas from "./SlideCanvas";
import SlideList from "./SlideList";
import SlidePresentation from "./SlidePresentation";
import {
  SHAPE_LABELS,
  addSlide,
  ensureFirstSlide,
  moveSlide,
  objectsOf,
  readSlides,
  groupObjects,
  hasGroupedObject,
  removeSlide,
  setSlideLocked,
  ungroupObjects,
  slideOrderOf,
  slidesOf,
  type ShapeType,
  type Slide,
} from "./slideData";

/**
 * 공유 슬라이드.
 *
 * 시트지와 같은 실시간 장치를 그대로 쓴다. 문서 id 만 다르게 잡아서
 * documents 표의 다른 한 줄을 쓰므로, 표를 새로 만들 필요가 없다.
 */

const DECK_ID = "default-deck";

/** 도형 모음에 넣을 것들. 텍스트 상자는 따로 버튼을 둔다. */
const SHAPE_TOOLS: Array<{ type: ShapeType; icon: typeof Square }> = [
  { type: "rect", icon: Square },
  { type: "roundRect", icon: SquareRoundCorner },
  { type: "ellipse", icon: Circle },
  { type: "triangle", icon: Triangle },
  { type: "diamond", icon: Diamond },
  { type: "pentagon", icon: Pentagon },
  { type: "star", icon: Star },
  { type: "speech", icon: MessageSquare },
  { type: "line", icon: Minus },
  { type: "arrow", icon: MoveUpRight },
];

export default function ShareSlidePage() {
  const [myName, setMyName] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    // documents 에 이 줄이 있어야 편집 상태를 저장할 수 있다.
    Promise.all([getMyName(), loadDocument(DECK_ID)]).then(([name]) => {
      if (!alive) return;
      setMyName(name);
      setIsReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const collab = useCollaboration(DECK_ID, isReady);
  const presence = usePresence(DECK_ID, myName);
  const ydoc = collab.ydoc;

  /** 내가 낸 변경임을 표시하는 딱지. 되돌리기가 내 것만 되돌리게 한다. */
  const origin = useMemo(() => ({}), []);

  const undoManager = useMemo(() => {
    if (!ydoc) return null;
    return new Y.UndoManager(
      [slideOrderOf(ydoc), slidesOf(ydoc), objectsOf(ydoc)],
      { trackedOrigins: new Set([origin]) }
    );
  }, [ydoc, origin]);

  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  /** 글을 치고 있는 텍스트 상자. 이때는 단축키를 가로채면 안 된다. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /**
   * 발표 화면 상태.
   *   presenter — 내가 발표를 시작했다. 내 장 번호를 남들에게 알린다.
   *   viewer    — 남의 발표를 같이 보고 있다. 알리지 않고 따라간다.
   */
  const [presentMode, setPresentMode] = useState<"presenter" | "viewer" | null>(null);
  /** 남이 발표 중이면 그 사람이 보고 있는 장 번호 */
  const [presenterIndex, setPresenterIndex] = useState<number | null>(null);
  /** 도형 모음이 펼쳐져 있는지 */
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const shapeMenuRef = useRef<HTMLDivElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // --- 슬라이드 목록 따라가기 ---------------------------------------------
  useEffect(() => {
    if (!ydoc) return;
    const refresh = () => setSlides(readSlides(ydoc));
    refresh();
    slideOrderOf(ydoc).observe(refresh);
    slidesOf(ydoc).observe(refresh);
    return () => {
      slideOrderOf(ydoc).unobserve(refresh);
      slidesOf(ydoc).unobserve(refresh);
    };
  }, [ydoc]);

  // 첫 장이 없으면 하나 만든다. 다른 사람과 맞춘 뒤에 해야 중복 생성이 안 된다.
  useEffect(() => {
    if (!ydoc || !collab.isSynced) return;
    ensureFirstSlide(ydoc, origin);
  }, [ydoc, collab.isSynced, origin]);

  useEffect(() => {
    if (!undoManager) return;
    const onStack = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };
    undoManager.on("stack-item-added", onStack);
    undoManager.on("stack-item-popped", onStack);
    onStack();
    return () => {
      undoManager.off("stack-item-added", onStack);
      undoManager.off("stack-item-popped", onStack);
    };
  }, [undoManager]);

  /**
   * 실제로 보여줄 장.
   * 보고 있던 장을 남이 지웠을 수도 있어서, 상태를 고치는 대신 매번 계산한다.
   */
  const activeId =
    currentId && slides.some((s) => s.id === currentId)
      ? currentId
      : (slides[0]?.id ?? null);

  const current = slides.find((s) => s.id === activeId) ?? null;
  const isLocked = current?.locked ?? false;
  const activeIndex = Math.max(
    slides.findIndex((s) => s.id === activeId),
    0
  );

  // 도형 모음은 바깥을 누르거나 ESC 를 누르면 닫는다.
  useEffect(() => {
    if (!isShapeMenuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
        setIsShapeMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsShapeMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isShapeMenuOpen]);

  // --- 발표자 신호 ---------------------------------------------------------
  const awareness = collab.provider?.awareness ?? null;

  // 내가 발표자면 "지금 몇 번째 장" 을 계속 알린다.
  useEffect(() => {
    if (!awareness) return;
    awareness.setLocalStateField(
      "presenting",
      presentMode === "presenter" ? { slideIndex: activeIndex } : null
    );
  }, [awareness, presentMode, activeIndex]);

  // 창을 닫을 때 발표 표시를 지운다.
  useEffect(() => {
    if (!awareness) return;
    return () => awareness.setLocalStateField("presenting", null);
  }, [awareness]);

  // 남이 발표 중인지 살핀다.
  useEffect(() => {
    if (!awareness) return;
    const read = () => {
      let found: number | null = null;
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const p = (state as { presenting?: { slideIndex?: number } | null }).presenting;
        if (p && typeof p.slideIndex === "number") found = p.slideIndex;
      });
      setPresenterIndex(found);
    };
    awareness.on("change", read);
    read();
    return () => awareness.off("change", read);
  }, [awareness]);

  // --- 동작 ---------------------------------------------------------------
  const deleteSelected = useCallback(() => {
    if (!ydoc || selectedIds.length === 0 || isLocked) return;
    const objects = objectsOf(ydoc);
    ydoc.transact(() => selectedIds.forEach((id) => objects.delete(id)), origin);
    setSelectedIds([]);
  }, [ydoc, selectedIds, isLocked, origin]);

  const groupSelected = useCallback(() => {
    if (!ydoc || isLocked) return;
    groupObjects(ydoc, selectedIds, origin);
  }, [ydoc, selectedIds, isLocked, origin]);

  const ungroupSelected = useCallback(() => {
    if (!ydoc || isLocked) return;
    ungroupObjects(ydoc, selectedIds, origin);
  }, [ydoc, selectedIds, isLocked, origin]);

  const selectionHasGroup = ydoc ? hasGroupedObject(ydoc, selectedIds) : false;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      // 텍스트 상자에서 글을 치는 중이면 슬라이드 단축키를 쓰지 않는다.
      if (editingId) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoManager?.undo();
        setSelectedIds([]);
      } else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        undoManager?.redo();
        setSelectedIds([]);
      } else if (meta && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelected();
        else groupSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        deleteSelected();
      } else if (e.key === "Escape") {
        setSelectedIds([]);
        setPendingShape(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [undoManager, deleteSelected, selectedIds, editingId, groupSelected, ungroupSelected]);

  // --- 그리기 -------------------------------------------------------------
  if (!ydoc || !activeId) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm text-gray-400">
        슬라이드를 불러오는 중…
      </div>
    );
  }

  const toolButtonClass = (active: boolean) =>
    `p-2 rounded-lg border transition-colors ${
      active
        ? "bg-[#8CA5FF] border-[#8CA5FF] text-white shadow-sm"
        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
    }`;

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* 상단 도구 */}
        <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
          <span className="text-sm font-bold text-gray-800 shrink-0">공유 슬라이드</span>

          <div className="flex items-center gap-2 mx-auto">
            <button
              type="button"
              onClick={() => setPendingShape(null)}
              className={toolButtonClass(pendingShape === null)}
              title="고르기 — 물체를 선택하고 옮깁니다"
            >
              <MousePointer2 className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-gray-200" />

            {/* 텍스트 상자 */}
            <button
              type="button"
              onClick={() => setPendingShape(pendingShape === "text" ? null : "text")}
              disabled={isLocked}
              className={`${toolButtonClass(pendingShape === "text")} disabled:opacity-40 disabled:cursor-not-allowed`}
              title="텍스트 상자 — 누른 뒤 슬라이드를 클릭하세요"
            >
              <Type className="w-5 h-5" />
            </button>

            {/* 표 · 달력 · 투표 */}
            {([
              ["table", Table],
              ["calendar", Calendar],
              ["vote", Vote],
            ] as Array<[ShapeType, typeof Table]>).map(([type, Icon]) => (
              <button
                key={type}
                type="button"
                onClick={() => setPendingShape(pendingShape === type ? null : type)}
                disabled={isLocked}
                className={`${toolButtonClass(pendingShape === type)} disabled:opacity-40 disabled:cursor-not-allowed`}
                title={`${SHAPE_LABELS[type]} — 누른 뒤 슬라이드를 클릭하세요`}
              >
                <Icon className="w-5 h-5" />
              </button>
            ))}

            {/* 도형 모음 */}
            <div className="relative" ref={shapeMenuRef}>
              <button
                type="button"
                onClick={() => setIsShapeMenuOpen((v) => !v)}
                disabled={isLocked}
                className={`${toolButtonClass(
                  pendingShape !== null && pendingShape !== "text"
                )} flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed`}
                title="도형 고르기"
              >
                <Shapes className="w-5 h-5" />
                <ChevronDown className="w-3 h-3" />
              </button>

              {isShapeMenuOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-30 w-56">
                  <div className="grid grid-cols-5 gap-1">
                    {SHAPE_TOOLS.map(({ type, icon: Icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setPendingShape(pendingShape === type ? null : type);
                          setIsShapeMenuOpen(false);
                        }}
                        className={`flex items-center justify-center px-1 py-2 rounded-lg transition-colors ${
                          pendingShape === type
                            ? "bg-[#8CA5FF] text-white"
                            : "text-gray-700 hover:bg-blue-50"
                        }`}
                        title={`${SHAPE_LABELS[type]} — 누른 뒤 슬라이드를 클릭하세요`}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400 px-1 pt-2">
                    고른 뒤 슬라이드를 클릭하면 놓입니다
                  </p>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-200" />

            <button
              type="button"
              onClick={() => setPresentMode("presenter")}
              disabled={slides.length === 0}
              className="p-2 rounded-lg border border-[#8CA5FF] bg-[#8CA5FF] text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
              title="발표 시작 — 보는 사람 화면도 같이 넘어갑니다"
            >
              <Play className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-gray-200" />

            <button
              type="button"
              onClick={groupSelected}
              disabled={selectedIds.length < 2 || isLocked}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              title="선택한 것을 하나로 묶기 (Ctrl+G)"
            >
              <Group className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={ungroupSelected}
              disabled={!selectionHasGroup || isLocked}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              title="묶음 풀기 (Ctrl+Shift+G)"
            >
              <Ungroup className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selectedIds.length === 0 || isLocked}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-600 transition-colors"
              title="선택한 물체 삭제 (Delete)"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                undoManager?.undo();
                setSelectedIds([]);
              }}
              disabled={!canUndo}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              title="되돌리기 (Ctrl+Z) — 내가 한 것만"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                undoManager?.redo();
                setSelectedIds([]);
              }}
              disabled={!canRedo}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              title="다시 실행 (Ctrl+Y)"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>

          {/* 접속자 */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full ${
                presence.isConnected
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
              title={
                presence.isConnected
                  ? `지금 ${presence.connections}개의 창이 이 슬라이드를 열고 있습니다`
                  : "실시간 연결을 기다리는 중"
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  presence.isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
                }`}
              />
              {presence.isConnected ? `${presence.connections}명 접속 중` : "연결 중…"}
            </div>
            <button
              type="button"
              className="p-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
              title={myName ?? "내 프로필"}
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <SlideList
            slides={slides}
            currentId={activeId}
            onSelect={(id) => {
              setCurrentId(id);
              setSelectedIds([]);
              setEditingId(null);
            }}
            onAdd={(afterIndex) => setCurrentId(addSlide(ydoc, afterIndex, origin))}
            onRemove={(id) => removeSlide(ydoc, id, origin)}
            onMove={(from, to) => moveSlide(ydoc, from, to, origin)}
            onToggleLock={(id, locked) => setSlideLocked(ydoc, id, locked, origin)}
          />

          <SlideCanvas
            ydoc={ydoc}
            slideId={activeId}
            locked={isLocked}
            origin={origin}
            pendingShape={pendingShape}
            onShapePlaced={() => setPendingShape(null)}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            editingId={editingId}
            onEditingIdChange={setEditingId}
          />
        </div>
      </main>

      {presentMode && (
        <SlidePresentation
          ydoc={ydoc}
          slides={slides}
          startIndex={presentMode === "viewer" ? (presenterIndex ?? activeIndex) : activeIndex}
          isPresenter={presentMode === "presenter"}
          presenterIndex={presenterIndex}
          onIndexChange={(i) => {
            if (presentMode !== "presenter") return;
            const next = slides[i];
            if (next) setCurrentId(next.id);
          }}
          onExit={() => setPresentMode(null)}
        />
      )}

      {/* 남이 발표를 시작하면 알려준다 */}
      {!presentMode && presenterIndex !== null && (
        <button
          type="button"
          onClick={() => setPresentMode("viewer")}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#FF4D4D] hover:bg-red-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-lg transition-colors"
        >
          <Play className="w-4 h-4" />
          발표가 진행 중입니다 — 같이 보기
        </button>
      )}
    </div>
  );
}
