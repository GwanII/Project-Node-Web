/**
 * shareSheet 데이터 계층.
 *
 * 화면 코드는 이 파일의 함수만 호출한다.
 * 저장 위치가 바뀌어도 page.tsx / Editor.tsx / Sidebar.tsx 는 고칠 필요가 없다.
 *
 * 지금은 Supabase 에 저장한다. (이전에는 브라우저 localStorage 였다.)
 * 로그인 세션을 쿠키로 관리하는 src/lib/supabase.ts 를 쓴다.
 * lib/supabase.ts 도 있지만 그건 localStorage 방식이라, 나중에 "로그인한 사람만"
 * 권한을 걸 때 서버가 세션을 못 읽는다. 팀에서 하나로 합칠 때 이쪽으로 모으면 된다.
 *
 * 코드는 낙타표기(isLocked), 데이터베이스는 밑줄표기(is_locked)를 쓴다.
 * 각 동네의 관례라서, 변환은 이 파일 안에서만 한다.
 */

import { supabase } from "@/src/lib/supabase";

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export type ResourceSubType = "png" | "jpg" | "url" | "audio" | "ppt" | "file";

export type SectionKey = "files" | "calendars" | "resources";

export interface SidebarItem {
  id: string;
  name: string;
  subType?: ResourceSubType;
}

export interface SidebarData {
  files: SidebarItem[];
  calendars: SidebarItem[];
  resources: SidebarItem[];
}

export interface Point {
  x: number;
  /** 문서 기준 y 좌표(스크롤 포함). 화면 기준이 아니라서 스크롤해도 제자리에 남는다. */
  y: number;
}

export interface Stroke {
  /** 획마다 붙는 고유 번호. 동시 편집에서 "어느 획인지" 를 가리키는 이름표다. */
  id: string;
  points: Point[];
  color: string;
  width: number;
  /** 같은 값을 가진 획끼리 한 묶음으로 다룬다. 묶이지 않았으면 없다. */
  groupId?: string;
  /** 겹칠 때 누가 위에 오는지. Y.Map 은 순서를 보장하지 않아서 따로 들고 있어야 한다. */
  order: number;
}

/**
 * 예전에 저장된 획에는 id 와 order 가 없다.
 * 불러올 때 한 번 채워 넣어서 새 구조로 옮긴다.
 */
export function ensureStrokeFields(strokes: Stroke[]): Stroke[] {
  return strokes.map((stroke, index) => ({
    ...stroke,
    id: stroke.id ?? createId(),
    order: stroke.order ?? index,
  }));
}

export interface SheetDocument {
  id: string;
  title: string;
  /** Tiptap 이 만들어내는 HTML */
  content: string;
  strokes: Stroke[];
  isLocked: boolean;
  /** ISO 8601 문자열 */
  updatedAt: string;
}

/** documents 테이블 한 줄의 모양 */
interface DocumentRow {
  id: string;
  title: string;
  content: string;
  strokes: Stroke[] | null;
  is_locked: boolean;
  updated_at: string;
}

/** sheet_items 테이블 한 줄의 모양 */
interface SheetItemRow {
  id: string;
  section: SectionKey;
  name: string;
  sub_type: ResourceSubType | null;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// 공통 도구
// ---------------------------------------------------------------------------

/**
 * 지금 이 문서를 보고 있는 사람.
 *
 * 로그인이 붙기 전까지 쓰는 임시 값이다. 투표에서 "누가 골랐는지" 를 기록하는 데 쓴다.
 * 나중에 Supabase 인증이 붙으면 로그인한 사용자 id 로 바꾸면 되고,
 * 이 상수만 바꾸면 되도록 한 곳에 모아뒀다.
 */
export const CURRENT_USER = "박성빈";

/**
 * 지금 화면을 보고 있는 사람의 표시 이름.
 *
 * 로그인이 되어 있으면 그 계정 이름을 쓰고, 아니면 위의 임시 이름을 쓴다.
 * shareSheet 에는 아직 로그인 검사가 없어서 대부분 임시 이름으로 떨어지는데,
 * 팀에서 로그인 필수로 바꾸면 이 함수가 자동으로 실제 이름을 돌려준다.
 */
export async function getMyName(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (email) return email.split("@")[0];
  } catch {
    // 로그인 확인이 실패해도 화면은 그대로 돌아가야 한다.
  }
  return CURRENT_USER;
}

/**
 * 오늘 날짜 "yyyy-mm-dd". 모듈이 처음 불릴 때 한 번만 계산한다.
 * (렌더 중에 현재 시각을 읽으면 리렌더마다 값이 달라져 불안정해진다.)
 *
 * toISOString() 을 쓰면 안 된다. 그건 UTC 기준이라 한국(UTC+9)에서는
 * 아침 9시 이전에 하루 전 날짜가 나온다. 그래서 지역 시간 값을 직접 조립한다.
 */
export const TODAY = (() => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
})();

/** 이번 달 "yyyy-mm". */
export const THIS_MONTH = TODAY.slice(0, 7);

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // 아주 오래된 브라우저용 대비책. sheet_items.id 는 uuid 형식이라야 하므로 모양을 맞춘다.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 파일 이름의 확장자를 보고 자료 보관함 배지 종류를 정한다. */
export function inferResourceSubType(fileName: string): ResourceSubType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "png";
  if (["jpg", "jpeg"].includes(ext)) return "jpg";
  if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (fileName.startsWith("http")) return "url";
  return "file";
}

// ---------------------------------------------------------------------------
// 기본값 — 데이터베이스가 비어 있을 때 처음 한 번 넣어줄 내용
// ---------------------------------------------------------------------------

const DEFAULT_CONTENT = `
  <h1>큰 글씨</h1>
  <p></p>
  <p>여기에 내용을 입력하세요. 글자를 드래그하면 서식 도구가 나타납니다.</p>
`;

const DEFAULT_TITLE = "프로젝트 기획서 / 예시 파일";

const DEFAULT_SIDEBAR_NAMES: Record<SectionKey, Array<[string, ResourceSubType?]>> = {
  files: [
    ["1주차 회의록"],
    ["2주차 회의록"],
    ["3주차 회의록"],
    ["4주차 회의록"],
    ["5주차 회의록"],
    ["프로젝트 기획서"],
  ],
  calendars: [["캘린더 1"], ["캘린더 2"]],
  resources: [
    ["디자인 초안", "png"],
    ["버튼 디자인", "jpg"],
    ["참고하는 URL", "url"],
    ["버튼 클릭 효과음", "audio"],
    ["1차 발표 자료", "ppt"],
  ],
};

function buildDefaultSidebar(): SidebarData {
  const make = (section: SectionKey): SidebarItem[] =>
    DEFAULT_SIDEBAR_NAMES[section].map(([name, subType]) => ({
      id: createId(),
      name,
      ...(subType ? { subType } : {}),
    }));

  return {
    files: make("files"),
    calendars: make("calendars"),
    resources: make("resources"),
  };
}

// ---------------------------------------------------------------------------
// 변환 — 데이터베이스 줄 ↔ 화면에서 쓰는 모양
// ---------------------------------------------------------------------------

function rowToDocument(row: DocumentRow): SheetDocument {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    strokes: row.strokes ?? [],
    isLocked: row.is_locked,
    updatedAt: row.updated_at,
  };
}

function documentToRow(doc: SheetDocument, updatedAt: string): DocumentRow {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    strokes: doc.strokes ?? [],
    is_locked: doc.isLocked,
    updated_at: updatedAt,
  };
}

// ---------------------------------------------------------------------------
// 문서
// ---------------------------------------------------------------------------

/**
 * 문서를 불러온다.
 * 저장된 게 없으면 기본 문서를 만들어 넣고 그걸 돌려준다.
 * 통신이 실패해도 화면이 죽지 않도록, 최악의 경우 기본 문서를 그냥 돌려준다.
 */
export async function loadDocument(id: string): Promise<SheetDocument> {
  const fallback: SheetDocument = {
    id,
    title: DEFAULT_TITLE,
    content: DEFAULT_CONTENT,
    strokes: [],
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[shareSheet] 문서 불러오기 실패:", error.message);
    return fallback;
  }

  if (data) return rowToDocument(data as DocumentRow);

  // 처음 여는 경우: 기본 문서를 만들어 둔다.
  const { error: insertError } = await supabase
    .from("documents")
    .insert(documentToRow(fallback, fallback.updatedAt));

  if (insertError) {
    console.error("[shareSheet] 기본 문서 생성 실패:", insertError.message);
  }
  return fallback;
}

/**
 * 문서를 저장하고, 저장 시각이 반영된 문서를 돌려준다.
 * 같은 id 가 이미 있으면 덮어쓰고, 없으면 새로 넣는다.
 */
export async function saveDocument(doc: SheetDocument): Promise<SheetDocument> {
  const updatedAt = new Date().toISOString();

  const { error } = await supabase
    .from("documents")
    .upsert(documentToRow(doc, updatedAt), { onConflict: "id" });

  if (error) {
    console.error("[shareSheet] 문서 저장 실패:", error.message);
    // 저장은 실패했어도 화면 상태는 유지한다.
    return doc;
  }

  return { ...doc, updatedAt };
}

// ---------------------------------------------------------------------------
// 동시 편집 상태 (Yjs)
//
// documents.content 는 "지금 화면에 보이는 결과"(HTML)이고,
// ydoc_state 는 "누가 언제 무엇을 고쳤는지"까지 담은 Yjs 원본이다.
// 아무도 접속해 있지 않을 때 새로 들어온 사람은 이 값으로 문서를 복원한다.
// 바이트 덩어리라서 base64 문자열로 감싸 text 칸에 넣는다.
// ---------------------------------------------------------------------------

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function loadYDocState(id: string): Promise<Uint8Array | null> {
  const { data, error } = await supabase
    .from("documents")
    .select("ydoc_state")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[shareSheet] 편집 상태 불러오기 실패:", error.message);
    return null;
  }

  const raw = (data as { ydoc_state: string | null } | null)?.ydoc_state;
  if (!raw) return null;

  try {
    return base64ToBytes(raw);
  } catch {
    console.error("[shareSheet] 편집 상태가 손상되어 무시합니다.");
    return null;
  }
}

export async function saveYDocState(id: string, state: Uint8Array): Promise<void> {
  const { error } = await supabase
    .from("documents")
    .update({ ydoc_state: bytesToBase64(state) })
    .eq("id", id);

  if (error) {
    console.error("[shareSheet] 편집 상태 저장 실패:", error.message);
  }
}

// ---------------------------------------------------------------------------
// 사이드바 목록
// ---------------------------------------------------------------------------

function groupItems(rows: SheetItemRow[]): SidebarData {
  const empty: SidebarData = { files: [], calendars: [], resources: [] };

  return rows.reduce((acc, row) => {
    acc[row.section].push({
      id: row.id,
      name: row.name,
      ...(row.sub_type ? { subType: row.sub_type } : {}),
    });
    return acc;
  }, empty);
}

/**
 * 사이드바 목록을 불러온다.
 * 비어 있으면 기본 목록을 만들어 넣고 그걸 돌려준다.
 */
export async function loadSidebar(): Promise<SidebarData> {
  const { data, error } = await supabase
    .from("sheet_items")
    .select("*")
    .order("section")
    .order("sort_order");

  if (error) {
    console.error("[shareSheet] 사이드바 불러오기 실패:", error.message);
    return buildDefaultSidebar();
  }

  const rows = (data ?? []) as SheetItemRow[];
  if (rows.length > 0) return groupItems(rows);

  // 처음 여는 경우: 기본 목록을 만들어 둔다.
  const seed = buildDefaultSidebar();
  await saveSidebar(seed);
  return seed;
}

/**
 * 사이드바 목록을 저장한다.
 *
 * 화면에서 목록 전체를 넘겨주므로, 지금 있는 것은 넣거나 덮어쓰고(upsert)
 * 화면에서 사라진 것은 지운다. 전부 지우고 다시 넣지 않는 이유는,
 * 그 사이에 목록이 텅 빈 순간이 생기기 때문이다.
 */
export async function saveSidebar(data: SidebarData): Promise<void> {
  const rows: SheetItemRow[] = (
    ["files", "calendars", "resources"] as SectionKey[]
  ).flatMap((section) =>
    data[section].map((item, index) => ({
      id: item.id,
      section,
      name: item.name,
      sub_type: item.subType ?? null,
      sort_order: index,
    }))
  );

  const { error: upsertError } = await supabase
    .from("sheet_items")
    .upsert(rows, { onConflict: "id" });

  if (upsertError) {
    console.error("[shareSheet] 사이드바 저장 실패:", upsertError.message);
    return;
  }

  // 화면에서 지워진 항목을 데이터베이스에서도 지운다.
  const keepIds = rows.map((r) => r.id);
  const { error: deleteError } =
    keepIds.length > 0
      ? await supabase
          .from("sheet_items")
          .delete()
          .not("id", "in", `(${keepIds.join(",")})`)
      : await supabase.from("sheet_items").delete().neq("id", createId());

  if (deleteError) {
    console.error("[shareSheet] 사이드바 정리 실패:", deleteError.message);
  }
}
