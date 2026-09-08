"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import {
  Eraser,
  Undo2,
  Redo2,
  Pen,
  SquareDashed,
  Copy,
  Trash2,
  Trash,
  Group,
  Ungroup,
  X,
} from "lucide-react";

import { createId, ensureStrokeFields, type Point, type Stroke } from "./data";

/**
 * 그림 레이어.
 *
 * 획은 Yjs 문서 안의 지도(Y.Map)에 들어간다. 획마다 고유 번호가 열쇠라서
 * 두 사람이 서로 다른 획을 건드리는 한 충돌하지 않는다.
 * "지금 긋는 중인 선" 은 아직 확정 전이라 지도에 넣지 않고,
 * 커서를 공유하는 통로(awareness)로 흘려보낸다.
 */

interface DrawingLayerProps {
  /** true 일 때만 그릴 수 있다. false 면 이미 그린 선은 보이되 클릭은 통과시킨다. */
  isActive: boolean;
  /** 본문 스크롤 영역. 스크롤한 만큼 그림을 밀어서 그리는 데 쓴다. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** 동시 편집용 Yjs 문서 */
  ydoc: Y.Doc;
  /** 긋는 중인 선을 실시간으로 주고받는 통로 */
  awareness: Awareness;
  /** 예전 방식(documents.strokes)으로 저장돼 있던 그림. 처음 한 번만 옮겨온다. */
  legacyStrokes: Stroke[];
}

type Tool = "pen" | "eraser" | "select";

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** 아직 확정되지 않은, 긋는 중인 선 */
interface DraftStroke {
  points: Point[];
  color: string;
  width: number;
}

const PEN_COLORS = ["#111827", "#FF4D4D", "#8CA5FF", "#22C55E", "#EC4899"];
const PEN_WIDTHS = [2, 4, 8];

/** 지우개가 닿는 반경(px) */
const ERASER_RADIUS = 12;
/** 복사본을 원본에서 이만큼 밀어서 놓는다 */
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

/** 캔버스에 획 하나를 그린다. */
function paintStroke(
  ctx: CanvasRenderingContext2D,
  stroke: { points: Point[]; color: string; width: number }
) {
  if (stroke.points.length === 0) return;

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
}

export default function DrawingLayer({
  isActive,
  scrollRef,
  ydoc,
  awareness,
  legacyStrokes,
}: DrawingLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /** 확정된 획들. 열쇠는 획의 고유 번호. */
  const strokesMap = useMemo(() => ydoc.getMap<Stroke>("strokes"), [ydoc]);

  /**
   * "이 창에서 낸 변경" 임을 표시하는 딱지.
   * 되돌리기가 내 것만 되돌리도록 하는 데 쓴다. 남이 지운 건 되돌아가지 않는다.
   * 내용은 없어도 되고, 창마다 서로 다른 값이기만 하면 된다.
   */
  const localOrigin = useMemo(() => ({}), []);

  const undoManager = useMemo(
    () =>
      new Y.UndoManager(strokesMap, {
        trackedOrigins: new Set([localOrigin]),
      }),
    [strokesMap, localOrigin]
  );

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [width, setWidth] = useState(PEN_WIDTHS[1]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [askClearAll, setAskClearAll] = useState(false);

  /** 선택된 획의 고유 번호들 */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  const marqueeRef = useRef<Rect | null>(null);
  const movingFromRef = useRef<Point | null>(null);
  const draftRef = useRef<DraftStroke | null>(null);
  const clipboardRef = useRef<Stroke[]>([]);
  const [hasClipboard, setHasClipboard] = useState(false);

  // -------------------------------------------------------------------------
  // 지도 읽고 쓰기
  // -------------------------------------------------------------------------

  const allStrokes = useCallback(
    (): Stroke[] => [...strokesMap.values()].sort((a, b) => a.order - b.order),
    [strokesMap]
  );

  /** 모든 쓰기는 이걸 거친다. 한 덩어리로 묶여서 되돌리기 한 번에 취소된다. */
  const write = useCallback(
    (fn: () => void) => {
      ydoc.transact(fn, localOrigin);
    },
    [ydoc, localOrigin]
  );

  const nextOrder = useCallback(() => {
    const strokes = allStrokes();
    return strokes.length === 0 ? 0 : strokes[strokes.length - 1].order + 1;
  }, [allStrokes]);

  /** 묶인 획을 하나 고르면 같은 묶음 전체를 고른다. */
  const expandToGroups = useCallback(
    (ids: string[]): string[] => {
      const groups = new Set<string>();
      ids.forEach((id) => {
        const g = strokesMap.get(id)?.groupId;
        if (g) groups.add(g);
      });
      if (groups.size === 0) return ids;

      const result = new Set(ids);
      strokesMap.forEach((stroke, id) => {
        if (stroke.groupId && groups.has(stroke.groupId)) result.add(id);
      });
      return [...result];
    },
    [strokesMap]
  );

  // -------------------------------------------------------------------------
  // 그리기
  // -------------------------------------------------------------------------

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;

    ctx.setTransform(dpr, 0, 0, dpr, 0, -scrollTop * dpr);
    ctx.clearRect(0, scrollTop, canvas.width / dpr, canvas.height / dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const selectedSet = new Set(selectedIdsRef.current);
    const strokes = allStrokes();

    strokes.forEach((stroke) => {
      // 선택된 획은 뒤에 옅은 띠를 깔아 표시한다.
      if (selectedSet.has(stroke.id)) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        paintStroke(ctx, {
          points: stroke.points,
          width: stroke.width + 8,
          color: "#8CA5FF",
        });
        ctx.restore();
      }
      paintStroke(ctx, stroke);
    });

    // 내가 지금 긋는 중인 선
    if (draftRef.current) paintStroke(ctx, draftRef.current);

    // 남이 지금 긋는 중인 선
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const draft = (state as { drawing?: DraftStroke | null }).drawing;
      if (draft && draft.points && draft.points.length > 0) paintStroke(ctx, draft);
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
    if (!marquee && selectedSet.size > 0) {
      const picked = strokes.filter((s) => selectedSet.has(s.id));
      const b = boundsOf(picked);
      if (b) {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#4457B4";
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x1 - 4, b.y1 - 4, b.x2 - b.x1 + 8, b.y2 - b.y1 + 8);
        ctx.setLineDash([]);
      }
    }
  }, [allStrokes, awareness, scrollRef]);

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

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const onScroll = () => redraw();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [redraw, scrollRef]);

  // 누군가 획을 바꾸면 다시 그린다. 내 변경도 남의 변경도 여기로 들어온다.
  useEffect(() => {
    const onChange = () => {
      setStrokeCount(strokesMap.size);
      // 사라진 획은 선택에서 뺀다.
      setSelectedIds((prev) => prev.filter((id) => strokesMap.has(id)));
      redraw();
    };
    strokesMap.observe(onChange);
    onChange();
    return () => strokesMap.unobserve(onChange);
  }, [strokesMap, redraw]);

  // 남이 긋는 중인 선이 바뀌면 다시 그린다.
  useEffect(() => {
    const onAwareness = () => redraw();
    awareness.on("change", onAwareness);
    return () => awareness.off("change", onAwareness);
  }, [awareness, redraw]);

  useEffect(() => {
    const onStack = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };
    undoManager.on("stack-item-added", onStack);
    undoManager.on("stack-item-popped", onStack);
    onStack();
    return () => {
      undoManager.off("stack-item-added", onStack);
      undoManager.off("stack-item-popped", onStack);
    };
  }, [undoManager]);

  useEffect(() => {
    redraw();
  }, [selectedIds, redraw]);

  // 예전 방식으로 저장돼 있던 그림을 한 번만 옮겨온다.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    if (strokesMap.size > 0 || legacyStrokes.length === 0) return;

    write(() => {
      ensureStrokeFields(legacyStrokes).forEach((stroke) =>
        strokesMap.set(stroke.id, stroke)
      );
    });
  }, [legacyStrokes, strokesMap, write]);

  // -------------------------------------------------------------------------
  // 도구 동작
  // -------------------------------------------------------------------------

  /** 지우개가 지나간 자리의 점만 걷어내고, 남은 구간을 각각의 획으로 쪼갠다. */
  const eraseAt = (p: Point): boolean => {
    let changed = false;

    write(() => {
      allStrokes().forEach((stroke) => {
        const touches = stroke.points.some((pt) => distance(pt, p) <= ERASER_RADIUS);
        if (!touches) return;
        changed = true;

        const runs: Point[][] = [];
        let run: Point[] = [];
        stroke.points.forEach((pt) => {
          if (distance(pt, p) <= ERASER_RADIUS) {
            if (run.length >= 2) runs.push(run);
            run = [];
          } else {
            run.push(pt);
          }
        });
        if (run.length >= 2) runs.push(run);

        strokesMap.delete(stroke.id);
        runs.forEach((points, i) => {
          const id = createId();
          strokesMap.set(id, {
            ...stroke,
            id,
            points,
            order: stroke.order + i * 0.001,
          });
        });
      });
    });

    return changed;
  };

  const selectInRect = (rect: Rect) => {
    const r = normalizeRect(rect);
    const hit = allStrokes()
      .filter((s) => s.points.some((p) => isPointInRect(p, r)))
      .map((s) => s.id);
    setSelectedIds(expandToGroups(hit));
  };

  const moveSelected = (dx: number, dy: number) => {
    const ids = selectedIdsRef.current;
    write(() => {
      ids.forEach((id) => {
        const stroke = strokesMap.get(id);
        if (!stroke) return;
        strokesMap.set(id, {
          ...stroke,
          points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
        });
      });
    });
  };

  const deleteSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length === 0) return;
    write(() => ids.forEach((id) => strokesMap.delete(id)));
    setSelectedIds([]);
  }, [strokesMap, write]);

  const copySelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length === 0) return;
    clipboardRef.current = ids
      .map((id) => strokesMap.get(id))
      .filter((s): s is Stroke => !!s)
      .map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));
    setHasClipboard(true);
  }, [strokesMap]);

  const pasteClipboard = useCallback(() => {
    const source = clipboardRef.current;
    if (source.length === 0) return;

    // 묶여 있던 것은 묶인 채로 붙여넣는다. 단, 원본과 다른 묶음이 되게 한다.
    const groupRemap = new Map<string, string>();
    const base = nextOrder();
    const newIds: string[] = [];

    write(() => {
      source.forEach((stroke, i) => {
        const id = createId();
        newIds.push(id);

        let groupId = stroke.groupId;
        if (groupId) {
          if (!groupRemap.has(groupId)) groupRemap.set(groupId, createId());
          groupId = groupRemap.get(groupId);
        }

        strokesMap.set(id, {
          ...stroke,
          id,
          groupId,
          order: base + i,
          points: stroke.points.map((p) => ({
            x: p.x + PASTE_OFFSET,
            y: p.y + PASTE_OFFSET,
          })),
        });
      });
    });

    setSelectedIds(newIds);
  }, [nextOrder, strokesMap, write]);

  const duplicateSelected = useCallback(() => {
    copySelected();
    pasteClipboard();
  }, [copySelected, pasteClipboard]);

  const groupSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length < 2) return;
    const groupId = createId();
    write(() => {
      ids.forEach((id) => {
        const stroke = strokesMap.get(id);
        if (stroke) strokesMap.set(id, { ...stroke, groupId });
      });
    });
  }, [strokesMap, write]);

  const ungroupSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length === 0) return;
    write(() => {
      ids.forEach((id) => {
        const stroke = strokesMap.get(id);
        if (stroke?.groupId) {
          const next = { ...stroke };
          delete next.groupId;
          strokesMap.set(id, next);
        }
      });
    });
  }, [strokesMap, write]);

  const clearAll = useCallback(() => {
    write(() => {
      [...strokesMap.keys()].forEach((id) => strokesMap.delete(id));
    });
    setSelectedIds([]);
    setAskClearAll(false);
  }, [strokesMap, write]);

  const handleUndo = useCallback(() => {
    undoManager.undo();
    setSelectedIds([]);
  }, [undoManager]);

  const handleRedo = useCallback(() => {
    undoManager.redo();
    setSelectedIds([]);
  }, [undoManager]);

  /** 선택된 것 중 묶인 게 있는지 */
  const selectionHasGroup = selectedIds.some((id) => !!strokesMap.get(id)?.groupId);

  // 키보드 단축키
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      const meta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (meta && key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (meta && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (tool !== "select") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIdsRef.current.length === 0) return;
        e.preventDefault();
        deleteSelected();
      } else if (meta && key === "c") {
        if (selectedIdsRef.current.length === 0) return;
        e.preventDefault();
        copySelected();
      } else if (meta && key === "v") {
        if (clipboardRef.current.length === 0) return;
        e.preventDefault();
        pasteClipboard();
      } else if (meta && key === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelected();
        else groupSelected();
      } else if (e.key === "Escape") {
        setSelectedIds([]);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    isActive,
    tool,
    handleUndo,
    handleRedo,
    deleteSelected,
    copySelected,
    pasteClipboard,
    groupSelected,
    ungroupSelected,
  ]);

  const changeTool = (next: Tool) => {
    setTool(next);
    setSelectedIds([]);
    marqueeRef.current = null;
    movingFromRef.current = null;
  };

  // -------------------------------------------------------------------------
  // 포인터
  // -------------------------------------------------------------------------

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top + scrollTop };
  };

  /** 긋는 중인 선을 남들에게 흘려보낸다. */
  const publishDraft = (draft: DraftStroke | null) => {
    awareness.setLocalStateField("drawing", draft);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = getPoint(e);

    if (tool === "pen") {
      draftRef.current = { points: [p], color, width };
      publishDraft(draftRef.current);
      redraw();
      return;
    }

    if (tool === "eraser") {
      if (eraseAt(p)) redraw();
      return;
    }

    const picked = selectedIdsRef.current
      .map((id) => strokesMap.get(id))
      .filter((s): s is Stroke => !!s);
    const bounds = boundsOf(picked);

    if (bounds && isPointInRect(p, bounds)) {
      movingFromRef.current = p;
      return;
    }

    setSelectedIds([]);
    marqueeRef.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const p = getPoint(e);

    if (tool === "pen") {
      if (!draftRef.current) return;
      draftRef.current.points.push(p);
      publishDraft(draftRef.current);
      redraw();
      return;
    }

    if (tool === "eraser") {
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
      const draft = draftRef.current;
      draftRef.current = null;
      publishDraft(null);
      if (!draft) return;

      const id = createId();
      write(() =>
        strokesMap.set(id, {
          id,
          points: draft.points,
          color: draft.color,
          width: draft.width,
          order: nextOrder(),
        })
      );
      redraw();
      return;
    }

    if (tool === "eraser") return;

    if (movingFromRef.current) {
      movingFromRef.current = null;
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

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    scrollRef.current?.scrollBy({ top: e.deltaY });
  };

  // 창을 닫을 때 내가 긋던 선 표시를 남들 화면에서 지운다.
  useEffect(() => {
    return () => {
      awareness.setLocalStateField("drawing", null);
    };
  }, [awareness]);

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

  const actionButtonClass =
    "flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors";

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
              title="선택 — 드래그로 골라서 옮기거나 묶기·복사·삭제"
            >
              <SquareDashed className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {tool === "select" ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-500 tabular-nums mr-1">
                {selectedIds.length > 0
                  ? `${selectedIds.length}개 선택됨`
                  : "드래그해서 고르세요"}
              </span>
              <button
                type="button"
                onClick={groupSelected}
                disabled={selectedIds.length < 2}
                className={actionButtonClass}
                title="선택한 그림을 하나로 묶기 (Ctrl+G)"
              >
                <Group className="w-3.5 h-3.5" />
                묶기
              </button>
              <button
                type="button"
                onClick={ungroupSelected}
                disabled={!selectionHasGroup}
                className={actionButtonClass}
                title="묶음 풀기 (Ctrl+Shift+G)"
              >
                <Ungroup className="w-3.5 h-3.5" />
                풀기
              </button>
              <button
                type="button"
                onClick={duplicateSelected}
                disabled={selectedIds.length === 0}
                className={actionButtonClass}
                title="복사해서 옆에 붙여넣기 (Ctrl+C, Ctrl+V)"
              >
                <Copy className="w-3.5 h-3.5" />
                복사
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={selectedIds.length === 0}
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
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
            title="되돌리기 (Ctrl+Z) — 내가 한 것만 되돌립니다"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
            title="다시 실행 (Ctrl+Y)"
          >
            <Redo2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setAskClearAll(true)}
            disabled={strokeCount === 0}
            className="p-1.5 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
            title="전부 지우기"
          >
            <Trash className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 전체 지우기 확인 */}
      {askClearAll && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-extrabold text-gray-900">
                그림을 전부 지울까요?
              </h3>
              <button
                type="button"
                onClick={() => setAskClearAll(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              그림 <b className="text-gray-900">{strokeCount}개</b>가 모두 사라집니다.
              <br />
              같이 보고 있는 팀원 화면에서도 지워집니다.
              <br />
              <span className="text-gray-500">
                실수로 지웠다면 되돌리기(Ctrl+Z)로 되살릴 수 있습니다.
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAskClearAll(false)}
                className="px-4 py-2 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="bg-[#FF4D4D] hover:bg-red-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-colors"
              >
                전부 지우기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
