"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as Y from "yjs";

import { createId } from "../shareSheet/data";
import TextBoxView from "./TextBoxView";
import TableView from "./TableView";
import { VoteBody } from "../shareSheet/VoteBlock";
import { CalendarBody } from "../shareSheet/CalendarBlock";
import {
  CONTENT_TYPES,
  DEFAULT_SIZE,
  LINE_TYPES,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  expandToGroups,
  initialContentFor,
  nextObjectOrder,
  objectsOf,
  readObjects,
  type ObjectType,
  type ShapeType,
  type SlideObject,
} from "./slideData";

/**
 * 슬라이드 한 장을 그리고 편집하는 판.
 *
 * 물체는 항상 1280x720 좌표로 저장하고, 화면 크기에 맞춰 비율만 바꿔서 보여준다.
 * 그래야 창 크기가 달라도 모두가 같은 그림을 본다.
 *
 * 캔버스가 아니라 일반 요소(div)로 그린다.
 * 나중에 텍스트 상자 안에 편집기를 넣어야 하는데, 캔버스 안에는 넣을 수 없기 때문이다.
 */

interface SlideCanvasProps {
  ydoc: Y.Doc;
  /** 지금 보고 있는 장 */
  slideId: string;
  /** 잠긴 장은 손댈 수 없다 */
  locked: boolean;
  /** 되돌리기가 내 것만 되돌리도록 표시하는 딱지 */
  origin: object;
  /** 새 물체를 놓을 때 쓸 도형. null 이면 고르기 모드. */
  pendingShape: ShapeType | null;
  onShapePlaced: () => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  /** 지금 글을 치고 있는 텍스트 상자. 없으면 null. */
  editingId: string | null;
  onEditingIdChange: (id: string | null) => void;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

/** 도형별 꼭짓점. 100x100 기준으로 그리고 상자 크기에 맞춰 늘린다. */
const POLYGONS: Partial<Record<ObjectType, string>> = {
  triangle: "50,3 97,97 3,97",
  diamond: "50,3 97,50 50,97 3,50",
  pentagon: "50,3 97,38 78,96 22,96 3,38",
  star: "50,3 61,37 97,37 68,58 79,93 50,71 21,93 32,58 3,37 39,37",
};

/** 물체 하나를 그린다. 크기는 부모가 정하고, 여기서는 안쪽 모양만 그린다. */
export function ShapeView({ object }: { object: SlideObject }) {
  const { type, fill, stroke, strokeWidth, w, h } = object;

  // 네모류는 요소 자체로 그리는 게 선명하다.
  if (type === "rect" || type === "roundRect" || type === "ellipse") {
    return (
      <div
        className="w-full h-full"
        style={{
          background: fill,
          border: `${strokeWidth}px solid ${stroke}`,
          borderRadius:
            type === "ellipse" ? "50%" : type === "roundRect" ? "18px" : "6px",
        }}
      />
    );
  }

  // 다각형
  const points = POLYGONS[type];
  if (points) {
    return (
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  // 말풍선
  if (type === "speech") {
    return (
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M8 6 H92 A6 6 0 0 1 98 12 V70 A6 6 0 0 1 92 76 H40 L24 96 V76 H8 A6 6 0 0 1 2 70 V12 A6 6 0 0 1 8 6 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  // 선과 화살표는 상자의 왼쪽 위 → 오른쪽 아래를 잇는다.
  const markerId = `arrow-${object.id}`;
  return (
    <svg
      className="w-full h-full overflow-visible"
      viewBox={`0 0 ${Math.max(w, 1)} ${Math.max(h, 1)}`}
      preserveAspectRatio="none"
    >
      {type === "arrow" && (
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={stroke} />
          </marker>
        </defs>
      )}
      <line
        x1={0}
        y1={0}
        x2={Math.max(w, 1)}
        y2={Math.max(h, 1)}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        markerEnd={type === "arrow" ? `url(#${markerId})` : undefined}
      />
    </svg>
  );
}

export default function SlideCanvas({
  ydoc,
  slideId,
  locked,
  origin,
  pendingShape,
  onShapePlaced,
  selectedIds,
  onSelectedIdsChange,
  editingId,
  onEditingIdChange,
}: SlideCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const objectsMap = useMemo(() => objectsOf(ydoc), [ydoc]);

  const [objects, setObjects] = useState<SlideObject[]>([]);
  const [scale, setScale] = useState(1);

  /** 끌고 있는 동작. 옮기기인지 크기조절인지. */
  const dragRef = useRef<
    | { kind: "move"; startX: number; startY: number; originals: SlideObject[] }
    | { kind: "resize"; handle: ResizeHandle; startX: number; startY: number; original: SlideObject }
    | { kind: "rotate"; original: SlideObject }
    | { kind: "marquee"; startX: number; startY: number }
    | null
  >(null);
  /**
   * 선택 상자. 판정에는 ref 를 쓰고 화면 표시에만 state 를 쓴다.
   * state 만 쓰면 마우스 동작이 빠를 때 아직 반영되지 않은 값을 읽게 된다.
   */
  const marqueeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const setMarqueeBoth = (next: { x: number; y: number; w: number; h: number } | null) => {
    marqueeRef.current = next;
    setMarquee(next);
  };

  const selectedRef = useRef<string[]>([]);
  useEffect(() => {
    selectedRef.current = selectedIds;
  }, [selectedIds]);

  const write = useCallback(
    (fn: () => void) => ydoc.transact(fn, origin),
    [ydoc, origin]
  );

  // --- 물체 목록 따라가기 -------------------------------------------------
  useEffect(() => {
    const refresh = () => setObjects(readObjects(ydoc, slideId));
    refresh();
    objectsMap.observe(refresh);
    return () => objectsMap.unobserve(refresh);
  }, [objectsMap, ydoc, slideId]);

  // --- 화면 크기에 맞춰 비율 계산 ------------------------------------------
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const resize = () => {
      const w = box.clientWidth;
      if (w > 0) setScale(w / SLIDE_WIDTH);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  /** 화면 좌표 → 슬라이드 좌표 */
  const toSlide = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = boxRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  // --- 물체 놓기 -----------------------------------------------------------
  const placeShape = (type: ShapeType, at: { x: number; y: number }) => {
    const id = createId();
    const isLine = LINE_TYPES.includes(type);
    const isContent = CONTENT_TYPES.includes(type);
    const size = DEFAULT_SIZE[type] ?? { w: isLine ? 220 : 180, h: 120 };
    const { w, h } = size;

    write(() =>
      objectsMap.set(id, {
        id,
        slideId,
        type,
        x: Math.round(at.x - (isLine ? 0 : w / 2)),
        y: Math.round(at.y - (isLine ? 0 : h / 2)),
        w,
        h,
        fill: isLine || isContent ? "transparent" : "#DDE5FF",
        stroke: isContent ? "transparent" : "#4457B4",
        strokeWidth: 2,
        rotation: 0,
        order: nextObjectOrder(ydoc, slideId),
        ...initialContentFor(type),
      })
    );
    onSelectedIdsChange([id]);
    onShapePlaced();
    // 텍스트 상자는 놓자마자 바로 글을 칠 수 있게 한다.
    if (type === "text") onEditingIdChange(id);
  };

  // --- 포인터 --------------------------------------------------------------
  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    const at = toSlide(e);

    if (pendingShape) {
      placeShape(pendingShape, at);
      return;
    }

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    onEditingIdChange(null);
    onSelectedIdsChange([]);
    dragRef.current = { kind: "marquee", startX: at.x, startY: at.y };
    setMarqueeBoth({ x: at.x, y: at.y, w: 0, h: 0 });
  };

  const handleObjectPointerDown = (e: React.PointerEvent, object: SlideObject) => {
    if (locked || pendingShape) return;
    // 글을 치고 있는 상자 안에서는 끌기를 시작하지 않는다.
    if (editingId === object.id) return;
    if (editingId) onEditingIdChange(null);
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const already = selectedRef.current.includes(object.id);
    // 묶인 물체를 고르면 같은 묶음 전체가 잡힌다.
    const ids = already ? selectedRef.current : expandToGroups(ydoc, [object.id]);
    if (!already) onSelectedIdsChange(ids);

    const at = toSlide(e);
    dragRef.current = {
      kind: "move",
      startX: at.x,
      startY: at.y,
      originals: ids
        .map((id) => objectsMap.get(id))
        .filter((o): o is SlideObject => !!o),
    };
  };

  const handleResizePointerDown = (
    e: React.PointerEvent,
    handle: ResizeHandle,
    object: SlideObject
  ) => {
    if (locked) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const at = toSlide(e);
    dragRef.current = {
      kind: "resize",
      handle,
      startX: at.x,
      startY: at.y,
      original: object,
    };
  };

  const handleRotatePointerDown = (e: React.PointerEvent, object: SlideObject) => {
    if (locked) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { kind: "rotate", original: object };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const at = toSlide(e);

    if (drag.kind === "rotate") {
      const o = drag.original;
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      // 위쪽(12시)을 0도로 본다.
      let deg =
        (Math.atan2(at.y - cy, at.x - cx) * 180) / Math.PI + 90;
      // Shift 를 누르면 15도씩 딱딱 맞춘다.
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      deg = ((Math.round(deg) % 360) + 360) % 360;
      write(() => objectsMap.set(o.id, { ...o, rotation: deg }));
      return;
    }

    const dx = at.x - drag.startX;
    const dy = at.y - drag.startY;

    if (drag.kind === "marquee") {
      setMarqueeBoth({
        x: Math.min(drag.startX, at.x),
        y: Math.min(drag.startY, at.y),
        w: Math.abs(dx),
        h: Math.abs(dy),
      });
      return;
    }

    if (drag.kind === "move") {
      write(() =>
        drag.originals.forEach((o) =>
          objectsMap.set(o.id, {
            ...o,
            x: Math.round(o.x + dx),
            y: Math.round(o.y + dy),
          })
        )
      );
      return;
    }

    // 크기 조절
    const o = drag.original;
    let { x, y, w, h } = o;
    const handle = drag.handle;

    /*
     * 회전된 물체는 화면에서 끈 방향과 물체 기준 방향이 다르다.
     * 끌기 값을 물체 각도만큼 거꾸로 돌려서 물체 기준으로 바꾼다.
     */
    const rad = (-(o.rotation ?? 0) * Math.PI) / 180;
    const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (handle.includes("w")) {
      x = o.x + ldx;
      w = o.w - ldx;
    }
    if (handle.includes("e")) w = o.w + ldx;
    if (handle.includes("n")) {
      y = o.y + ldy;
      h = o.h - ldy;
    }
    if (handle.includes("s")) h = o.h + ldy;

    // 뒤집히지 않게 최소 크기를 지킨다.
    if (w < 20) {
      if (handle.includes("w")) x = o.x + o.w - 20;
      w = 20;
    }
    if (h < 20) {
      if (handle.includes("n")) y = o.y + o.h - 20;
      h = 20;
    }

    write(() =>
      objectsMap.set(o.id, {
        ...o,
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
      })
    );
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;

    const box = marqueeRef.current;
    if (drag?.kind === "marquee" && box) {
      const hit = objects
        .filter(
          (o) =>
            o.x + o.w >= box.x &&
            o.x <= box.x + box.w &&
            o.y + o.h >= box.y &&
            o.y <= box.y + box.h
        )
        .map((o) => o.id);
      onSelectedIdsChange(expandToGroups(ydoc, hit));
    }
    setMarqueeBoth(null);
  };

  const selectedSet = new Set(selectedIds);
  const px = (v: number) => v * scale;

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-100 p-6 overflow-auto">
      <div
        className="relative bg-white shadow-lg shrink-0"
        style={{ width: "100%", maxWidth: 1100, aspectRatio: `${SLIDE_WIDTH} / ${SLIDE_HEIGHT}` }}
      >
        <div
          ref={boxRef}
          className={`absolute inset-0 overflow-hidden ${
            pendingShape ? "cursor-crosshair" : "cursor-default"
          }`}
          onPointerDown={handleBackgroundPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {objects.map((object) => {
            const isSelected = selectedSet.has(object.id);
            return (
              <div
                key={object.id}
                className="absolute"
                style={{
                  left: px(object.x),
                  top: px(object.y),
                  width: px(object.w),
                  height: px(object.h),
                  cursor: locked ? "not-allowed" : "move",
                  transform: object.rotation
                    ? `rotate(${object.rotation}deg)`
                    : undefined,
                  transformOrigin: "center",
                }}
                onPointerDown={(e) => handleObjectPointerDown(e, object)}
                onDoubleClick={() => {
                  if (!locked && object.type === "text") onEditingIdChange(object.id);
                }}
              >
                {object.type === "text" ? (
                  <TextBoxView
                    ydoc={ydoc}
                    object={object}
                    isEditing={editingId === object.id}
                    locked={locked}
                    scale={scale}
                  />
                ) : object.type === "table" ? (
                  <TableView
                    data={object.table ?? { cells: [[""]] }}
                    onChange={(next) =>
                      write(() => objectsMap.set(object.id, { ...object, table: next }))
                    }
                    canEdit={!locked}
                    showControls={isSelected}
                    scale={scale}
                  />
                ) : object.type === "calendar" && object.calendar ? (
                  <div
                    className="w-full h-full"
                    onPointerDown={(e) => {
                      if (!locked) e.stopPropagation();
                    }}
                  >
                    <CalendarBody
                      attrs={object.calendar}
                      onChange={(patch) =>
                        write(() =>
                          objectsMap.set(object.id, {
                            ...object,
                            calendar: { ...object.calendar!, ...patch },
                          })
                        )
                      }
                      onDelete={() => write(() => objectsMap.delete(object.id))}
                      canEdit={!locked}
                    />
                  </div>
                ) : object.type === "vote" && object.vote ? (
                  <div
                    className="w-full h-full"
                    onPointerDown={(e) => {
                      if (!locked) e.stopPropagation();
                    }}
                  >
                    <VoteBody
                      attrs={object.vote}
                      onChange={(patch) =>
                        write(() =>
                          objectsMap.set(object.id, {
                            ...object,
                            vote: { ...object.vote!, ...patch },
                          })
                        )
                      }
                      onDelete={() => write(() => objectsMap.delete(object.id))}
                      canEdit={!locked}
                    />
                  </div>
                ) : (
                  <ShapeView object={object} />
                )}

                {/* 글을 안 치고 있는 빈 텍스트 상자는 자리를 알 수 있게 옅은 테두리를 준다 */}
                {object.type === "text" && editingId !== object.id && !isSelected && (
                  <div className="absolute inset-0 border border-dashed border-gray-300 rounded-md pointer-events-none" />
                )}

                {isSelected && !locked && editingId !== object.id && (
                  <>
                    <div className="absolute -inset-0.5 border-2 border-[#8CA5FF] pointer-events-none" />
                    {/* 회전 손잡이 — 위쪽에 매달아 둔다 */}
                    <div
                      onPointerDown={(e) => handleRotatePointerDown(e, object)}
                      className="absolute w-3 h-3 bg-white border-2 border-[#8CA5FF] rounded-full"
                      style={{
                        left: "calc(50% - 6px)",
                        top: -26,
                        cursor: "grab",
                      }}
                      title="끌어서 회전 (Shift 를 누르면 15도씩)"
                    />
                    <div
                      className="absolute bg-[#8CA5FF] pointer-events-none"
                      style={{ left: "calc(50% - 1px)", top: -20, width: 2, height: 20 }}
                    />

                    {HANDLES.map((handle) => {
                      const isLeft = handle.includes("w");
                      const isRight = handle.includes("e");
                      const isTop = handle.includes("n");
                      const isBottom = handle.includes("s");
                      return (
                        <div
                          key={handle}
                          onPointerDown={(e) => handleResizePointerDown(e, handle, object)}
                          className="absolute w-2.5 h-2.5 bg-white border-2 border-[#4457B4] rounded-sm"
                          style={{
                            left: isLeft ? -5 : isRight ? "calc(100% - 5px)" : "calc(50% - 5px)",
                            top: isTop ? -5 : isBottom ? "calc(100% - 5px)" : "calc(50% - 5px)",
                            cursor: HANDLE_CURSOR[handle],
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}

          {marquee && (
            <div
              className="absolute border border-dashed border-[#8CA5FF] bg-[#8CA5FF]/10 pointer-events-none"
              style={{
                left: px(marquee.x),
                top: px(marquee.y),
                width: px(marquee.w),
                height: px(marquee.h),
              }}
            />
          )}

          {locked && (
            <div className="absolute inset-0 bg-gray-900/5 pointer-events-none flex items-start justify-center pt-4">
              <span className="bg-white/90 border border-gray-300 rounded-full px-3 py-1 text-xs font-bold text-gray-600">
                잠긴 슬라이드입니다
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
