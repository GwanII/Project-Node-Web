"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Eraser,
  Undo2,
  Pen,
  SquareDashed,
  Copy,
  Trash2,
  Trash,
} from "lucide-react";

import type { Point, Stroke } from "./data";

interface DrawingLayerProps {
  /** true 일 때만 그릴 수 있다. false 면 이미 그린 선은 보이되 클릭은 통과시킨다. */
  isActive: boolean;
  /** 본문 스크롤 영역. 스크롤한 만큼 그림을 밀어서 그리는 데 쓴다. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** 저장돼 있던 그림. 불러오기가 끝난 뒤에만 이 컴포넌트가 그려진다. */
  initialStrokes: Stroke[];
  /** 획이 늘거나 줄 때마다 부모에게 알린다. 실제 저장은 부모가 모아서 한다. */
  onStrokesChange: (strokes: Stroke[]) => void;
}

/** 펜 / 지우개 / 선택 중 무엇을 쥐고 있는지 */
type Tool = "pen" | "eraser" | "select";

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const PEN_COLORS = ["#111827", "#FF4D4D", "#8CA5FF", "#22C55E", "#EC4899"];
const PEN_WIDTHS = [2, 4, 8];

/** 지우개가 닿는 반경(px). 굵기와 무관하게 일정하다. */
const ERASER_RADIUS = 12;
/** 복사한 그림을 원본에서 이만큼 밀어서 놓는다. */
const PASTE_OFFSET = 16;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const normalizeRect = (r: Rect): Rect => ({
  x1: Math.min(r.x1, r.x2),
  y1: Math.min(r.y1, r.y2),
  x2: Math.max(r.x1, r.x2),
  y2: Math.max(r.y1, r.y2),
});

const isPointInRect = (p: Point, r: Rect) =>
  p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2;

/** 획을 감싸는 최소 사각형. 선택 표시와 "여기를 잡아 옮기기" 판정에 쓴다. */
function boundsOf(strokes: Stroke[]): Rect | null {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;

  strokes.forEach((s) =>
    s.points.forEach((p) => {
      const pad = s.width / 2;
      x1 = Math.min(x1, p.x - pad);
      y1 = Math.min(y1, p.y - pad);
      x2 = Math.max(x2, p.x + pad);
      y2 = Math.max(y2, p.y + pad);
    })
  );

  return x1 === Infinity ? null : { x1, y1, x2, y2 };
}

export default function DrawingLayer({
  isActive,
  scrollRef,
  initialStrokes,
  onStrokesChange,
}: DrawingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>(initialStrokes);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [width, setWidth] = useState(PEN_WIDTHS[1]);
  const [strokeCount, setStrokeCount] = useState(initialStrokes.length);

  /** 선택된 획의 자리번호. 지우거나 복사하면 비운다. */
  const [selected, setSelected] = useState<number[]>([]);
  const selectedRef = useRef<number[]>([]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  /** 드래그 중인 선택 상자. 그리는 동안만 값이 있다. */
  const marqueeRef = useRef<Rect | null>(null);
  /** 선택한 그림을 끌어 옮기는 중이면 직전 위치가 들어있다. */
  const movingFromRef = useRef<Point | null>(null);
  /** 복사해둔 그림 */
  const clipboardRef = useRef<Stroke[]>([]);
  const [hasClipboard, setHasClipboard] = useState(false);

  const onStrokesChangeRef = useRef(onStrokesChange);
  useEffect(() => {
    onStrokesChangeRef.current = onStrokesChange;
  }, [onStrokesChange]);

  const commitStrokes = useCallback(() => {
    setStrokeCount(strokesRef.current.length);
    onStrokesChangeRef.current([...strokesRef.current]);
  }, []);

  // -------------------------------------------------------------------------
  // 그리기
  // -------------------------------------------------------------------------

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;

    // 화면 좌표 = 문서 좌표 - 스크롤량
    ctx.setTransform(dpr, 0, 0, dpr, 0, -scrollTop * dpr);
    ctx.clearRect(0, scrollTop, canvas.width / dpr, canvas.height / dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const all = currentStrokeRef.current
      ? [...strokesRef.current, currentStrokeRef.current]
      : strokesRef.current;
    const selectedSet = new Set(selectedRef.current);

    all.forEach((stroke, index) => {
      if (stroke.points.length === 0) return;

      // 선택된 획은 뒤에 옅은 띠를 깔아 표시한다.
      if (selectedSet.has(index)) {
        ctx.strokeStyle = "#8CA5FF";
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = stroke.width + 8;
        ctx.beginPath();
        stroke.points.forEach((p, i) =>
          i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
        );
        if (stroke.points.length === 1) {
          const { x, y } = stroke.points[0];
          ctx.arc(x, y, (stroke.width + 8) / 2, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (stroke.points.length === 1) {
        const { x, y } = stroke.points[0];
        ctx.beginPath();
        ctx.arc(x, y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
        return;
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i += 1) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    // 선택 상자
    const marquee = marqueeRef.current;
    if (marquee) {
      const r = normalizeRect(marquee);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#8CA5FF";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
      ctx.fillStyle = "rgba(140,165,255,0.12)";
      ctx.fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
      ctx.setLineDash([]);
    }

    // 선택된 그림을 감싸는 테두리
    if (!marquee && selectedRef.current.length > 0) {
      const picked = selectedRef.current
        .map((i) => strokesRef.current[i])
        .filter(Boolean);
      const b = boundsOf(picked);
      if (b) {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#4457B4";
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x1 - 4, b.y1 - 4, b.x2 - b.x1 + 8, b.y2 - b.y1 + 8);
        ctx.setLineDash([]);
      }
    }
  }, [scrollRef]);

  // 캔버스를 "보이는 영역" 크기로만 맞춘다.
  // 내용 높이에 맞추면 캔버스가 스크롤바를 만들어 무한루프가 생긴다.
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = canvas?.parentElement;
    if (!canvas || !box) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w === 0 || h === 0) return;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      redraw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(box);
    return () => observer.disconnect();
  }, [redraw]);

  // 스크롤하면 그림도 같이 움직여야 한다.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onScroll = () => redraw();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [redraw, scrollRef]);

  // 선택 상태가 바뀌면 다시 그린다.
  useEffect(() => {
    redraw();
  }, [selected, redraw]);

  // -------------------------------------------------------------------------
  // 지우개 · 선택 동작
  // -------------------------------------------------------------------------

  /** 지우개가 지나간 자리의 점만 걷어내고, 남은 구간을 각각의 획으로 쪼갠다. */
  const eraseAt = (p: Point): boolean => {
    let changed = false;
    const next: Stroke[] = [];

    for (const stroke of strokesRef.current) {
      const touches = stroke.points.some((pt) => distance(pt, p) <= ERASER_RADIUS);
      if (!touches) {
        next.push(stroke);
        continue;
      }
      changed = true;

      let run: Point[] = [];
      for (const pt of stroke.points) {
        if (distance(pt, p) <= ERASER_RADIUS) {
          if (run.length >= 2) next.push({ ...stroke, points: run });
          run = [];
        } else {
          run.push(pt);
        }
      }
      if (run.length >= 2) next.push({ ...stroke, points: run });
    }

    if (changed) strokesRef.current = next;
    return changed;
  };

  const selectInRect = (rect: Rect) => {
    const r = normalizeRect(rect);
    const picked: number[] = [];
    strokesRef.current.forEach((stroke, index) => {
      if (stroke.points.some((p) => isPointInRect(p, r))) picked.push(index);
    });
    setSelected(picked);
  };

  const moveSelected = (dx: number, dy: number) => {
    const set = new Set(selectedRef.current);
    strokesRef.current = strokesRef.current.map((stroke, index) =>
      set.has(index)
        ? {
            ...stroke,
            points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          }
        : stroke
    );
  };

  const deleteSelected = useCallback(() => {
    if (selectedRef.current.length === 0) return;
    const set = new Set(selectedRef.current);
    strokesRef.current = strokesRef.current.filter((_, i) => !set.has(i));
    setSelected([]);
    commitStrokes();
    redraw();
  }, [commitStrokes, redraw]);

  const copySelected = useCallback(() => {
    if (selectedRef.current.length === 0) return;
    const set = new Set(selectedRef.current);
    clipboardRef.current = strokesRef.current
      .filter((_, i) => set.has(i))
      .map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));
    setHasClipboard(true);
  }, []);

  const pasteClipboard = useCallback(() => {
    if (clipboardRef.current.length === 0) return;
    const start = strokesRef.current.length;
    const pasted = clipboardRef.current.map((s) => ({
      ...s,
      points: s.points.map((p) => ({ x: p.x + PASTE_OFFSET, y: p.y + PASTE_OFFSET })),
    }));
    strokesRef.current = [...strokesRef.current, ...pasted];
    // 붙여넣은 것을 바로 선택해두면 이어서 옮기기 편하다.
    setSelected(pasted.map((_, i) => start + i));
    commitStrokes();
    redraw();
  }, [commitStrokes, redraw]);

  /** 복사한 즉시 살짝 옆에 붙여넣는다. 버튼 하나로 "복제" 처럼 쓰인다. */
  const duplicateSelected = useCallback(() => {
    copySelected();
    // copySelected 가 ref 를 채운 직후라 바로 붙여넣어도 된다.
    pasteClipboard();
  }, [copySelected, pasteClipboard]);

  // 키보드 단축키 (선택 도구일 때만)
  useEffect(() => {
    if (!isActive || tool !== "select") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // 입력창에 타이핑 중이면 건드리지 않는다.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedRef.current.length === 0) return;
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedRef.current.length === 0) return;
        e.preventDefault();
        copySelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboardRef.current.length === 0) return;
        e.preventDefault();
        pasteClipboard();
      } else if (e.key === "Escape") {
        setSelected([]);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isActive, tool, deleteSelected, copySelected, pasteClipboard]);

  /** 도구를 바꿀 때는 하던 선택을 정리한다. */
  const changeTool = (next: Tool) => {
    setTool(next);
    setSelected([]);
    marqueeRef.current = null;
    movingFromRef.current = null;
  };

  // -------------------------------------------------------------------------
  // 포인터
  // -------------------------------------------------------------------------

  /** 화면 좌표를 문서 좌표로 바꾼다. */
  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top + scrollTop,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = getPoint(e);

    if (tool === "pen") {
      currentStrokeRef.current = { points: [p], color, width };
      redraw();
      return;
    }

    if (tool === "eraser") {
      if (eraseAt(p)) redraw();
      return;
    }

    // 선택 도구: 이미 고른 그림 위를 누르면 옮기기 시작, 아니면 새로 고르기
    const picked = selectedRef.current
      .map((i) => strokesRef.current[i])
      .filter(Boolean);
    const bounds = boundsOf(picked);

    if (bounds && isPointInRect(p, bounds)) {
      movingFromRef.current = p;
      return;
    }

    setSelected([]);
    marqueeRef.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const p = getPoint(e);

    if (tool === "pen") {
      if (!currentStrokeRef.current) return;
      currentStrokeRef.current.points.push(p);
      redraw();
      return;
    }

    if (tool === "eraser") {
      // 버튼을 누르고 있을 때만 지운다.
      if (e.buttons === 0) return;
      if (eraseAt(p)) redraw();
      return;
    }

    if (movingFromRef.current) {
      const from = movingFromRef.current;
      moveSelected(p.x - from.x, p.y - from.y);
      movingFromRef.current = p;
      redraw();
      return;
    }

    if (marqueeRef.current) {
      marqueeRef.current = { ...marqueeRef.current, x2: p.x, y2: p.y };
      redraw();
    }
  };

  const handlePointerUp = () => {
    if (tool === "pen") {
      if (!currentStrokeRef.current) return;
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
      commitStrokes();
      redraw();
      return;
    }

    if (tool === "eraser") {
      commitStrokes();
      return;
    }

    if (movingFromRef.current) {
      movingFromRef.current = null;
      commitStrokes();
      redraw();
      return;
    }

    if (marqueeRef.current) {
      const rect = marqueeRef.current;
      marqueeRef.current = null;
      selectInRect(rect);
      redraw();
    }
  };

  // 그리는 중에도 마우스 휠로 스크롤할 수 있게 스크롤 영역으로 넘겨준다.
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    scrollRef.current?.scrollBy({ top: e.deltaY });
  };

  const handleUndo = () => {
    strokesRef.current.pop();
    setSelected([]);
    commitStrokes();
    redraw();
  };

  const handleClearAll = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setSelected([]);
    commitStrokes();
    redraw();
  };

  // -------------------------------------------------------------------------

  const cursorClass =
    tool === "pen"
      ? "cursor-crosshair"
      : tool === "eraser"
        ? "cursor-cell"
        : "cursor-default";

  const toolButtonClass = (active: boolean) =>
    `p-1.5 rounded-lg transition-colors ${
      active ? "bg-[#8CA5FF] text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className={`absolute inset-0 z-10 ${
          isActive ? `pointer-events-auto ${cursorClass}` : "pointer-events-none"
        }`}
      />

      {/* 펜 설정 막대. 드로잉 모드일 때만 뜬다. */}
      {isActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white border border-gray-200 rounded-2xl shadow-lg px-4 py-2.5">
          {/* 도구 */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => changeTool("pen")}
              className={toolButtonClass(tool === "pen")}
              title="펜 — 그리기"
            >
              <Pen className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => changeTool("eraser")}
              className={toolButtonClass(tool === "eraser")}
              title="지우개 — 문지른 부분만 지웁니다"
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => changeTool("select")}
              className={toolButtonClass(tool === "select")}
              title="선택 — 드래그로 영역을 골라 옮기거나 복사·삭제합니다"
            >
              <SquareDashed className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {tool === "select" ? (
            /* 선택 도구일 때는 색·굵기 대신 편집 버튼을 보여준다 */
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500 tabular-nums">
                {selected.length > 0
                  ? `${selected.length}개 선택됨`
                  : "드래그해서 고르세요"}
              </span>
              <button
                type="button"
                onClick={duplicateSelected}
                disabled={selected.length === 0}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                title="복사해서 옆에 붙여넣기 (Ctrl+C, Ctrl+V)"
              >
                <Copy className="w-3.5 h-3.5" />
                복사
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={selected.length === 0}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
                title="선택한 그림 삭제 (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                삭제
              </button>
              {hasClipboard && (
                <button
                  type="button"
                  onClick={pasteClipboard}
                  className="text-xs font-bold px-2 py-1.5 rounded-lg text-[#4457B4] hover:bg-blue-50 transition-colors"
                  title="복사해둔 그림 붙여넣기 (Ctrl+V)"
                >
                  붙여넣기
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 색상 */}
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((penColor) => (
                  <button
                    key={penColor}
                    type="button"
                    onClick={() => setColor(penColor)}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                      color === penColor
                        ? "ring-2 ring-offset-2 ring-gray-800"
                        : "border border-gray-300"
                    }`}
                    style={{ backgroundColor: penColor }}
                    title="펜 색상"
                  />
                ))}
                <label
                  className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer overflow-hidden relative hover:scale-110 transition-transform"
                  style={{
                    background:
                      "conic-gradient(#FF4D4D,#FACC15,#22C55E,#06B6D4,#8CA5FF,#A855F7,#FF4D4D)",
                  }}
                  title="색상 직접 고르기"
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>

              <div className="w-px h-6 bg-gray-200" />

              {/* 굵기 */}
              <div className="flex items-center gap-1.5">
                {PEN_WIDTHS.map((penWidth) => (
                  <button
                    key={penWidth}
                    type="button"
                    onClick={() => setWidth(penWidth)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      width === penWidth ? "bg-[#8CA5FF]" : "hover:bg-gray-100"
                    }`}
                    title={`굵기 ${penWidth}`}
                  >
                    <span
                      className="rounded-full bg-gray-800"
                      style={{ width: penWidth + 2, height: penWidth + 2 }}
                    />
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="w-px h-6 bg-gray-200" />

          <button
            type="button"
            onClick={handleUndo}
            disabled={strokeCount === 0}
            className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
            title="한 획 되돌리기"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={strokeCount === 0}
            className="p-1.5 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
            title="전부 지우기"
          >
            <Trash className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
