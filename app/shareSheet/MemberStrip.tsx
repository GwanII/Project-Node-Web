"use client";

import React from "react";
import { User } from "lucide-react";

/**
 * 접속자 동그라미 줄.
 *
 * 시트지와 슬라이드가 같이 쓴다. 팀원 명단을 항상 보여 주고,
 * 그중 지금 들어와 있는 사람에게만 초록 테두리가 들어온다.
 */

export interface Member {
  id: number;
  name: string;
  /** 지금 이 문서를 보고 있는 사람이면 초록 테두리가 들어온다. */
  isActive: boolean;
}

interface MemberStripProps {
  members: Member[];
  /** 지금 열려 있는 창 수. 한 사람이 두 창을 열면 2가 된다. */
  connections: number;
  /** 실시간 신호가 연결됐는지. 끊겨 있으면 접속자 정보가 낡은 값이다. */
  isConnected: boolean;
  /** "이 문서" / "이 슬라이드" 처럼 안내 문구에 들어갈 말 */
  what: string;
  /** 좁은 화면에서는 이름을 빼고 동그라미만 보여 준다. */
  showNames?: boolean;
  /**
   * 동그라미를 최대 몇 개까지 보여 줄지.
   * 넘으면 접속 중인 사람을 앞세우고 나머지는 "+N" 으로 접는다.
   * 슬라이드 머리띠처럼 자리가 빠듯한 곳에서 쓴다. 안 주면 전부 보여 준다.
   */
  max?: number;
  /**
   * "N명 접속 중" 글자를 보여 줄지.
   * 끄면 점 하나만 남는다. 동그라미 초록 테두리가 같은 걸 알려주므로
   * 자리가 빠듯한 슬라이드 머리띠에서는 글자를 뺀다.
   */
  showCount?: boolean;
}

export default function MemberStrip({
  members,
  connections,
  isConnected,
  what,
  showNames = true,
  max,
  showCount = true,
}: MemberStripProps) {
  /*
   * 접을 때는 지금 들어와 있는 사람을 먼저 보여 준다.
   * 자리가 모자라서 정작 접속 중인 사람이 가려지면 의미가 없다.
   */
  const ordered =
    max == null
      ? members
      : [...members].sort((a, b) => Number(b.isActive) - Number(a.isActive));
  const shown = max == null ? ordered : ordered.slice(0, max);
  const hidden = ordered.slice(shown.length);

  return (
    <>
      <div
        className={`flex items-center gap-1.5 text-[11px] font-bold rounded-full shrink-0 ${
          showCount ? "px-2 py-1" : "p-1"
        } ${isConnected ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}
        title={
          isConnected
            ? `지금 ${connections}개의 창이 ${what}를 열고 있습니다`
            : "실시간 연결을 기다리는 중"
        }
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"
          }`}
        />
        {showCount && (isConnected ? `${connections}명 접속 중` : "연결 중…")}
      </div>

      {shown.map((member) => (
        <div key={member.id} className="flex flex-col items-center gap-0.5 shrink-0">
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
          {showNames && (
            <span className="text-[10px] font-semibold text-gray-600 leading-none">
              {member.name}
            </span>
          )}
        </div>
      ))}

      {hidden.length > 0 && (
        <div
          className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0"
          title={hidden.map((m) => m.name).join(", ")}
        >
          +{hidden.length}
        </div>
      )}
    </>
  );
}
