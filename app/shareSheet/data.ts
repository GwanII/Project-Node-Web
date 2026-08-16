/**
 * shareSheet 데이터 계층.
 *
 * 화면 코드는 이 파일의 함수만 호출한다.
 * 나중에 Supabase 를 붙일 때 "이 파일 안쪽만" 바꾸면 되고,
 * page.tsx / Editor.tsx / Sidebar.tsx 등은 한 줄도 고칠 필요가 없다.
 *
 * 그래서 지금부터 지켜둔 것 3가지:
 *  1. 모든 함수가 async  — 로컬 저장은 즉시 끝나지만 DB 는 시간이 걸린다.
 *                          지금 동기로 짜두면 나중에 모든 호출부에 await 를 붙이러 다녀야 한다.
 *  2. id 는 문자열(uuid) — Supabase 기본이 uuid 라서 숫자로 두면 나중에 타입이 전부 깨진다.
 *  3. 날짜는 ISO 문자열   — "2026/08/15 마감" 같은 형식은 DB 에서 정렬·필터가 안 된다.
 */

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export type ResourceSubType = "png" | "jpg" | "url" | "audio" | "ppt" | "file";

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
  points: Point[];
  color: string;
  width: number;
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

// ---------------------------------------------------------------------------
// 저장소 — 지금은 브라우저 localStorage. 나중에 여기만 Supabase 로 바꾼다.
// ---------------------------------------------------------------------------

const DOC_KEY = (id: string) => `shareSheet:doc:${id}`;
const SIDEBAR_KEY = "shareSheet:sidebar";

/** 서버 렌더링 중에는 localStorage 가 없다. */
const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

function readJson<T>(key: string): T | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // 저장된 값이 깨졌으면 기본값으로 시작한다.
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 꽉 찬 경우 등. 화면을 멈추지는 않는다.
  }
}

/**
 * 지금 이 문서를 보고 있는 사람.
 *
 * 로그인이 붙기 전까지 쓰는 임시 값이다. 투표에서 "누가 골랐는지" 를 기록하는 데 쓴다.
 * 나중에 Supabase 인증이 붙으면 로그인한 사용자 id 로 바꾸면 되고,
 * 이 상수만 바꾸면 되도록 한 곳에 모아뒀다.
 */
export const CURRENT_USER = "박성빈";

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
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
// 기본값 — 처음 열었을 때 보여줄 내용
// ---------------------------------------------------------------------------

const DEFAULT_CONTENT = `
  <h1>큰 글씨</h1>
  <p></p>
  <p>여기에 내용을 입력하세요. 글자를 드래그하면 서식 도구가 나타납니다.</p>
`;

const DEFAULT_SIDEBAR: SidebarData = {
  files: [
    { id: "seed-file-1", name: "1주차 회의록" },
    { id: "seed-file-2", name: "2주차 회의록" },
    { id: "seed-file-3", name: "3주차 회의록" },
    { id: "seed-file-4", name: "4주차 회의록" },
    { id: "seed-file-5", name: "5주차 회의록" },
    { id: "seed-file-6", name: "프로젝트 기획서" },
  ],
  calendars: [
    { id: "seed-cal-1", name: "캘린더 1" },
    { id: "seed-cal-2", name: "캘린더 2" },
  ],
  resources: [
    { id: "seed-res-1", name: "디자인 초안", subType: "png" },
    { id: "seed-res-2", name: "버튼 디자인", subType: "jpg" },
    { id: "seed-res-3", name: "참고하는 URL", subType: "url" },
    { id: "seed-res-4", name: "버튼 클릭 효과음", subType: "audio" },
    { id: "seed-res-5", name: "1차 발표 자료", subType: "ppt" },
  ],
};

// ---------------------------------------------------------------------------
// 공개 API — 화면 코드는 여기까지만 쓴다
// ---------------------------------------------------------------------------

/**
 * 문서를 불러온다. 저장된 게 없으면 기본 문서를 돌려준다.
 *
 * Supabase 로 바꿀 때:
 *   const { data } = await supabase.from('documents').select('*').eq('id', id).single();
 */
export async function loadDocument(id: string): Promise<SheetDocument> {
  const saved = readJson<SheetDocument>(DOC_KEY(id));

  if (saved) {
    return {
      ...saved,
      // 예전에 저장된 값에 없던 항목이 생겨도 화면이 깨지지 않게 기본값을 채운다.
      strokes: saved.strokes ?? [],
      isLocked: saved.isLocked ?? false,
    };
  }

  return {
    id,
    title: "프로젝트 기획서 / 예시 파일",
    content: DEFAULT_CONTENT,
    strokes: [],
    isLocked: false,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 문서를 저장하고, 저장 시각이 반영된 문서를 돌려준다.
 *
 * Supabase 로 바꿀 때:
 *   await supabase.from('documents').upsert({ ...doc, updated_at: saved.updatedAt });
 */
export async function saveDocument(doc: SheetDocument): Promise<SheetDocument> {
  const saved: SheetDocument = { ...doc, updatedAt: new Date().toISOString() };
  writeJson(DOC_KEY(doc.id), saved);
  return saved;
}

/**
 * 사이드바 목록을 불러온다.
 *
 * Supabase 로 바꿀 때:
 *   const { data } = await supabase.from('sheet_items').select('*').order('sort_order');
 */
export async function loadSidebar(): Promise<SidebarData> {
  const saved = readJson<SidebarData>(SIDEBAR_KEY);
  if (!saved) return DEFAULT_SIDEBAR;

  return {
    files: saved.files ?? [],
    calendars: saved.calendars ?? [],
    resources: saved.resources ?? [],
  };
}

/**
 * 사이드바 목록을 저장한다.
 *
 * Supabase 로 바꿀 때:
 *   await supabase.from('sheet_items').upsert(...);
 */
export async function saveSidebar(data: SidebarData): Promise<void> {
  writeJson(SIDEBAR_KEY, data);
}
