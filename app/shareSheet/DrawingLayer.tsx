"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Undo2 } from "lucide-react";

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

const PEN_COLORS = ["#111827", "#FF4D4D", "#8CA5FF", "#22C55E", "#EC4899"];
const PEN_WIDTHS = [2, 4, 8];

export default function DrawingLayer({
  isActive,
  scrollRef,
  initialStrokes,
  onStrokesChange,
}: DrawingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>(initialStrokes);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const [color, setColor] = useState(PEN_COLORS[0]);
  const [width, setWidth] = useState(PEN_WIDTHS[1]);
  // 되돌리기 / 전체지우기 버튼의 활성 여부만 다시 그리기 위한 값.
  const [strokeCount, setStrokeCount] = useState(initialStrokes.length);

  // 그리는 도중에는 매 점마다 부모를 깨우지 않는다. 획이 끝났을 때만 알린다.
  const onStrokesChangeRef = useRef(onStrokesChange);
  useEffect(() => {
    onStrokesChangeRef.current = onStrokesChange;
  }, [onStrokesChange]);

  const commitStrokes = () => {
    setStrokeCount(strokesRef.current.length);
    onStrokesChangeRef.current([...strokesRef.current]);
  };

  /**
   * 저장된 선을 전부 다시 그린다.
   * 캔버스는 화면 크기에 고정되어 있고, 선은 문서 좌표로 저장돼 있으므로
   * 스크롤한 만큼 위로 밀어서 그린다.
   */
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

    for (const stroke of all) {
      if (stroke.points.length === 0) continue;

      if (stroke.points.length === 1) {
        // 점 하나만 찍은 경우도 보이도록 원으로 그린다.
        const { x, y } = stroke.points[0];
        ctx.beginPath();
        ctx.arc(x, y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
        continue;
      }

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [scrollRef]);

  /**
   * 캔버스를 "보이는 영역" 크기로만 맞춘다.
   * 내용 높이가 아니라 화면 높이를 쓰기 때문에, 캔버스가 스크롤 영역을 늘리지 않는다.
   * (예전에는 내용 높이에 맞췄다가 캔버스 → 스크롤바 → 크기변화 → 캔버스 무한루프가 생겼다.)
   */
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
    // box 는 overflow-hidden 이고 크기가 내용과 무관하게 결정되므로 되먹임이 생기지 않는다.
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
    currentStrokeRef.current = { points: [getPoint(e)], color, width };
    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive || !currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(getPoint(e));
    redraw();
  };

  const handlePointerUp = () => {
    if (!currentStrokeRef.current) return;
    strokesRef.current.push(currentStrokeRef.current);
    currentStrokeRef.current = null;
    commitStrokes();
    redraw();
  };

  // 그리는 중에도 마우스 휠로 스크롤할 수 있게 스크롤 영역으로 넘겨준다.
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    scrollRef.current?.scrollBy({ top: e.deltaY });
  };

  const handleUndo = () => {
    strokesRef.current.pop();
    commitStrokes();
    redraw();
  };

  const handleClearAll = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    commitStrokes();
    redraw();
  };

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
          isActive ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
        }`}
      />

      {/* 펜 설정 막대. 드로잉 모드일 때만 뜬다. */}
      {isActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-white border border-gray-200 rounded-2xl shadow-lg px-4 py-2.5">
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

            {/* 아무 색이나 고르기 */}
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
            <Eraser className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}
