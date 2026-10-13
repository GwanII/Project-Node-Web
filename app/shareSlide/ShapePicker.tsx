"use client";

import React from "react";

import { SHAPES_BY_CATEGORY, type ShapeDef } from "./shapes";

/**
 * 도형 고르는 패널.
 *
 * 도형이 60개 가까이 되어서 한 줄 드롭다운으로는 담기지 않는다.
 * 파워포인트처럼 분류별로 묶어 격자에 늘어놓는다.
 *
 * 칸에 들어가는 그림은 따로 만든 아이콘이 아니라 shapes.ts 의 좌표를 그대로
 * 작게 그린 것이다. 그래서 고를 때 보이는 모양과 실제로 놓이는 모양이 항상 같고,
 * 도형을 추가해도 아이콘을 따로 그릴 필요가 없다.
 */

/** 칸 안에 들어가는 작은 미리보기 */
function ShapeThumb({ def }: { def: ShapeDef }) {
  if (def.render === "line") {
    return (
      <svg viewBox="0 0 100 100" className="w-5 h-5">
        <line
          x1="12"
          y1="88"
          x2="88"
          y2="12"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {def.name === "arrow" && (
          <polygon points="88,12 62,18 82,38" fill="currentColor" />
        )}
      </svg>
    );
  }

  if (def.render === "css") {
    return (
      <span
        className="w-4 h-4 border-2 border-current"
        style={{
          borderRadius:
            def.name === "ellipse" ? "50%" : def.name === "roundRect" ? "5px" : "2px",
          backgroundColor: "currentColor",
          opacity: 0.85,
        }}
      />
    );
  }

  const shape =
    def.render === "polygon" ? (
      <polygon points={def.points} fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={6} strokeLinejoin="round" />
    ) : (
      <path d={def.path} fill="currentColor" fillOpacity={0.3} stroke="currentColor" strokeWidth={6} strokeLinejoin="round" />
    );

  return (
    <svg viewBox="0 0 100 100" className="w-5 h-5">
      {shape}
      {def.detail && (
        <path
          d={def.detail}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

interface ShapePickerProps {
  /** 지금 고른 도형. 고른 게 없으면 null. */
  selected: string | null;
  onPick: (name: string) => void;
}

export default function ShapePicker({ selected, onPick }: ShapePickerProps) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-30 w-64">
      <div className="max-h-80 overflow-y-auto pr-1">
        {SHAPES_BY_CATEGORY.map(({ category, label, shapes }) => (
          <div key={category} className="mb-2 last:mb-0">
            <p className="text-[11px] font-bold text-gray-400 px-1 pb-1">{label}</p>
            <div className="grid grid-cols-6 gap-0.5">
              {shapes.map((def) => (
                <button
                  key={def.name}
                  type="button"
                  onClick={() => onPick(def.name)}
                  className={`flex items-center justify-center h-8 rounded-lg transition-colors ${
                    selected === def.name
                      ? "bg-[#8CA5FF] text-white"
                      : "text-gray-600 hover:bg-blue-50 hover:text-[#4457B4]"
                  }`}
                  title={`${def.label} — 누른 뒤 슬라이드를 클릭하세요`}
                >
                  <ShapeThumb def={def} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 px-1 pt-2 border-t border-gray-100 mt-1">
        고른 뒤 슬라이드를 클릭하면 놓입니다
      </p>
    </div>
  );
}
