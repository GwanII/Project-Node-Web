"use client";

import React, { useState } from "react";
import { Plus, Trash2, Lock, Unlock, GripVertical } from "lucide-react";

import type { Slide } from "./slideData";

interface SlideListProps {
  slides: Slide[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onAdd: (afterIndex: number) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onToggleLock: (id: string, locked: boolean) => void;
}

export default function SlideList({
  slides,
  currentId,
  onSelect,
  onAdd,
  onRemove,
  onMove,
  onToggleLock,
}: SlideListProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <span className="text-sm font-extrabold text-gray-800">
          슬라이드 {slides.length}장
        </span>
        <button
          type="button"
          onClick={() => onAdd(slides.length - 1)}
          className="p-1.5 rounded-lg bg-[#8CA5FF] hover:bg-blue-600 text-white transition-colors"
          title="맨 뒤에 슬라이드 추가"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {slides.map((slide, index) => {
          const isCurrent = slide.id === currentId;
          return (
            <div
              key={slide.id}
              draggable
              onDragStart={() => setDraggingIndex(index)}
              onDragOver={(e) => {
                e.preventDefault();
                if (dropIndex !== index) setDropIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingIndex !== null) onMove(draggingIndex, index);
                setDraggingIndex(null);
                setDropIndex(null);
              }}
              onDragEnd={() => {
                setDraggingIndex(null);
                setDropIndex(null);
              }}
              onClick={() => onSelect(slide.id)}
              className={`group rounded-xl border-2 p-2 cursor-pointer transition-colors ${
                isCurrent
                  ? "border-[#8CA5FF] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              } ${draggingIndex === index ? "opacity-40" : ""} ${
                dropIndex === index && draggingIndex !== index
                  ? "ring-2 ring-[#8CA5FF]"
                  : ""
              }`}
            >
              <div className="flex items-center gap-1.5">
                <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                <span className="text-xs font-bold text-gray-500 tabular-nums shrink-0">
                  {index + 1}
                </span>
                <span className="text-xs font-semibold text-gray-800 truncate flex-1">
                  {slide.title}
                </span>
              </div>

              {/* 미리보기 자리. 2단계에서 실제 축소판을 넣는다. */}
              <div
                className={`mt-1.5 rounded-md border bg-white ${
                  slide.locked ? "border-gray-300" : "border-gray-200"
                }`}
                style={{ aspectRatio: "16 / 9" }}
              />

              <div className="flex items-center justify-end gap-0.5 mt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(slide.id, !slide.locked);
                  }}
                  className={`p-1 rounded transition-colors ${
                    slide.locked
                      ? "text-[#FF4D4D] hover:bg-red-50"
                      : "text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100"
                  }`}
                  title={slide.locked ? "잠금 해제" : "이 슬라이드 잠그기"}
                >
                  {slide.locked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(index);
                  }}
                  className="p-1 rounded text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-colors"
                  title="이 뒤에 슬라이드 추가"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(slide.id);
                  }}
                  disabled={slides.length <= 1}
                  className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:text-gray-200 disabled:hover:bg-transparent opacity-0 group-hover:opacity-100 disabled:opacity-40 transition-colors"
                  title={
                    slides.length <= 1
                      ? "마지막 슬라이드는 지울 수 없습니다"
                      : "슬라이드 삭제"
                  }
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
