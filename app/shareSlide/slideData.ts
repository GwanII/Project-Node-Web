import type * as Y from "yjs";

import { createId } from "../shareSheet/data";
import { createEmptyVote, type VoteAttrs } from "../shareSheet/VoteBlock";
import { createEmptyCalendar, type CalendarAttrs } from "../shareSheet/CalendarBlock";

/**
 * 공유 슬라이드의 자료 구조.
 *
 * 시트지와 달리 물체를 원하는 자리에 놓는 방식(파워포인트)이라,
 * 글이 위에서 아래로 흐르는 시트지 구조를 그대로 쓸 수 없다.
 *
 * Yjs 안에 세 덩어리로 나눠 담는다.
 *   slideOrder : 슬라이드 차례 (id 목록)
 *   slides     : 슬라이드별 정보 (제목, 잠금)
 *   objects    : 모든 슬라이드의 물체를 한곳에. 어느 장인지는 slideId 로 구분한다.
 *
 * 차례와 내용을 나눈 이유는, 순서를 바꿀 때 슬라이드 내용까지 건드리지 않기 위해서다.
 */

/** 슬라이드 위에 놓을 수 있는 것들. text 는 안에 편집기가 들어있는 상자다. */
export type ObjectType =
  | "rect"
  | "roundRect"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "star"
  | "speech"
  | "line"
  | "arrow"
  | "text"
  | "table"
  | "calendar"
  | "vote";

/** 도구 모음에서 고르는 종류 (text 포함) */
export type ShapeType = ObjectType;

/** 선처럼 다루는 것들. 채우기가 없고 놓을 때 기준점이 다르다. */
export const LINE_TYPES: ObjectType[] = ["line", "arrow"];

/** 도형 모음 버튼에 넣을 목록 (텍스트·선 제외) */
export const SHAPE_PALETTE: ObjectType[] = [
  "rect",
  "roundRect",
  "ellipse",
  "triangle",
  "diamond",
  "pentagon",
  "star",
  "speech",
  "line",
  "arrow",
];

export interface Slide {
  id: string;
  title: string;
  /** 잠그면 그 장의 물체를 못 옮기고 못 지운다. 누구나 켜고 끌 수 있다. */
  locked: boolean;
}

/** 표 물체의 내용. 칸마다 글자만 들어간다. */
export interface TableData {
  cells: string[][];
}

export interface SlideObject {
  id: string;
  /** 어느 장에 속한 물체인지 */
  slideId: string;
  type: ObjectType;
  /** 슬라이드 좌표. 슬라이드는 항상 1280x720 기준으로 다루고, 화면에는 비율로 맞춘다. */
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** 시계방향 회전 각도. 없으면 0. */
  rotation?: number;
  /** 겹칠 때 누가 위인지 */
  order: number;
  /** 같은 값끼리 한 묶음. */
  groupId?: string;

  /** 아래는 종류에 따라 하나만 채워진다. */
  table?: TableData;
  calendar?: CalendarAttrs;
  vote?: VoteAttrs;
}

export function createEmptyTable(rows = 3, cols = 3): TableData {
  return {
    cells: Array.from({ length: rows }, () => Array.from({ length: cols }, () => "")),
  };
}

/** 슬라이드 기준 크기. 실제 화면 크기와 무관하게 항상 이 좌표계로 저장한다. */
export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

export const SHAPE_LABELS: Record<ObjectType, string> = {
  rect: "사각형",
  roundRect: "둥근 사각형",
  ellipse: "원",
  triangle: "삼각형",
  diamond: "마름모",
  pentagon: "오각형",
  star: "별",
  speech: "말풍선",
  line: "선",
  arrow: "화살표",
  text: "텍스트 상자",
  table: "표",
  calendar: "달력",
  vote: "투표",
};

/** 안에 내용이 들어있는 물체들. 테두리·채우기를 쓰지 않는다. */
export const CONTENT_TYPES: ObjectType[] = ["text", "table", "calendar", "vote"];

/** 새 물체를 만들 때 종류별 기본 크기 */
export const DEFAULT_SIZE: Partial<Record<ObjectType, { w: number; h: number }>> = {
  text: { w: 420, h: 140 },
  table: { w: 520, h: 200 },
  calendar: { w: 560, h: 420 },
  vote: { w: 440, h: 260 },
};

/** 종류에 맞는 초기 내용을 만들어 준다. */
export function initialContentFor(type: ObjectType): Partial<SlideObject> {
  if (type === "table") return { table: createEmptyTable() };
  if (type === "calendar") return { calendar: createEmptyCalendar() };
  if (type === "vote") return { vote: createEmptyVote() };
  return {};
}

export const DEFAULT_FILL = "#DDE5FF";
export const DEFAULT_STROKE = "#4457B4";

// ---------------------------------------------------------------------------
// Yjs 접근 (화면 코드는 여기까지만 쓴다)
// ---------------------------------------------------------------------------

export const slideOrderOf = (doc: Y.Doc) => doc.getArray<string>("slideOrder");
export const slidesOf = (doc: Y.Doc) => doc.getMap<Slide>("slides");
export const objectsOf = (doc: Y.Doc) => doc.getMap<SlideObject>("slideObjects");

/** 차례대로 정렬된 슬라이드 목록 */
export function readSlides(doc: Y.Doc): Slide[] {
  const slides = slidesOf(doc);
  return slideOrderOf(doc)
    .toArray()
    .map((id) => slides.get(id))
    .filter((s): s is Slide => !!s);
}

/** 한 장에 속한 물체를 아래에서 위 순서로 */
export function readObjects(doc: Y.Doc, slideId: string): SlideObject[] {
  return [...objectsOf(doc).values()]
    .filter((o) => o.slideId === slideId)
    .sort((a, b) => a.order - b.order);
}

export function nextObjectOrder(doc: Y.Doc, slideId: string): number {
  const objects = readObjects(doc, slideId);
  return objects.length === 0 ? 0 : objects[objects.length - 1].order + 1;
}

/** 문서가 비어 있으면 빈 슬라이드 한 장을 만들어 둔다. */
export function ensureFirstSlide(doc: Y.Doc, origin: object): string | null {
  if (slideOrderOf(doc).length > 0) return null;

  const id = createId();
  doc.transact(() => {
    slidesOf(doc).set(id, { id, title: "슬라이드 1", locked: false });
    slideOrderOf(doc).push([id]);
  }, origin);
  return id;
}

/** 새 장을 특정 위치 뒤에 끼워 넣는다. */
export function addSlide(doc: Y.Doc, afterIndex: number, origin: object): string {
  const id = createId();
  doc.transact(() => {
    const order = slideOrderOf(doc);
    const at = Math.min(Math.max(afterIndex + 1, 0), order.length);
    slidesOf(doc).set(id, {
      id,
      title: `슬라이드 ${order.length + 1}`,
      locked: false,
    });
    order.insert(at, [id]);
  }, origin);
  return id;
}

/** 장을 지운다. 그 장의 물체도 같이 지운다. 마지막 한 장은 남긴다. */
export function removeSlide(doc: Y.Doc, slideId: string, origin: object): void {
  const order = slideOrderOf(doc);
  if (order.length <= 1) return;

  doc.transact(() => {
    const index = order.toArray().indexOf(slideId);
    if (index >= 0) order.delete(index, 1);
    slidesOf(doc).delete(slideId);

    const objects = objectsOf(doc);
    [...objects.entries()].forEach(([id, obj]) => {
      if (obj.slideId === slideId) objects.delete(id);
    });
  }, origin);
}

/** 장의 차례를 바꾼다. */
export function moveSlide(
  doc: Y.Doc,
  from: number,
  to: number,
  origin: object
): void {
  if (from === to) return;
  doc.transact(() => {
    const order = slideOrderOf(doc);
    const ids = order.toArray();
    if (from < 0 || from >= ids.length) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(Math.min(Math.max(to, 0), ids.length), 0, moved);
    order.delete(0, order.length);
    order.insert(0, ids);
  }, origin);
}

export function setSlideLocked(
  doc: Y.Doc,
  slideId: string,
  locked: boolean,
  origin: object
): void {
  doc.transact(() => {
    const slide = slidesOf(doc).get(slideId);
    if (slide) slidesOf(doc).set(slideId, { ...slide, locked });
  }, origin);
}

export function renameSlide(
  doc: Y.Doc,
  slideId: string,
  title: string,
  origin: object
): void {
  doc.transact(() => {
    const slide = slidesOf(doc).get(slideId);
    if (slide) slidesOf(doc).set(slideId, { ...slide, title });
  }, origin);
}

// ---------------------------------------------------------------------------
// 묶기
// ---------------------------------------------------------------------------

/**
 * 묶인 물체를 하나라도 고르면 같은 묶음 전체를 고른 것으로 친다.
 * 파워포인트에서 묶은 도형을 클릭하면 전체가 잡히는 것과 같다.
 */
export function expandToGroups(doc: Y.Doc, ids: string[]): string[] {
  const objects = objectsOf(doc);
  const groups = new Set<string>();
  ids.forEach((id) => {
    const g = objects.get(id)?.groupId;
    if (g) groups.add(g);
  });
  if (groups.size === 0) return ids;

  const result = new Set(ids);
  objects.forEach((obj, id) => {
    if (obj.groupId && groups.has(obj.groupId)) result.add(id);
  });
  return [...result];
}

export function groupObjects(doc: Y.Doc, ids: string[], origin: object): void {
  if (ids.length < 2) return;
  const groupId = createId();
  const objects = objectsOf(doc);
  doc.transact(() => {
    ids.forEach((id) => {
      const obj = objects.get(id);
      if (obj) objects.set(id, { ...obj, groupId });
    });
  }, origin);
}

export function ungroupObjects(doc: Y.Doc, ids: string[], origin: object): void {
  if (ids.length === 0) return;
  const objects = objectsOf(doc);
  doc.transact(() => {
    ids.forEach((id) => {
      const obj = objects.get(id);
      if (obj?.groupId) {
        const next = { ...obj };
        delete next.groupId;
        objects.set(id, next);
      }
    });
  }, origin);
}

/** 고른 것 중에 묶인 게 있는지 */
export function hasGroupedObject(doc: Y.Doc, ids: string[]): boolean {
  const objects = objectsOf(doc);
  return ids.some((id) => !!objects.get(id)?.groupId);
}
