"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";

import Sidebar from "./Sidebar";
import Toolbar, { type EditorMode, type Member, type SaveState } from "./Toolbar";
import Editor, { type EditorHandle } from "./Editor";
import DrawingLayer from "./DrawingLayer";
import {
  loadDocument,
  saveDocument,
  type SheetDocument,
  type Stroke,
} from "./data";

// 1단계에서는 고정 목록을 쓴다. 실제 접속 감지(Supabase Realtime Presence)는 나중 단계에서 붙인다.
const MEMBERS: Member[] = [
  { id: 1, name: "박성빈", isActive: true },
  { id: 2, name: "박기완", isActive: false },
  { id: 3, name: "한주현", isActive: true },
  { id: 4, name: "권소희", isActive: false },
  { id: 5, name: "박서연", isActive: false },
];

// 지금은 문서가 하나뿐이다. 나중에 여러 문서를 다루게 되면 주소에서 받아온다.
const DOCUMENT_ID = "default-sheet";

/** 타이핑할 때마다 저장하면 낭비라서, 잠깐 멈췄을 때 한 번만 저장한다. */
const SAVE_DELAY_MS = 700;

export default function ShareSheetPage() {
  const [mode, setMode] = useState<EditorMode>("typing");
  const [doc, setDoc] = useState<SheetDocument | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");

  const editorRef = useRef<EditorHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 최신 문서를 항상 들고 있어야 여러 곳에서 들어오는 수정을 안 놓친다.
  const docRef = useRef<SheetDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 불러오기 ---------------------------------------------------------
  useEffect(() => {
    let alive = true;
    loadDocument(DOCUMENT_ID).then((loaded) => {
      if (!alive) return;
      docRef.current = loaded;
      setDoc(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  // --- 저장 -------------------------------------------------------------
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const current = docRef.current;
    if (!current) return;

    const saved = await saveDocument(current);
    docRef.current = saved;
    setDoc(saved);
    setSaveState("saved");
  }, []);

  /** 문서의 일부만 바꾸고, 잠시 뒤 저장을 예약한다. */
  const update = useCallback(
    (patch: Partial<SheetDocument>) => {
      const prev = docRef.current;
      if (!prev) return;

      const next = { ...prev, ...patch };
      docRef.current = next;
      setDoc(next);
      setSaveState("saving");

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void flushSave();
      }, SAVE_DELAY_MS);
    },
    [flushSave]
  );

  // 페이지를 떠날 때 아직 저장 안 된 게 있으면 마저 저장한다.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimerRef.current && docRef.current) {
        clearTimeout(saveTimerRef.current);
        void saveDocument(docRef.current);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  // --- 각 화면에서 올라오는 변경 -----------------------------------------
  const handleContentChange = useCallback(
    (html: string) => update({ content: html }),
    [update]
  );

  const handleStrokesChange = useCallback(
    (strokes: Stroke[]) => update({ strokes }),
    [update]
  );

  const handleToggleLock = useCallback(() => {
    update({ isLocked: !docRef.current?.isLocked });
  }, [update]);

  // --- 그리기 -----------------------------------------------------------
  if (!doc) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm text-gray-400">
        문서를 불러오는 중…
      </div>
    );
  }

  const isDrawing = mode === "drawing" && !doc.isLocked;

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Toolbar
          title={doc.title}
          mode={mode}
          onModeChange={setMode}
          isLocked={doc.isLocked}
          onToggleLock={handleToggleLock}
          members={MEMBERS}
          onInsertImage={() => editorRef.current?.insertImage()}
          onInsertTable={() => editorRef.current?.insertTable()}
          onInsertVote={() => editorRef.current?.insertVote()}
          onInsertCalendar={() => editorRef.current?.insertCalendar()}
          saveState={saveState}
          updatedAt={doc.updatedAt}
        />

        {doc.isLocked && (
          <div className="flex items-center justify-center gap-2 bg-red-50 border-b border-red-200 text-red-700 text-xs font-bold py-2">
            <Lock className="w-3.5 h-3.5" />
            <span>잠금 상태입니다. 자물쇠를 다시 누르면 편집할 수 있습니다.</span>
          </div>
        )}

        {/*
          바깥 상자는 크기가 내용과 무관하게 정해지고 overflow-hidden 이다.
          드로잉 캔버스를 스크롤 영역 "밖"에 두어야 캔버스가 스크롤바를 만들지 않는다.
          (안에 두었더니 캔버스 → 스크롤바 → 크기변화 → 캔버스 무한루프로 화면이 떨렸다.)
        */}
        <div className="flex-1 relative overflow-hidden">
          <div ref={scrollRef} className="absolute inset-0 overflow-y-auto bg-gray-50">
            <div className="min-h-full bg-white">
              <Editor
                ref={editorRef}
                isLocked={doc.isLocked}
                mode={mode}
                initialContent={doc.content}
                onChange={handleContentChange}
                scrollRef={scrollRef}
              />
            </div>
          </div>

          <DrawingLayer
            isActive={isDrawing}
            scrollRef={scrollRef}
            initialStrokes={doc.strokes}
            onStrokesChange={handleStrokesChange}
          />
        </div>
      </main>
    </div>
  );
}
