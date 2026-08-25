"use client";

import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/src/lib/supabase";
import { createId } from "./data";

/**
 * Yjs 문서를 Supabase Realtime 으로 실시간 동기화한다.
 *
 * 보통 동시 편집에는 전용 서버(y-websocket)를 따로 띄우지만,
 * 여기서는 접속자 표시에 이미 쓰고 있는 Supabase 통로를 그대로 쓴다.
 * 서버를 하나 더 운영할 필요가 없다.
 *
 * 주고받는 신호는 네 가지뿐이다.
 *   sync-request  새로 들어왔으니 지금까지의 내용을 달라
 *   sync-state    (요청한 사람에게) 지금까지의 내용 전부
 *   update        방금 내가 고친 부분만
 *   awareness     내 커서 위치와 이름
 *
 * Yjs 의 변경분은 순서가 바뀌어 도착하거나 같은 게 두 번 와도 결과가 같다.
 * 그래서 도착 순서를 맞추거나 중복을 걸러낼 필요가 없다.
 */

export type ProviderStatus = "connecting" | "connected" | "disconnected";

interface ProviderOptions {
  onStatus?: (status: ProviderStatus) => void;
  /** 처음 동기화가 끝났을 때 한 번 불린다. */
  onSynced?: () => void;
}

type Message =
  | { type: "sync-request"; from: string }
  | { type: "sync-state"; from: string; to: string; data: string }
  | { type: "update"; from: string; data: string }
  | { type: "awareness"; from: string; data: string };

// ---------------------------------------------------------------------------
// 바이트 ↔ 문자열 변환
// Realtime 은 문자열만 실어 나르므로 바이트를 base64 로 감싼다.
// ---------------------------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000; // 한 번에 너무 많이 넘기면 스택이 넘친다.
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------------------------------------

export class SupabaseYjsProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;

  /** 이 창을 구분하는 값. 내가 보낸 신호를 내가 다시 처리하지 않으려고 쓴다. */
  private readonly clientId = createId();
  private readonly channel: RealtimeChannel;
  private readonly options: ProviderOptions;
  private isDestroyed = false;
  private hasSynced = false;

  constructor(documentId: string, doc: Y.Doc, options: ProviderOptions = {}) {
    this.doc = doc;
    this.awareness = new Awareness(doc);
    this.options = options;

    this.channel = supabase.channel(`yjs:${documentId}`, {
      // 내가 보낸 것을 나에게 되돌려 받지 않는다.
      config: { broadcast: { self: false } },
    });

    this.doc.on("update", this.handleLocalUpdate);
    this.awareness.on("update", this.handleAwarenessUpdate);

    this.channel
      .on("broadcast", { event: "yjs" }, ({ payload }) =>
        this.handleMessage(payload as Message)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.options.onStatus?.("connected");
          // 이미 편집 중인 사람이 있으면 지금까지의 내용을 보내줄 것이다.
          this.send({ type: "sync-request", from: this.clientId });
          // 아무도 없으면 응답이 오지 않으므로, 잠시 뒤 혼자 시작한 것으로 본다.
          setTimeout(() => this.markSynced(), 1200);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.options.onStatus?.("disconnected");
        }
      });

    this.options.onStatus?.("connecting");
  }

  // --- 보내기 -------------------------------------------------------------

  private send(message: Message) {
    if (this.isDestroyed) return;
    void this.channel.send({ type: "broadcast", event: "yjs", payload: message });
  }

  /**
   * 내가 문서를 고쳤을 때.
   * origin 이 this 인 것은 남이 보낸 걸 내가 적용한 경우라, 되돌려 보내지 않는다.
   */
  private handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this) return;
    this.send({ type: "update", from: this.clientId, data: toBase64(update) });
  };

  private handleAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    if (origin === this) return;
    const ids = [...changes.added, ...changes.updated, ...changes.removed];
    if (ids.length === 0) return;
    this.send({
      type: "awareness",
      from: this.clientId,
      data: toBase64(encodeAwarenessUpdate(this.awareness, ids)),
    });
  };

  // --- 받기 ---------------------------------------------------------------

  private handleMessage(message: Message) {
    if (this.isDestroyed || message.from === this.clientId) return;

    switch (message.type) {
      case "sync-request":
        // 내가 가진 내용을 통째로 넘겨준다.
        this.send({
          type: "sync-state",
          from: this.clientId,
          to: message.from,
          data: toBase64(Y.encodeStateAsUpdate(this.doc)),
        });
        // 새로 온 사람에게 내 커서도 알린다.
        this.send({
          type: "awareness",
          from: this.clientId,
          data: toBase64(
            encodeAwarenessUpdate(this.awareness, [this.doc.clientID])
          ),
        });
        break;

      case "sync-state":
        if (message.to !== this.clientId) return;
        Y.applyUpdate(this.doc, fromBase64(message.data), this);
        this.markSynced();
        break;

      case "update":
        Y.applyUpdate(this.doc, fromBase64(message.data), this);
        break;

      case "awareness":
        applyAwarenessUpdate(this.awareness, fromBase64(message.data), this);
        break;
    }
  }

  private markSynced() {
    if (this.hasSynced || this.isDestroyed) return;
    this.hasSynced = true;
    this.options.onSynced?.();
  }

  // --- 정리 ---------------------------------------------------------------

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    this.doc.off("update", this.handleLocalUpdate);
    this.awareness.off("update", this.handleAwarenessUpdate);
    // 내 커서를 남들 화면에서 지운다.
    removeAwarenessStates(this.awareness, [this.doc.clientID], "provider destroyed");
    this.awareness.destroy();
    void supabase.removeChannel(this.channel);
    this.options.onStatus?.("disconnected");
  }
}
