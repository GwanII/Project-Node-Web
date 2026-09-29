"use client";

import { useCallback, useEffect, useState } from "react";
import type * as Y from "yjs";

import { editRequestsOf, type EditRequest, type MyIdentity } from "./data";

/**
 * 누가 지금 문서를 고칠 수 있는지 다룬다.
 *
 * 규칙은 두 줄이다.
 *   로그인한 팀원 → 바로 고칠 수 있다.
 *   손님          → 보기만 된다. 팀장이 수락해 주면 고칠 수 있다.
 *
 * 요청은 문서(Yjs) 안에 넣기 때문에, 팀장이 수락을 누르는 순간
 * 손님 화면이 새로고침 없이 바로 풀린다.
 *
 * 이건 화면 단속이지 보안이 아니다. 브라우저에서 돌아가는 코드라 우회할 수
 * 있다. 진짜로 막으려면 Supabase 쪽 RLS 가 필요하다.
 */

export interface EditAccess {
  /** 지금 이 사람이 문서를 고칠 수 있는지 */
  canEdit: boolean;
  /** 손님인 내가 보낸 요청. 안 보냈으면 null. */
  myRequest: EditRequest | null;
  /** 팀장에게만 쓰이는, 아직 수락되지 않은 요청 목록 */
  pending: EditRequest[];
  /** 손님이 팀장에게 편집을 요청한다. */
  requestEdit: () => void;
  /** 팀장이 요청을 수락한다. */
  approve: (name: string) => void;
  /** 팀장이 요청을 물린다. 이미 수락한 것도 다시 막을 수 있다. */
  reject: (name: string) => void;
}

export function useEditAccess(
  ydoc: Y.Doc | null,
  me: MyIdentity | null,
  /** 내가 낸 변경임을 표시하는 딱지. 되돌리기가 이 요청까지 되돌리지 않게 한다. */
  origin: object
): EditAccess {
  /*
   * 이 값 자체는 쓰지 않는다. 요청이 바뀌었을 때 화면을 다시 그리게 하는
   * 방아쇠일 뿐이다. 실제 내용은 아래에서 그릴 때마다 Yjs 에서 새로 읽는다.
   */
  const [, bump] = useState(0);

  useEffect(() => {
    if (!ydoc) return;
    const requests = editRequestsOf(ydoc);
    const onChange = () => bump((v) => v + 1);
    requests.observe(onChange);
    return () => requests.unobserve(onChange);
  }, [ydoc]);

  // 그릴 때마다 Yjs 에서 바로 읽는다. 따로 복사해 두지 않으니 낡을 일이 없다.
  const all = ydoc ? [...editRequestsOf(ydoc).values()] : [];
  const myRequest = me ? (all.find((r) => r.name === me.name) ?? null) : null;
  const pending = all.filter((r) => !r.approvedBy);

  const requestEdit = useCallback(() => {
    if (!ydoc || !me) return;
    const requests = editRequestsOf(ydoc);
    // 이미 보냈으면 다시 보내지 않는다. 수락 표시를 지워 버리면 안 된다.
    if (requests.get(me.name)) return;
    ydoc.transact(() => {
      requests.set(me.name, { name: me.name, at: new Date().toISOString() });
    }, origin);
  }, [ydoc, me, origin]);

  const approve = useCallback(
    (name: string) => {
      if (!ydoc || !me?.isLeader) return;
      const requests = editRequestsOf(ydoc);
      const found = requests.get(name);
      if (!found) return;
      ydoc.transact(() => {
        requests.set(name, { ...found, approvedBy: me.name });
      }, origin);
    },
    [ydoc, me, origin]
  );

  const reject = useCallback(
    (name: string) => {
      if (!ydoc || !me?.isLeader) return;
      const requests = editRequestsOf(ydoc);
      ydoc.transact(() => {
        requests.delete(name);
      }, origin);
    },
    [ydoc, me, origin]
  );

  /*
   * 아직 로그인 확인이 끝나지 않았으면(me 가 null) 고칠 수 없는 쪽으로 둔다.
   * 반대로 두면 확인이 끝나기 전 잠깐 손님이 고칠 수 있게 열려 버린다.
   */
  const canEdit = me
    ? me.isLoggedIn || myRequest?.approvedBy != null
    : false;

  return { canEdit, myRequest, pending, requestEdit, approve, reject };
}
