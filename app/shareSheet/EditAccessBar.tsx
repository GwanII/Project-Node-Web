"use client";

import React from "react";
import { Eye, Check, X, Hourglass } from "lucide-react";

import { TEAM_LEADER, type MyIdentity } from "./data";
import type { EditAccess } from "./useEditAccess";

/**
 * 편집 권한 안내 띠.
 *
 * 시트지와 슬라이드가 같이 쓴다. 상황에 따라 셋 중 하나만 보인다.
 *   손님        → "보기 전용입니다" + 편집 요청 버튼
 *   기다리는 중  → "팀장 수락을 기다리는 중"
 *   팀장        → 들어온 요청 목록 + 수락·거절
 * 해당하는 게 없으면 아무것도 그리지 않는다.
 */

interface EditAccessBarProps {
  me: MyIdentity | null;
  access: EditAccess;
  /** "슬라이드" 처럼 안내 문구에 들어갈 이름 */
  what: string;
}

export default function EditAccessBar({ me, access, what }: EditAccessBarProps) {
  // 로그인 확인이 끝나기 전에는 아무것도 보여주지 않는다. 깜빡여서 눈에 거슬린다.
  if (!me) return null;

  // --- 팀장: 들어온 요청 처리 -------------------------------------------
  if (me.isLeader && access.pending.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 bg-[#EEF2FF] border-b border-[#C7D4FF] px-4 py-2 text-xs">
        <span className="font-bold text-[#4457B4]">편집 요청</span>
        {access.pending.map((request) => (
          <span
            key={request.name}
            className="flex items-center gap-1.5 bg-white border border-[#C7D4FF] rounded-full pl-2.5 pr-1 py-1"
          >
            <span className="font-bold text-gray-700">{request.name}</span>
            <button
              type="button"
              onClick={() => access.approve(request.name)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
              title={`${request.name} 님이 고칠 수 있게 합니다`}
            >
              <Check className="w-3 h-3" />
              수락
            </button>
            <button
              type="button"
              onClick={() => access.reject(request.name)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-bold hover:bg-gray-300 transition-colors"
              title={`${request.name} 님의 요청을 지웁니다`}
            >
              <X className="w-3 h-3" />
              거절
            </button>
          </span>
        ))}
      </div>
    );
  }

  // 여기부터는 고칠 수 없는 사람에게만 보여준다.
  if (access.canEdit) return null;

  // --- 손님: 수락을 기다리는 중 -----------------------------------------
  if (access.myRequest) {
    return (
      <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-bold py-2">
        <Hourglass className="w-3.5 h-3.5" />
        <span>
          편집 요청을 보냈습니다. {TEAM_LEADER} 님이 수락하면 바로 고칠 수 있습니다.
        </span>
      </div>
    );
  }

  // --- 손님: 보기 전용 ---------------------------------------------------
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-gray-100 border-b border-gray-300 text-xs py-2 px-4">
      <Eye className="w-3.5 h-3.5 text-gray-500" />
      <span className="font-bold text-gray-700">
        보기 전용입니다. 로그인하면 바로 고칠 수 있습니다.
      </span>
      <a
        href="/login"
        className="px-2.5 py-1 rounded-full bg-[#8CA5FF] text-white font-bold hover:bg-[#7B95FF] transition-colors"
      >
        로그인
      </a>
      <span className="text-gray-400">또는</span>
      <button
        type="button"
        onClick={access.requestEdit}
        className="px-2.5 py-1 rounded-full border border-[#8CA5FF] text-[#4457B4] font-bold hover:bg-[#EEF2FF] transition-colors"
        title={`${TEAM_LEADER} 님에게 이 ${what}를 고칠 수 있게 해 달라고 요청합니다`}
      >
        편집 요청
      </button>
    </div>
  );
}
