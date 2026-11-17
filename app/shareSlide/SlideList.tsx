"use client";

import React, { useEffect, useState } from "react";
import type * as Y from "yjs";
import { Plus, Trash2, Lock, Unlock, GripVertical } from "lucide-react";

import { ShapeView } from "./SlideCanvas";
import {
  CONTENT_TYPES,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  objectsOf,
  readObjects,
  type Slide,
} from "./slideData";

interface SlideListProps {
  ydoc: Y.Doc;
  slides: Slide[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onAdd: (afterIndex: number) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onToggleLock: (id: string, locked: boolean) => void;
  /**
   * 슬라이드를 추가·삭제·이동·잠금할 수 있는지.
   * 장별 자물쇠는 따지지 않는다 — 여기서 자물쇠를 풀어야 하기 때문이다.
   */
  canEdit: boolean;
}

/**
 * 슬라이드 축소판.
 *
 * 좌표를 전부 비율(%)로 바꿔 그린다. 슬라이드는 항상 1280x720 기준으로
 * 저장하므로, 비율로 두면 축소판 크기가 얼마든 알아서 맞는다.
 *
 * 텍스트·표·달력·투표는 안이 복잡해서 축소판에서는 회색 자리만 보여 준다.
 * 축소판마다 편집기를 띄우면 슬라이드 수만큼 무거워진다.
 */
function SlideThumb({ ydoc, slideId }: { ydoc: Y.Doc; slideId: string }) {
  const objects = readObjects(ydoc, slideId);

  return (
    <>
      {objects.map((o) => (
        <div
          key={o.id}
          className="absolute"
          style={{
            left: `${(o.x / SLIDE_WIDTH) * 100}%`,
            top: `${(o.y / SLIDE_HEIGHT) * 100}%`,
            width: `${(o.w / SLIDE_WIDTH) * 100}%`,
            height: `${(o.h / SLIDE_HEIGHT) * 100}%`,
            transform: o.rotation ? `rotate(${o.rotation}deg)` : undefined,
          }}
        >
          {CONTENT_TYPES.includes(o.type) ? (
            <div className="w-full h-full rounded-sm bg-gray-200/70" />
          ) : (
            <ShapeView object={o} />
          )}
        </div>
      ))}
    </>
  );
}

export default function SlideList({
  ydoc,
  slides,
  currentId,
  onSelect,
  onAdd,
  onRemove,
  onMove,
  onToggleLock,
  canEdit,
}: SlideListProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  /*
   * 이 값 자체는 쓰지 않는다. 누가 물체를 고치면 축소판도 따라 바뀌어야 해서
   * 다시 그리게 만드는 방아쇠다. 내용은 그릴 때마다 Yjs 에서 새로 읽는다.
   */
  const [, bump] = useState(0);
  useEffect(() => {
    const objects = objectsOf(ydoc);
    const onChange = () => bump((v) => v + 1);
    objects.observe(onChange);
    return () => objects.unobserve(onChange);
  }, [ydoc]);

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200">
        <span className="text-sm font-extrabold text-gray-800">
          슬라이드 {slides.length}장
        </span>
        <button
          type="button"
          onClick={() => onAdd(slides.length - 1)}
          disabled={!canEdit}
          className="p-1.5 rounded-lg bg-[#8CA5FF] hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white transition-colors"
          title={canEdit ? "맨 뒤에 슬라이드 추가" : "편집 권한이 없습니다"}
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
              draggable={canEdit}
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

              {/* 축소판 */}
              <div
                className={`mt-1.5 rounded-md border bg-white relative overflow-hidden ${
                  slide.locked ? "border-gray-300" : "border-gray-200"
                }`}
                style={{ aspectRatio: "16 / 9" }}
              >
                <SlideThumb ydoc={ydoc} slideId={slide.id} />
              </div>

              <div className="flex items-center justify-end gap-0.5 mt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(slide.id, !slide.locked);
                  }}
                  disabled={!canEdit}
                  className={`p-1 rounded transition-colors ${
                    slide.locked
                      ? "text-[#FF4D4D] hover:bg-red-50"
                      : "text-gray-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100"
                  }`}
                  title={
                    !canEdit
                      ? "편집 권한이 없습니다"
                      : slide.locked
                        ? "잠금 해제"
                        : "이 슬라이드 잠그기"
                  }
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
                  disabled={!canEdit}
                  className="p-1 rounded text-gray-400 hover:bg-gray-100 disabled:text-gray-200 disabled:hover:bg-transparent opacity-0 group-hover:opacity-100 transition-colors"
                  title={canEdit ? "이 뒤에 슬라이드 추가" : "편집 권한이 없습니다"}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(slide.id);
                  }}
                  disabled={slides.length <= 1 || !canEdit}
                  className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:text-gray-200 disabled:hover:bg-transparent opacity-0 group-hover:opacity-100 disabled:opacity-40 transition-colors"
                  title={
                    !canEdit
                      ? "편집 권한이 없습니다"
                      : slides.length <= 1
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
