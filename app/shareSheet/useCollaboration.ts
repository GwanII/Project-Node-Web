"use client";

import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

import { loadYDocState, saveYDocState } from "./data";
import { SupabaseYjsProvider, type ProviderStatus } from "./SupabaseYjsProvider";

/**
 * 동시 편집에 필요한 것을 준비한다.
 *
 *  1. 빈 Yjs 문서를 만들고
 *  2. 데이터베이스에 저장돼 있던 편집 상태를 얹은 다음
 *  3. Supabase 통로에 연결해서 다른 사람과 주고받게 한다.
 *
 * 연결이 안 되더라도 문서 자체는 바로 쓸 수 있게 만든다.
 * 인터넷이 끊겼다고 글을 못 쓰면 안 되기 때문이다.
 */

/** 편집이 멈춘 뒤 이만큼 기다렸다가 저장한다. */
const PERSIST_DELAY_MS = 2000;

export interface CollaborationState {
  ydoc: Y.Doc | null;
  provider: SupabaseYjsProvider | null;
  status: ProviderStatus;
  /** 다른 사람과 첫 맞춤이 끝났는지. 이게 끝나야 초기 내용을 넣어도 안전하다. */
  isSynced: boolean;
}

export function useCollaboration(
  documentId: string,
  enabled: boolean
): CollaborationState {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<SupabaseYjsProvider | null>(null);
  const [status, setStatus] = useState<ProviderStatus>("connecting");
  const [isSynced, setIsSynced] = useState(false);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const doc = new Y.Doc();
    let createdProvider: SupabaseYjsProvider | null = null;

    const start = async () => {
      // 저장돼 있던 편집 상태를 먼저 얹는다.
      const saved = await loadYDocState(documentId);
      if (cancelled) {
        doc.destroy();
        return;
      }
      if (saved) {
        try {
          Y.applyUpdate(doc, saved);
        } catch {
          console.error("[shareSheet] 저장된 편집 상태를 적용하지 못했습니다.");
        }
      }

      createdProvider = new SupabaseYjsProvider(documentId, doc, {
        onStatus: (next) => {
          if (!cancelled) setStatus(next);
        },
        onSynced: () => {
          if (!cancelled) setIsSynced(true);
        },
      });

      // 편집이 멈추면 잠시 뒤 통째로 저장한다.
      const schedulePersist = () => {
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
          persistTimerRef.current = null;
          void saveYDocState(documentId, Y.encodeStateAsUpdate(doc));
        }, PERSIST_DELAY_MS);
      };
      doc.on("update", schedulePersist);

      if (cancelled) {
        createdProvider.destroy();
        doc.destroy();
        return;
      }

      setYdoc(doc);
      setProvider(createdProvider);
    };

    void start();

    return () => {
      cancelled = true;
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
        // 떠나기 전에 마지막 상태를 남긴다.
        void saveYDocState(documentId, Y.encodeStateAsUpdate(doc));
      }
      createdProvider?.destroy();
      doc.destroy();
      setYdoc(null);
      setProvider(null);
      setIsSynced(false);
    };
  }, [documentId, enabled]);

  return { ydoc, provider, status, isSynced };
}
