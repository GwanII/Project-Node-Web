"use client";

import React from "react";
import { BringToFront, SendToBack } from "lucide-react";

/**
 * 물체를 골랐을 때 머리띠 아래에 뜨는 서식 띠.
 *
 * 색과 겹침 순서를 여기서 바꾼다. 위쪽 도구 머리띠에 넣지 않은 이유는
 * 거기가 이미 1280 짜리 화면에서 꽉 차 있어서다. 한 줄을 더 쓰면
 * 자리 걱정 없이 넣을 수 있고, 고른 게 없을 때는 아예 사라진다.
 */

/** 채우기에 쓸 색. 프로젝트에서 쓰는 색을 먼저 두고 무채색을 뒤에 뒀다. */
const FILL_COLORS = [
  "#DDE5FF",
  "#8CA5FF",
  "#4457B4",
  "#FFD9D9",
  "#FF4D4D",
  "#D7F5DD",
  "#22C55E",
  "#FFF0C7",
  "#F59E0B",
  "#EDE4FF",
  "#7C3AED",
  "#FFFFFF",
  "#9CA3AF",
  "#111827",
];

/** 테두리에 쓸 색. 채우기보다 진한 쪽만 모았다. */
const STROKE_COLORS = [
  "#4457B4",
  "#8CA5FF",
  "#FF4D4D",
  "#22C55E",
  "#F59E0B",
  "#7C3AED",
  "#111827",
  "#9CA3AF",
];

interface SelectionBarProps {
  /** 고른 물체 수. 0 이면 띠를 그리지 않는다. */
  count: number;
  onFill: (color: string) => void;
  onStroke: (color: string) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

function Swatch({
  color,
  onPick,
  label,
}: {
  color: string;
  onPick: (color: string) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(color)}
      className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform shrink-0"
      style={{ backgroundColor: color }}
      title={`${label} ${color}`}
    />
  );
}

export default function SelectionBar({
  count,
  onFill,
  onStroke,
  onBringToFront,
  onSendToBack,
}: SelectionBarProps) {
  if (count === 0) return null;

  const buttonClass =
    "flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shrink-0";

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-[#F7F9FF] border-b border-[#C7D4FF] overflow-x-auto">
      <span className="text-[11px] font-bold text-[#4457B4] shrink-0">
        {count}개 선택
      </span>

      <div className="w-px h-5 bg-[#C7D4FF] shrink-0" />

      <span className="text-[11px] font-semibold text-gray-500 shrink-0">채우기</span>
      {FILL_COLORS.map((color) => (
        <Swatch key={color} color={color} onPick={onFill} label="채우기" />
      ))}

      <div className="w-px h-5 bg-[#C7D4FF] shrink-0" />

      <span className="text-[11px] font-semibold text-gray-500 shrink-0">테두리</span>
      {STROKE_COLORS.map((color) => (
        <Swatch key={color} color={color} onPick={onStroke} label="테두리" />
      ))}

      <div className="w-px h-5 bg-[#C7D4FF] shrink-0" />

      <button type="button" onClick={onBringToFront} className={buttonClass} title="맨 앞으로">
        <BringToFront className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold">맨 앞으로</span>
      </button>
      <button type="button" onClick={onSendToBack} className={buttonClass} title="맨 뒤로">
        <SendToBack className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold">맨 뒤로</span>
      </button>
    </div>
  );
}
