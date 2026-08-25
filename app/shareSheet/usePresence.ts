"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import { createId } from "./data";

/**
 * 지금 이 문서를 같이 보고 있는 사람을 실시간으로 알아낸다.
 *
 * Supabase Realtime 의 Presence 기능을 쓴다. 테이블을 쓰지 않고
 * 접속한 브라우저끼리 직접 신호를 주고받는 방식이라, 창을 닫으면
 * 자동으로 목록에서 빠진다. 저장할 것도 지울 것도 없다.
 */

export interface PresenceState {
  /** 지금 보고 있는 사람 이름 목록 (중복 제거됨) */
  names: string[];
  /** 열려 있는 창 수. 한 사람이 두 창을 열면 2가 된다. */
  connections: number;
  /** 신호 연결에 성공했는지 */
  isConnected: boolean;
}

export function usePresence(
  documentId: string,
  myName: string | null
): PresenceState {
  const [state, setState] = useState<PresenceState>({
    names: [],
    connections: 0,
    isConnected: false,
  });

  useEffect(() => {
    // 내 이름을 아직 못 가져왔으면 기다린다.
    if (!myName) return;

    /*
     * 창마다 다른 열쇠를 쓴다.
     * 이름을 열쇠로 쓰면 같은 사람이 두 창을 열었을 때 하나로 합쳐져서
     * "몇 개의 창이 열려 있는지" 를 셀 수 없다.
     */
    const tabKey = createId();
    const channel = supabase.channel(`shareSheet:${documentId}`, {
      config: { presence: { key: tabKey } },
    });

    const readState = () => {
      const raw = channel.presenceState<{ name?: string }>();
      const names = new Set<string>();
      let connections = 0;

      Object.values(raw).forEach((entries) => {
        entries.forEach((entry) => {
          if (entry.name) names.add(entry.name);
          connections += 1;
        });
      });

      setState({ names: [...names], connections, isConnected: true });
    };

    channel
      .on("presence", { event: "sync" }, readState)
      .on("presence", { event: "join" }, readState)
      .on("presence", { event: "leave" }, readState)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // 연결되고 나서야 내 존재를 알릴 수 있다.
          void channel.track({ name: myName });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [documentId, myName]);

  return state;
}
