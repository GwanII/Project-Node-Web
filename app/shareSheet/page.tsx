"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

import Sidebar from "./Sidebar";
import Toolbar, { type EditorMode, type Member, type SaveState } from "./Toolbar";
import Editor, { type EditorHandle } from "./Editor";
import DrawingLayer from "./DrawingLayer";
import EditAccessBar from "./EditAccessBar";
import ProjectPicker from "./ProjectPicker";
import {
  buildMembers,
  getMyIdentity,
  sheetDocId,
  loadDocument,
  saveDocument,
  type MyIdentity,
  type SheetDocument,
} from "./data";
import { usePresence } from "./usePresence";
import { useCollaboration } from "./useCollaboration";
import { useEditAccess } from "./useEditAccess";

/** 타이핑할 때마다 저장하면 낭비라서, 잠깐 멈췄을 때 한 번만 저장한다. */
const SAVE_DELAY_MS = 700;

/**
 * 주소의 ?project= 를 읽으려면 useSearchParams 가 필요한데,
 * 그건 Suspense 로 감싸지 않으면 프로덕션 빌드가 실패한다.
 * (개발 모드에서는 멀쩡해 보여서 놓치기 쉽다 — 팀의 /login 도 같은 방식이다.)
 */
export default function ShareSheetPage() {
  return (
    <Suspense fallback={null}>
      <ShareSheetInner />
    </Suspense>
  );
}

function ShareSheetInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");
  // 프로젝트가 정해져야 어느 문서를 열지 알 수 있다.
  const documentId = sheetDocId(projectId);

  const [mode, setMode] = useState<EditorMode>("typing");
  const [doc, setDoc] = useState<SheetDocument | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");

  const editorRef = useRef<EditorHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 누가 지금 이 문서를 보고 있나 -------------------------------------
  // 아직 확인 중이면 null 이다. 그래서 버튼이 깜빡이지 않는다.
  const [me, setMe] = useState<MyIdentity | null>(null);
  useEffect(() => {
    let alive = true;
    getMyIdentity().then((found) => {
      if (alive) setMe(found);
    });
    return () => {
      alive = false;
    };
  }, []);

  const myName = me?.name ?? null;

  const presence = usePresence(documentId, myName);

  // 동시 편집 준비. 내 이름을 알아낸 뒤에 시작한다.
  const collab = useCollaboration(documentId, myName !== null);

  /** 내가 낸 변경임을 표시하는 딱지. 편집 요청이 되돌리기에 휩쓸리지 않게 한다. */
  const accessOrigin = useMemo(() => ({}), []);

  // 손님은 보기만 된다. 팀장이 수락하면 고칠 수 있다.
  const access = useEditAccess(collab.ydoc, me, accessOrigin);

  // 자물쇠로 잠갔거나 편집 권한이 없으면 고칠 수 없다.
  const canEdit = access.canEdit && !(doc?.isLocked ?? true);

  // 명단에 없는 사람(로그인 계정 등)도 접속하면 뒤에 붙여서 보여준다.
  const members: Member[] = useMemo(
    () => buildMembers(presence.names),
    [presence.names]
  );

  // 최신 문서를 항상 들고 있어야 여러 곳에서 들어오는 수정을 안 놓친다.
  const docRef = useRef<SheetDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 불러오기 ---------------------------------------------------------
  useEffect(() => {
    let alive = true;
    loadDocument(documentId, projectId).then((loaded) => {
      if (!alive) return;
      docRef.current = loaded;
      setDoc(loaded);
    });
    return () => {
      alive = false;
    };
  }, [documentId, projectId]);

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

  const handleToggleLock = useCallback(() => {
    update({ isLocked: !docRef.current?.isLocked });
  }, [update]);

  // --- 그리기 -----------------------------------------------------------
  /*
   * 프로젝트를 안 고르고 들어오면 어느 문서를 열어야 할지 알 수 없다.
   * 프로젝트 화면에서 링크를 타고 오는 게 본래 흐름이지만, 아직 그 링크가
   * 없어서 여기서 고를 수 있게 한다.
   */
  if (!projectId) {
    return (
      <ProjectPicker what="시트지" hrefFor={(id) => `/shareSheet?project=${id}`} />
    );
  }

  if (!doc) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm text-gray-400">
        문서를 불러오는 중…
      </div>
    );
  }

  const isDrawing = mode === "drawing" && canEdit;

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
          members={members}
          connections={presence.connections}
          isPresenceConnected={presence.isConnected}
          onInsertImage={() => editorRef.current?.insertImage()}
          onInsertTable={() => editorRef.current?.insertTable()}
          onInsertVote={() => editorRef.current?.insertVote()}
          onInsertCalendar={() => editorRef.current?.insertCalendar()}
          saveState={saveState}
          updatedAt={doc.updatedAt}
          myName={myName}
          isLoggedIn={me ? me.isLoggedIn : null}
          canEdit={canEdit}
          hasEditRight={access.canEdit}
        />

        <EditAccessBar me={me} access={access} what="시트지" />

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
              {collab.ydoc && collab.provider && myName ? (
                <Editor
                  ref={editorRef}
                  // 자물쇠든 권한 없음이든, 못 고치는 건 똑같다.
                  isLocked={!canEdit}
                  mode={mode}
                  initialContent={doc.content}
                  onChange={handleContentChange}
                  scrollRef={scrollRef}
                  ydoc={collab.ydoc}
                  provider={collab.provider}
                  isSynced={collab.isSynced}
                  myName={myName}
                />
              ) : (
                <div className="max-w-4xl mx-auto px-10 py-8 text-sm text-gray-400">
                  편집기를 준비하는 중…
                </div>
              )}
            </div>
          </div>

          {collab.ydoc && collab.provider && (
            <DrawingLayer
              isActive={isDrawing}
              scrollRef={scrollRef}
              ydoc={collab.ydoc}
              awareness={collab.provider.awareness}
              legacyStrokes={doc.strokes}
            />
          )}
        </div>
      </main>
    </div>
  );
}
