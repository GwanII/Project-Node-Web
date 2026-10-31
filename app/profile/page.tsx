"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";
import { renderPromptTemplate } from "@/src/lib/promptTemplate";

// ── 로컬 LLM(Ollama) 설정 ──
const OLLAMA_URL   = process.env.NEXT_PUBLIC_OLLAMA_URL   ?? "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? "qwen2.5:7b";

// ── 업로드 파일에서 텍스트 추출 ──
const MAX_CHARS_PER_FILE = 3000;   // 파일당 AI에 넘길 최대 글자 수
const MAX_FILES_TO_READ   = 5;
const MAX_IMAGES_IN_REPORT = 6;

// files.name 에는 확장자가 없을 수 있어요(URL 링크, 이름만 저장된 경우).
// storage_path 를 먼저 보고, 없으면 name 을 봅니다.
function extOf(f: { name?: string; storage_path?: string }): string {
  const src = f.storage_path || f.name || "";
  const m = src.toLowerCase().match(/\.([a-z0-9]+)(?:\?.*)?$/);
  return m ? m[1] : "";
}
const TEXTLIKE_EXT = ["pdf", "txt", "md", "csv", "json", "pptx", "docx"];

// sheet_items 의 컬럼 이름이 팀마다 다를 수 있어서, 있을 법한 이름을 모두 확인합니다.
type MeetingRow = { name?: string; content?: string } & Record<string, unknown>;

const PROJECT_ID_KEYS   = ["project_id", "projectId", "projectdata_id", "project"];
const PROJECT_NAME_KEYS = ["project_name", "projectName", "project_title", "projectdata_name"];

function firstValue(row: MeetingRow, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}
const projectIdOf   = (row: MeetingRow) => firstValue(row, PROJECT_ID_KEYS);
const projectNameOf = (row: MeetingRow) => firstValue(row, PROJECT_NAME_KEYS);

// "예비 1" / "예비1" / "예비1 " 을 같은 것으로 봅니다.
const normName = (v: string | null | undefined) =>
  (v ?? "").toLowerCase().replace(/[\s_-]+/g, "");
const sameName = (a: string | null | undefined, b: string | null | undefined) =>
  normName(a) !== "" && normName(a) === normName(b);
const IMAGE_EXT    = ["png", "jpg", "jpeg", "gif", "webp"];

// 모델이 가끔 중국어 한자를 섞어서 내놓아요. 한자가 든 태그는 버립니다.
const HANZI = /[\u4e00-\u9fff]/;
const FALLBACK_TAGS = ["#UIUX", "#디자인시스템", "#협업", "#프로토타입", "#프로젝트관리"];

function sanitizeTags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map(String).map(t => t.trim()).filter(Boolean) : [];
  const clean = list.filter(t => !HANZI.test(t));
  if (clean.length < list.length) {
    console.warn("🈲 한자가 섞인 태그를 제거했어요:", list.filter(t => HANZI.test(t)));
  }
  // 걸러내고 너무 적게 남으면 기본 태그로 채우기
  for (const f of FALLBACK_TAGS) {
    if (clean.length >= 5) break;
    if (!clean.includes(f)) clean.push(f);
  }
  return clean.slice(0, 5);
}     // 최대 몇 개 파일까지 읽을지

async function extractPdfText(blob: Blob): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

  const buf = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;

  let text = "";
  const pages = Math.min(pdf.numPages, 10);   // 최대 10페이지
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? (it.str ?? "") : "")).join(" ") + "\n";
    text += content.items.map((it) => ("str" in it ? (it.str ?? "") : "")).join(" ") + "\n";
    if (text.length > MAX_CHARS_PER_FILE) break;
  }
  return text.slice(0, MAX_CHARS_PER_FILE);
}

// pptx·docx 는 사실 zip 파일이에요. 안의 XML에서 글자만 긁어옵니다.
async function extractOoxmlText(blob: Blob, kind: "pptx" | "docx"): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const entries = kind === "pptx"
    ? Object.keys(zip.files)
        .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))
    : ["word/document.xml"];

  const tag = kind === "pptx" ? "a:t" : "w:t";
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "g");

  let text = "";
  for (const entry of entries) {
    const file = zip.files[entry];
    if (!file) continue;
    const xml = await file.async("string");
    const chunks: string[] = [];
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(xml)) !== null) chunks.push(m[1]);
    const joined = chunks.join(" ").replace(/\s+/g, " ").trim();
    if (joined) text += joined + "\n";
    if (text.length > MAX_CHARS_PER_FILE) break;
  }
  return text.slice(0, MAX_CHARS_PER_FILE);
}

async function readFileContent(storagePath: string, fileName: string): Promise<string | null> {
  const ext = extOf({ name: fileName, storage_path: storagePath });
  const isPdf   = ext === "pdf";
  const isOoxml = ext === "pptx" || ext === "docx";
  const isText  = ["txt", "md", "csv", "json"].includes(ext);
  if (!isPdf && !isOoxml && !isText) return null;

  try {
    const { data } = await supabase.storage.from("cobalt-files").download(storagePath);
    if (!data) return null;
    if (isPdf)   return await extractPdfText(data);
    if (isOoxml) return await extractOoxmlText(data, ext as "pptx" | "docx");
    return (await data.text()).slice(0, MAX_CHARS_PER_FILE);
  } catch (e) {
    console.warn("파일 읽기 실패:", fileName, e);
    return null;
  }
}

const COLOR = {
  main: "#8E9BFF",
  point: "#7388FF",
  border: "#A5B8FF",
  mainBg: "#EEF2FF",
  danger: "#EF4444",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray800: "#1F2937",
  white: "#FFFFFF",
};

type ProjectItem = { id: string; name: string; period: string; path: string };

// 시작·종료일로 "2026.06 ~ 2026.08 (8주)" 형태 생성
function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return "기간 미정";
  const s = new Date(start), e = new Date(end);
  const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  const weeks = Math.max(1, Math.round((e.getTime() - s.getTime()) / (7 * 86400000)));
  return `${fmt(s)} ~ ${fmt(e)} (${weeks}주)`;
}

const PERFORMANCE = [
  { label: "디자인", pct: 85 },
  { label: "기획·회의", pct: 60 },
  { label: "문서 정리", pct: 70 },
];

type Todo = { id: string; text: string; done: boolean; week?: string; project?: string; projectPath?: string };

type ReportImage = { name: string; url: string };

type ReportResult = {
  summary: string;
  achievements: string[];
  coverLetter: string;
  tags: string[];
  pct: number;
  doneCnt: number;
  pendingCnt: number;
  total: number;
  images?: ReportImage[];          // 회의록 사진·산출물 썸네일
  evidenceMeetings?: string[];     // 분석에 사용한 회의록 제목
  evidenceFiles?: string[];        // 분석에 사용한 문서 이름
};

type ReportRow = {
  id: string;
  project_name: string;
  created_at: string;
  result: ReportResult;
};

// 이번 주 월~일 범위 계산
function thisWeekRange() {
  const now = new Date();
  const day = now.getDay();                 // 0=일
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0,0,0,0);
  const sun = new Date(mon);  sun.setDate(mon.getDate() + 6);        sun.setHours(23,59,59,999);
  const label = `이번주(${mon.getMonth()+1}/${mon.getDate()}~${sun.getMonth()+1}/${sun.getDate()})에 할 일`;
  return { start: mon, end: sun, label };
}

function ProgressBar({ pct, color = COLOR.point }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 8, background: COLOR.gray100, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.6s ease" }} />
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: COLOR.white, borderRadius: 16, border: `1px solid ${COLOR.border}`, padding: "18px 20px", ...style }}>
      {children}
    </div>
  );
}

function EditableField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, color: COLOR.gray600, display: "block", marginBottom: 6 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${editing ? COLOR.point : COLOR.gray200}`, borderRadius: 10, padding: "10px 14px", background: editing ? COLOR.white : COLOR.gray50 }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} readOnly={!editing}
          style={{ flex: 1, border: "none", background: "transparent", fontSize: 14, outline: "none", color: COLOR.gray800, cursor: editing ? "text" : "default" }} />
        <button onClick={() => setEditing(!editing)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: editing ? COLOR.point : COLOR.gray400, padding: 0, flexShrink: 0 }}>
          {editing ? "✓" : "✏"}
        </button>
      </div>
    </div>
  );
}

function TodoRow({ todo, onToggle, onDelete }: { todo: Todo; onToggle: () => void; onDelete?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}
         onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button onClick={onToggle} style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, padding: 0, cursor: "pointer", border: `2px solid ${todo.done ? COLOR.point : COLOR.gray400}`, background: todo.done ? COLOR.point : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {todo.done && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
      </button>
      <span style={{ fontSize: 14, flex: 1, textDecoration: todo.done ? "line-through" : "none", color: todo.done ? COLOR.gray400 : COLOR.gray800 }}>{todo.text}</span>
      {todo.project && todo.projectPath && (
        <Link href={todo.projectPath} style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: todo.done ? COLOR.gray400 : COLOR.point, background: todo.done ? COLOR.gray100 : COLOR.mainBg, padding: "3px 8px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
          {todo.project} ›
        </Link>
      )}
      {onDelete && (
        <button onClick={onDelete} title="삭제"
          style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: "none", cursor: "pointer",
                   background: "transparent", color: COLOR.gray400, fontSize: 14, lineHeight: 1,
                   opacity: hover ? 1 : 0, transition: "opacity .15s" }}>×</button>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [todos, setTodos]             = useState<Todo[]>([]);
  const [newTodo, setNewTodo]         = useState("");
  const [showAll, setShowAll]         = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportRow[]>([]);
  const [showHistory, setShowHistory]     = useState(false);
  const [showReport, setShowReport]   = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [geminiResult, setGeminiResult]   = useState<ReportResult | null>(null);
  const [showEdit, setShowEdit]       = useState(false);
  const [showPwChange, setShowPwChange]   = useState(false);
  const [currentPw, setCurrentPw]         = useState("");
  const [newPw, setNewPw]                 = useState("");
  const [newPwConfirm, setNewPwConfirm]   = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projectList, setProjectList]             = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject]     = useState<ProjectItem>({
    id: "", name: "프로젝트 없음", period: "", path: "/mainpage",
  });
  const [kakaoOn, setKakaoOn]         = useState(true);
  const [profileImg, setProfileImg]   = useState<string | null>(null);

  // ── profiles 테이블에서 가져오는 정보 ──
  const [name, setName]         = useState("권소희");
  const [nickname, setNickname] = useState("권소희");
  const [email, setEmail]       = useState("");
  const [userId, setUserId]     = useState("");
  const imgInputRef = useRef<HTMLInputElement>(null);

  // ── Auth에서 현재 유저 ID 가져오기 ──
  const getAuthId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  };

  // ── profiles 테이블에서 불러오기 ──
  const fetchProfile = useCallback(async () => {
    const authId = await getAuthId();
    if (!authId) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", authId).maybeSingle();
    if (data) {
      setName(data.name ?? "권소희");
      setNickname(data.nickname ?? data.name ?? "권소희");
      setEmail(data.email ?? "");
      setUserId(data.nickname ?? "");
      setKakaoOn(data.kakao_notify ?? true);
      if (data.avatar_url) setProfileImg(data.avatar_url);
    }

    // 참여 중인 프로젝트 목록 불러오기
    const { data: rows } = await supabase
      .from("projectdata")
      .select("id, project_name, start_date, end_date")
      .eq("user_id", authId)
      .order("created_at", { ascending: false });

    if (rows && rows.length > 0) {
      const list: ProjectItem[] = rows.map((r: {
        id: string; project_name: string; start_date: string | null; end_date: string | null;
      }) => ({
        id: String(r.id),
        name: r.project_name,
        period: formatPeriod(r.start_date, r.end_date),
        path: "/mainpage",
      }));
      setProjectList(list);
      setSelectedProject(prev => (prev.id ? prev : list[0]));
    }

    // 할 일 목록 불러오기 (todos 테이블)
    const { data: todoRows, error: todoErr } = await supabase
      .from("todos")
      .select("id, text, completed, due_at, projectdata(project_name)")
      .eq("user_id", authId)
      .order("due_at", { ascending: true });

    if (todoErr) {
      console.warn("할 일 불러오기 실패:", todoErr.message);
    } else if (todoRows) {
      const { start, end, label } = thisWeekRange();
      const list: Todo[] = (todoRows as unknown as {
        id: string; text: string; completed: boolean | null; due_at: string | null;
        projectdata?: { project_name?: string } | { project_name?: string }[] | null;
      }[]).map(r => {
        const pj = Array.isArray(r.projectdata) ? r.projectdata[0] : r.projectdata;
        const due = r.due_at ? new Date(r.due_at) : null;
        const inThisWeek = !!due && due >= start && due <= end;
        return {
          id: String(r.id),
          text: r.text,
          done: !!r.completed,
          week: inThisWeek ? label : undefined,
          project: pj?.project_name,
          projectPath: "/mainpage",
        };
      });
      setTodos(list);
    }

    // 저장된 AI 리포트 히스토리 불러오기
    const { data: reportRows, error: reportErr } = await supabase
      .from("ai_reports")
      .select("id, project_name, created_at, result")
      .eq("user_id", authId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (reportErr) console.warn("리포트 히스토리 불러오기 실패:", reportErr.message);
    else if (reportRows) setReportHistory(reportRows as unknown as ReportRow[]);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── profiles 테이블에 저장 ──
  const handleSave = async () => {
    const authId = await getAuthId();
    if (!authId) { alert("로그인이 필요해요."); return; }
    const { error } = await supabase.from("profiles").update({
      name, nickname, email, kakao_notify: kakaoOn,
    }).eq("id", authId);
    if (error) { alert("저장 실패: " + error.message); return; }
    await fetchProfile();
    alert("저장됐어요!");
    setShowEdit(false);
  };

  // ── 프로필 사진 Storage 업로드 ──
  const handleProfileImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const authId = await getAuthId();
    if (!authId) return;
    const path = `avatars/${authId}_${Date.now()}.${f.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("cobalt-files").upload(path, f, { upsert: true });
    if (error) { alert("사진 업로드 실패"); return; }
    const { data: { publicUrl } } = supabase.storage.from("cobalt-files").getPublicUrl(path);
    setProfileImg(publicUrl);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", authId);
    e.target.value = "";
  };

  // ── 비밀번호 변경 ──
  const handlePwChange = async () => {
    if (!currentPw) { alert("현재 비밀번호를 입력해주세요."); return; }
    if (!newPw) { alert("새 비밀번호를 입력해주세요."); return; }
    if (newPw.length < 8) { alert("비밀번호는 8자 이상이어야 해요."); return; }
    if (!/[a-zA-Z]/.test(newPw)) { alert("영문자를 포함해야 해요."); return; }
    if (!/[0-9]/.test(newPw)) { alert("숫자를 포함해야 해요."); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPw)) { alert("특수문자를 1개 이상 포함해야 해요."); return; }
    if (newPw !== newPwConfirm) { alert("새 비밀번호가 일치하지 않아요."); return; }

    // 현재 비번 검증 — 이메일로 재로그인 시도
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { alert("이메일 정보를 불러올 수 없어요."); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email, password: currentPw,
    });
    if (signInError) { alert("현재 비밀번호가 틀렸어요."); return; }

    // 비번 변경
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { alert("변경 실패: " + error.message); return; }
    alert("비밀번호가 변경됐어요!");
    setCurrentPw(""); setNewPw(""); setNewPwConfirm(""); setShowPwChange(false);
  };

  // ── 생성된 리포트를 DB에 저장 ──
  const saveReport = async (
    result: ReportResult,
    meta?: { promptVersion: number | null; durationMs: number; status: string }
  ) => {
    const authId = await getAuthId();
    if (!authId) return;
    const { data, error } = await supabase.from("ai_reports").insert({
      user_id: authId,
      project_name: selectedProject.name,
      result,
      prompt_version: meta?.promptVersion ?? null,
      duration_ms: meta?.durationMs ?? null,
      status: meta?.status ?? "success",
    }).select("id, project_name, created_at, result").single();

    if (error) { console.warn("리포트 저장 실패:", error.message); return; }
    console.log("💾 리포트 저장 완료");
    setReportHistory(prev => [data as unknown as ReportRow, ...prev].slice(0, 10));
  };

  // ── 리포트를 PDF로 내보내기 (브라우저 인쇄 → PDF로 저장) ──
  const exportReportPdf = (r: ReportResult, projectName: string, projectPeriod: string) => {
    const esc = (t: string) => t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    const today = new Date().toLocaleDateString("ko-KR");
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(nickname)}_성과리포트_${esc(projectName)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
         color: #1f2024; line-height: 1.7; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #6b6f76; margin-bottom: 18px; }
  .rule { border: none; border-top: 2px solid #5a5ce0; margin: 0 0 18px; }
  .stats { display: flex; gap: 8px; margin-bottom: 18px; }
  .stat { flex: 1; border: 1px solid #e3e4e8; border-radius: 8px; padding: 10px; text-align: center; }
  .stat b { display: block; font-size: 19px; color: #5a5ce0; }
  .stat span { font-size: 11px; color: #6b6f76; }
  .summary { background: #f2f2fb; border-radius: 8px; padding: 12px 14px;
             font-weight: 600; color: #5a5ce0; text-align: center; margin-bottom: 18px; }
  h2 { font-size: 14px; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1px solid #e3e4e8; }
  ul { margin: 0 0 18px; padding-left: 18px; }
  li { font-size: 13px; margin-bottom: 7px; }
  .letter { background: #f8f8fc; border-left: 3px solid #5a5ce0; border-radius: 0 8px 8px 0;
            padding: 13px 15px; font-size: 13px; margin-bottom: 18px; }
  .tags { font-size: 12px; color: #6b6f76; }
  .gallery { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .shot { width: calc(50% - 4px); border: 1px solid #e3e4e8; border-radius: 8px;
          overflow: hidden; page-break-inside: avoid; }
  .shot img { width: 100%; height: 110px; object-fit: cover; display: block; }
  .shot p { margin: 0; padding: 5px 8px; font-size: 10px; color: #6b6f76;
            background: #f8f8fc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .evi { font-size: 11px; color: #6b6f76; margin: 0 0 18px; padding-left: 16px; }
  .evi li { margin-bottom: 3px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .foot { margin-top: 26px; font-size: 10px; color: #9a9ea6; text-align: center;
          border-top: 1px solid #e3e4e8; padding-top: 10px; }
</style></head><body>
<h1>${esc(nickname)} · 성과 리포트</h1>
<div class="meta">${esc(projectName)}${projectPeriod ? " · " + esc(projectPeriod) : ""} &nbsp;|&nbsp; 생성일 ${today}</div>
<hr class="rule">
<div class="stats">
  <div class="stat"><b>${r.pct}%</b><span>기여도</span></div>
  <div class="stat"><b>${r.doneCnt}</b><span>완료 할일</span></div>
  <div class="stat"><b>${r.pendingCnt}</b><span>미완료</span></div>
  <div class="stat"><b>${r.total}</b><span>전체</span></div>
</div>
<div class="summary">${esc(r.summary)}</div>
<h2>핵심 성과</h2>
<ul>${r.achievements.map(a => `<li>${esc(a)}</li>`).join("")}</ul>
<h2>자기소개서 추천 문장</h2>
<div class="letter">${esc(r.coverLetter)}</div>
<h2>역량 키워드</h2>
<p class="tags">${r.tags.map(esc).join("&nbsp; · &nbsp;")}</p>
${(r.images && r.images.length > 0) ? `
<h2>회의 · 산출물 기록</h2>
<div class="gallery">
  ${r.images.map(im => `<div class="shot"><img src="${esc(im.url)}" alt=""><p>${esc(im.name)}</p></div>`).join("")}
</div>` : ""}
${((r.evidenceMeetings && r.evidenceMeetings.length > 0) || (r.evidenceFiles && r.evidenceFiles.length > 0)) ? `
<h2>분석에 사용한 근거 자료</h2>
<ul class="evi">
  ${(r.evidenceMeetings ?? []).map(m => `<li>회의록 — ${esc(m)}</li>`).join("")}
  ${(r.evidenceFiles ?? []).map(f => `<li>문서 — ${esc(f)}</li>`).join("")}
</ul>` : ""}
<div class="foot">Cobalt Hub — AI 성과 리포트 · 본 문서는 실제 회의록과 산출물을 근거로 자동 생성되었습니다.</div>
</body></html>`;

    const w = window.open("", "_blank", "width=860,height=1000");
    if (!w) { alert("팝업이 차단됐어요. 주소창 오른쪽에서 팝업을 허용해주세요."); return; }
    w.document.write(html);
    w.document.close();
    // 이미지가 다 뜬 뒤에 인쇄창을 열어야 사진이 빈칸으로 안 나와요
    w.onload = () => {
      const imgs = Array.from(w.document.images);
      const waitAll = Promise.all(imgs.map(img => img.complete
        ? Promise.resolve()
        : new Promise<void>(done => { img.onload = () => done(); img.onerror = () => done(); })));
      Promise.race([waitAll, new Promise(r => setTimeout(r, 5000))]).then(() => { w.focus(); w.print(); });
    };
  };

  // ── 로컬 LLM 리포트 생성 ──
  const generateReport = async () => {
    setReportLoading(true);
    setGeminiResult(null);
    const reportStartedAt = performance.now();
    let liveVersionForLog: number | null = null;
    let fallbackEnabledForLog = true;

    const localDoneCnt = todos.filter(t => t.done).length;
    const localPct = todos.length > 0 ? Math.round((localDoneCnt / todos.length) * 100) : 0;

    try {
      const authId = await getAuthId();

      // 1. DB 데이터 수집
      const [{ data: profileData }, { data: filesData }, { data: meetingData }, { data: projectData }] = await Promise.all([
        supabase.from("profiles").select("name, nickname").eq("id", authId ?? "").maybeSingle(),
        supabase.from("files").select("name, type, created_at, storage_path, uploader, project_id"),
        supabase.from("sheet_items").select("*").eq("section", "files"),
        supabase.from("projectdata").select("project_name, description, start_date, end_date"),
      ]);

      const doneTodoList = todos.filter(t => t.done).map(t => t.text);
      const pendingTodoList = todos.filter(t => !t.done).map(t => t.text);
      // 파일 목록 + 읽을 수 있는 파일은 내용까지 추출
      // files.project_id 로 이번 프로젝트 파일만 고르고, 없으면 내가 올린 파일 전체
      const everyFile = (filesData ?? []) as {
        name: string; type: string; storage_path?: string; uploader?: string; project_id?: string | null;
      }[];
      const mine        = everyFile.filter(f => f.uploader === nickname);
      const byProjectId = selectedProject.id
        ? everyFile.filter(f => f.project_id && String(f.project_id) === String(selectedProject.id))
        : [];

      let allFiles = everyFile;
      let fileScope = "";
      if (byProjectId.length > 0)  { allFiles = byProjectId; fileScope = "이 프로젝트의 파일"; }
      else if (mine.length > 0)    { allFiles = mine;        fileScope = "내가 올린 파일 전체"; }
      else                         { allFiles = everyFile;   fileScope = "전체 파일(매칭 실패)"; }
      console.log(`📁 파일 기준: ${fileScope} — ${allFiles.length}개 (DB 전체 ${everyFile.length}개)`);

      const fileList = allFiles.map(f => `${f.name}(${f.type})`);

      console.table(allFiles.map(f => ({ name: f.name, type: f.type, ext: extOf(f), storage_path: f.storage_path })));

      const readable = allFiles
        .filter(f => f.storage_path && TEXTLIKE_EXT.includes(extOf(f)))
        .slice(0, MAX_FILES_TO_READ);

      const fileContents: string[] = [];
      for (const f of readable) {
        const text = await readFileContent(f.storage_path!, f.name);
        if (text && text.trim()) {
          fileContents.push(`[${f.name}]\n${text.trim()}`);
          console.log(`📄 문서 읽기 성공: ${f.name} (${text.trim().length}자)`);
        } else {
          console.warn(`📄 문서 읽기 실패/빈 내용: ${f.name}`);
        }
      }
      console.log(`📄 AI에 넣은 문서 ${fileContents.length}개 / 읽기 시도 ${readable.length}개 / 전체 파일 ${allFiles.length}개`);

      // 회의록 사진·산출물 이미지 모으기 (리포트에 첨부)
      const reportImages: ReportImage[] = allFiles
        .filter(f => f.storage_path && (IMAGE_EXT.includes(extOf(f)) || f.type === "image"))
        .slice(0, MAX_IMAGES_IN_REPORT)
        .map(f => ({
          name: f.name,
          url: supabase.storage.from("cobalt-files").getPublicUrl(f.storage_path!).data.publicUrl,
        }));
      console.log(`🖼️ 리포트에 첨부할 이미지 ${reportImages.length}개`);

      // 내 닉네임으로 잡힌 게 없으면, uploader 값이 안 맞는 건지 확인
      if (readable.length === 0 && reportImages.length === 0) {
        const { data: anyFiles } = await supabase
          .from("files").select("name, type, uploader, storage_path").limit(50);
        const rows = (anyFiles ?? []) as {name: string; type: string; uploader?: string; storage_path?: string}[];
        const uploaders = Array.from(new Set(rows.map(r => r.uploader ?? "(없음)")));
        console.warn(
          `⚠️ 내 파일에서 읽을 수 있는 자료를 못 찾았어요.\n` +
          `   현재 내 닉네임: "${nickname}"\n` +
          `   files 테이블의 uploader 값들: ${uploaders.join(", ")}\n` +
          `   → 위 목록에 내 닉네임이 없으면 업로더 값이 달라서 안 잡히는 거예요.`
        );
        console.table(rows.map(r => ({ name: r.name, type: r.type, uploader: r.uploader, ext: extOf(r) })));
      }
      // ── 선택한 프로젝트의 기록만 골라내기 ──
      const allMeetingsRaw = (meetingData ?? []) as MeetingRow[];

      // 같은 제목이 여러 번 있으면 내용이 가장 긴 것 하나만
      const byTitle = new Map<string, MeetingRow>();
      for (const m of allMeetingsRaw) {
        const key = String(m.name ?? "").trim();
        if (!key) continue;
        const prev = byTitle.get(key);
        if (!prev || (m.content?.length ?? 0) > (prev.content?.length ?? 0)) byTitle.set(key, m);
      }
      const allMeetings = Array.from(byTitle.values());

      // 1순위: project_id 일치 → 2순위: 이름 일치(공백·대소문자 무시) → 3순위: 전체
      const pid = selectedProject.id;
      const byId = pid
        ? allMeetings.filter(m => projectIdOf(m) !== null && String(projectIdOf(m)) === String(pid))
        : [];
      const byName = allMeetings.filter(m => sameName(projectNameOf(m), selectedProject.name));

      let targetMeetings: MeetingRow[];
      let matchedBy: string;
      if (byId.length > 0)        { targetMeetings = byId;        matchedBy = "project_id"; }
      else if (byName.length > 0) { targetMeetings = byName;      matchedBy = "project_name"; }
      else                        { targetMeetings = allMeetings; matchedBy = "매칭 실패 → 전체"; }

      console.log(
        `📝 기록 ${allMeetingsRaw.length}개 → 중복 제거 ${allMeetings.length}개 → ` +
        `분석 대상 ${targetMeetings.length}개 (기준: ${matchedBy})`
      );

      if (matchedBy.startsWith("매칭")) {
        console.warn(
          `⚠️ "${selectedProject.name}"(id=${pid || "없음"})에 연결된 기록을 못 찾아 전체를 사용합니다.\n` +
          `   sheet_items 의 프로젝트 이름들: ${Array.from(new Set(allMeetings.map(m => projectNameOf(m) ?? "(없음)"))).join(", ")}\n` +
          `   sheet_items 의 프로젝트 ID들: ${Array.from(new Set(allMeetings.map(m => String(projectIdOf(m) ?? "(없음)")))).join(", ")}\n` +
          `   sheet_items 의 컬럼들: ${allMeetingsRaw[0] ? Object.keys(allMeetingsRaw[0]).join(", ") : "(행 없음)"}`
        );
      }

      // 제목으로 회의록 / 문서 구분
      const isMeetingDoc = (n?: string) => /회의|미팅|논의|스크럼|회고/.test(n ?? "");
      const titleOf = (m: MeetingRow) => String(m.name ?? "").trim();
      const meetingList = targetMeetings.map(m =>
        m.content ? `[${titleOf(m)}]\n${m.content}` : titleOf(m)
      );
      const projectList = (projectData ?? []).map((p: {project_name: string; start_date: string; end_date: string}) => `${p.project_name}(${p.start_date}~${p.end_date})`);

      // 2. 배포된 프롬프트 버전 조회 (실패하면 기존 하드코딩 프롬프트로 대체)
      let livePrompt: {
        version: number;
        content: string;
        model: string;
        temperature: number;
        fallbackEnabled: boolean;
      } | null = null;
      try {
        const { data: liveRow } = await supabase
          .from("prompt_versions")
          .select("version, content, model, temperature, fallback_enabled")
          .eq("key", "cover_letter")
          .eq("is_live", true)
          .maybeSingle();
        if (liveRow) {
          livePrompt = {
            version: liveRow.version,
            content: liveRow.content,
            model: liveRow.model,
            temperature: liveRow.temperature,
            fallbackEnabled: liveRow.fallback_enabled,
          };
          liveVersionForLog = liveRow.version;
          fallbackEnabledForLog = liveRow.fallback_enabled;
        }
      } catch (e) {
        console.warn("배포된 프롬프트 조회 실패, 기본 프롬프트를 사용합니다:", e);
      }

      // 참고 자료(참여 프로젝트 / 진행 중인 할일 / 산출물 / 산출물 내용 / 회의 기록)를
      // {{documents}} 변수 하나로 묶는다. DB에 저장된 템플릿이 이 블록을 그대로 쓴다.
      const documentsBlock = [
        projectList.length > 0 ? `[참여 프로젝트]\n${projectList.join("\n")}` : "",
        pendingTodoList.length > 0 ? `[진행 중인 할일]\n${pendingTodoList.join("\n")}` : "",
        fileList.length > 0 ? `[제작·업로드한 산출물]\n${fileList.join("\n")}` : "",
        fileContents.length > 0 ? `[산출물 내용]\n${fileContents.join("\n\n")}` : "",
        meetingList.length > 0 ? `[참여한 회의 기록]\n${meetingList.join("\n\n")}` : "",
      ].filter(Boolean).join("\n\n") || "참고 자료 없음";

      const promptModel = livePrompt?.model ?? OLLAMA_MODEL;
      const promptTemperature = livePrompt?.temperature ?? 0.85;

      const prompt = livePrompt
        ? renderPromptTemplate(livePrompt.content, {
            nickname: profileData?.nickname ?? nickname,
            role: "UI 디자인",
            project_name: selectedProject.name,
            period: selectedProject.period,
            done_todos: doneTodoList.length > 0 ? doneTodoList.join("\n") : "없음",
            documents: documentsBlock,
            contribution: String(localPct),
          })
        : `당신은 취업 컨설턴트입니다. 대학생의 팀 프로젝트 기록을 분석해 자기소개서에 바로 쓸 수 있는 문장을 작성합니다.

[학생 정보]
- 이름: ${profileData?.nickname ?? nickname}
- 담당 파트: UI 디자인
- 프로젝트: ${selectedProject.name} (${selectedProject.period})

[참여 프로젝트]
${projectList.length > 0 ? projectList.join("\n") : "데이터 없음"}

[완료한 할일]
${doneTodoList.length > 0 ? doneTodoList.join("\n") : "없음"}

[진행 중인 할일]
${pendingTodoList.length > 0 ? pendingTodoList.join("\n") : "없음"}

[제작·업로드한 산출물]
${fileList.length > 0 ? fileList.join("\n") : "없음"}

[산출물 내용 — 이 학생이 직접 만든 문서입니다. 어떤 수준의 작업을 했는지 판단하는 근거로 쓰세요]
${fileContents.length > 0 ? fileContents.join("\n\n") : "읽을 수 있는 문서 없음"}

[참여한 회의 기록 — 이 안의 구체적인 의사결정과 담당 업무를 근거로 사용하세요]
${meetingList.length > 0 ? meetingList.join("\n\n") : "없음"}

[기여도] ${localPct}% (완료 ${localDoneCnt}/${todos.length}개)

=== 작성 규칙 (반드시 지킬 것) ===

1. 할일 제목을 그대로 베끼지 마세요.
   나쁜 예: "로그인 화면 디자인 완료"
   좋은 예: "사용자 진입 경험을 좌우하는 인증 플로우를 설계하며 입력 검증과 오류 안내 UX까지 직접 정의"

2. "열정을 보여주었습니다", "최선을 다했습니다", "많은 것을 배웠습니다" 같은
   알맹이 없는 표현을 금지합니다. 행동 → 판단 → 결과 순서로 서술하세요.

3. achievements 는 **반드시 정확히 3개**입니다. 1개나 2개만 쓰면 실패입니다.
   3개는 각각 서로 다른 역량을 보여줘야 합니다.
   - 1번: 설계·구현 역량 (무엇을 어떻게 만들었는가)
   - 2번: 협업·커뮤니케이션 역량 (팀에 어떤 기여를 했는가)
   - 3번: 문제해결·주도성 (스스로 발견하고 개선한 것)
   각 항목은 70~100자로 쓰세요. "무엇을 → 어떻게 → 그래서 무엇이 달라졌는지"가 한 항목 안에 모두 들어가야 합니다.
   짧게 끊지 말고, 구체적인 명사(화면 이름, 기능 이름, 문서 이름)를 최소 2개 이상 포함하세요.

4. coverLetter는 문자열 하나가 아니라 **문장 4개짜리 배열**로 출력하세요.
   각 문장은 반드시 110자 이상 160자 이하입니다. 100자 미만이면 실패입니다.
   짧게 쓰고 끝내지 말고, 한 문장 안에 "무엇을 / 왜 / 어떻게 / 그 결과"를 모두 넣어
   길게 이어 쓰세요. 쉼표로 절을 2~3개 연결하면 자연스럽게 길어집니다.
   - 1번 문장(110~160자): 어떤 프로젝트에서 어떤 배경으로 무슨 역할을 맡았는지.
     프로젝트명, 기간, 팀 규모, 본인 역할을 모두 명시하세요.
   - 2번 문장(110~160자): 진행 중 어떤 문제·제약을 발견했는지, 그리고 그것을
     판단한 근거가 무엇이었는지. 회의에서 논의된 안건을 근거로 드세요.
   - 3번 문장(110~160자): 그 문제를 어떻게 해결했는지. 사용한 도구·기술·방법과
     실제로 만든 산출물 이름을 구체적으로 쓰세요.
   - 4번 문장(110~160자): 그래서 무엇이 달라졌는지와, 이 경험에서 얻은 역량이
     앞으로 어떤 일에 쓰일 수 있는지.
   4문장 전체에 회의 기록·산출물에서 확인되는 실제 사실(논의된 안건, 작성한 문서,
   검토한 수치, 사용한 기술 이름)을 최소 4개 이상 녹이세요.
   면접관이 읽고 "이건 진짜 해본 사람이 쓴 글이다"라고 느끼도록 쓰세요.

5. summary는 30~45자로, 이 사람이 무엇을 해내는 사람인지 규정하세요.
   나쁜 예: "2/4 할일을 완료했습니다"
   좋은 예: "디자인 시스템으로 팀 효율을 끌어올린 UI 설계자"

6. tags는 기술 스택과 역량 키워드 **정확히 5개**. 할일 제목을 태그로 만들지 마세요.
   나쁜 예: "#로그인화면"
   좋은 예: "#UIUX", "#디자인시스템", "#협업"

8. 반드시 한국어로만 쓰세요. 중국어 한자(技术, 创新 등)나 영어 문장을 섞지 마세요.
   기술 이름(Figma, Supabase, React, Whisper API)만 원문 그대로 쓸 수 있습니다.
   태그도 모두 한국어로 쓰세요. 나쁜 예: "#技术创新" / 좋은 예: "#기술혁신"

9. 모든 문장은 "~했습니다" 체로 끝까지 통일하세요.
   "~했음", "~함" 같은 개조식과 섞어 쓰지 마세요.

10. 회의 기록에 이 학생의 구체적인 담당 업무나 제안이 나오면 반드시 활용하세요.
   회의에서 어떤 문제가 논의됐고, 그 결과 무엇을 맡았는지를 문장에 녹이면 설득력이 올라갑니다.
   단, 기록에 없는 내용을 지어내지 마세요. 근거가 없으면 있는 사실만 깊게 쓰세요.

=== 출력 형식 ===
아래 JSON만 출력하세요. 설명, 인사말, 마크다운 코드블록 금지.

{
  "summary": "30~45자 한 줄 규정",
  "achievements": ["설계 역량 70~100자", "협업 역량 70~100자", "주도성 70~100자"],
  "coverLetter": ["1번 문장 110~160자", "2번 문장 110~160자", "3번 문장 110~160자", "4번 문장 110~160자"],
  "tags": ["#태그1", "#태그2", "#태그3", "#태그4", "#태그5"]
}`;

      // 3. 로컬 LLM(Ollama) 호출
      const callLLM = async (p: string) => {
        const res = await fetch(OLLAMA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: promptModel,
            prompt: p,
            stream: false,
            format: "json",
            options: {
              temperature: promptTemperature,      // 배포된 버전 설정 (없으면 0.85)
              top_p: 0.92,
              repeat_penalty: 1.15,   // 같은 말 반복 억제
              num_predict: 3000,
            },
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
        const raw = data.response ?? "";
        if (!raw) throw new Error("응답이 비어있어요.");
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
      };

      const parsed = await callLLM(prompt);
      console.log("LLM 1차 응답:", parsed);

      // coverLetter가 배열로 오면 한 문단으로 합치기
      const joinLetter = (v: unknown): string =>
        Array.isArray(v) ? v.map(String).map(x => x.trim()).filter(Boolean).join(" ") : String(v ?? "");

      let coverLetter = joinLetter(parsed.coverLetter);
      console.log(`✍️ 자소서 1차 길이: ${coverLetter.length}자`);

      // 너무 짧으면 "늘려쓰기" 2차 호출
      if (coverLetter.length < 350) {
        console.log("✍️ 너무 짧아서 확장 요청을 보냅니다...");
        try {
          const expandPrompt = `아래는 ${nickname} 학생의 자기소개 문단 초안입니다.

[초안]
${coverLetter}

[참고할 수 있는 실제 근거]
${fileContents.length > 0 ? fileContents.join("\n\n").slice(0, 2500) : "없음"}

${meetingList.length > 0 ? meetingList.join("\n\n").slice(0, 2500) : "없음"}

=== 할 일 ===
초안의 내용과 사실관계는 그대로 유지하면서, 문장을 훨씬 길고 구체적으로 다시 쓰세요.
- 반드시 4문장으로 만드세요. 각 문장은 110자 이상 160자 이하입니다.
- 새로운 사실을 지어내지 말고, 초안과 위 근거에 있는 내용만 풀어 쓰세요.
- 각 문장 안에 "무엇을 / 왜 / 어떻게 / 그 결과"를 모두 넣고, 쉼표로 절을 2~3개 연결해 길게 쓰세요.
- 모든 문장은 "~했습니다" 체로 통일하세요.

아래 JSON만 출력하세요.
{ "coverLetter": ["문장1", "문장2", "문장3", "문장4"] }`;
          const expanded = await callLLM(expandPrompt);
          const longer = joinLetter(expanded.coverLetter);
          console.log(`✍️ 자소서 2차 길이: ${longer.length}자`);
          if (longer.length > coverLetter.length) coverLetter = longer;
        } catch (e) {
          console.warn("확장 요청 실패, 1차 결과를 사용합니다:", e);
        }
      }

      // 핵심 성과가 3개가 아니면 다시 요청 (모델이 1~2개만 내놓을 때가 있어요)
      let achievements: string[] = Array.isArray(parsed.achievements) ? parsed.achievements.map(String) : [];
      console.log(`🏅 핵심 성과 1차: ${achievements.length}개`);

      if (achievements.length < 3) {
        console.log("🏅 3개가 안 돼서 다시 요청합니다...");
        try {
          const fixPrompt = `아래는 ${nickname} 학생의 프로젝트 기록입니다.

[회의 기록]
${meetingList.length > 0 ? meetingList.join("\n\n").slice(0, 3000) : "없음"}

[산출물 내용]
${fileContents.length > 0 ? fileContents.join("\n\n").slice(0, 2500) : "없음"}

[이미 작성된 성과 ${achievements.length}개 — 이것과 겹치지 않게 쓰세요]
${achievements.length > 0 ? achievements.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n") : "없음"}

=== 할 일 ===
핵심 성과를 **정확히 3개** 작성하세요. 2개도 4개도 안 됩니다.
- 1번: 설계·구현 역량 (무엇을 어떻게 만들었는가)
- 2번: 협업·커뮤니케이션 역량 (팀에 어떤 기여를 했는가)
- 3번: 문제해결·주도성 (스스로 발견하고 개선한 것)
각 항목은 70~100자이고, "무엇을 → 어떻게 → 그래서 무엇이 달라졌는지"가 한 항목 안에 다 들어가야 합니다.
위 기록에 실제로 있는 내용만 쓰고, 지어내지 마세요.
한국어로만 쓰고, 모든 문장은 "~했습니다" 체로 끝내세요.

아래 JSON만 출력하세요.
{ "achievements": ["성과1", "성과2", "성과3"] }`;
          const fixed = await callLLM(fixPrompt);
          const got = Array.isArray(fixed.achievements) ? fixed.achievements.map(String) : [];
          console.log(`🏅 핵심 성과 2차: ${got.length}개`);
          if (got.length >= achievements.length) achievements = got;
        } catch (e) {
          console.warn("성과 재요청 실패, 1차 결과를 사용합니다:", e);
        }
      }
      achievements = achievements.filter((a: string) => a.trim()).slice(0, 3);

      const result: ReportResult = {
        summary: String(parsed.summary ?? ""),
        achievements,
        tags: sanitizeTags(parsed.tags),
        coverLetter,
        pct: localPct, doneCnt: localDoneCnt,
        pendingCnt: todos.filter(t => !t.done).length, total: todos.length,
        images: reportImages,
        evidenceMeetings: targetMeetings.filter(m => isMeetingDoc(titleOf(m))).map(titleOf),
        evidenceFiles: Array.from(new Set([
          ...targetMeetings.filter(m => !isMeetingDoc(titleOf(m))).map(titleOf),
          ...readable.map(f => f.name),
        ])),
      };
      setGeminiResult(result);
      await saveReport(result, {
        promptVersion: livePrompt?.version ?? null,
        durationMs: Math.round(performance.now() - reportStartedAt),
        status: "success",
      });

    } catch (err: unknown) {
      console.error("LLM 오류:", err);
      const failDurationMs = Math.round(performance.now() - reportStartedAt);
      const failStatus = err instanceof SyntaxError ? "parse_error" : "timeout";

      if (!fallbackEnabledForLog) {
        // 관리자가 '실패 시 예시 데이터 대체'를 꺼둔 경우: 예시 데이터를 보여주지 않고
        // 실패 사실만 로그에 남긴다. 화면은 기존 '다시 시도하기' 버튼으로 안내된다.
        const authId = await getAuthId();
        if (authId) {
          await supabase.from("ai_reports").insert({
            user_id: authId,
            project_name: selectedProject.name,
            result: { error: true, message: String(err) },
            prompt_version: liveVersionForLog,
            duration_ms: failDurationMs,
            status: failStatus,
          });
        }
        setReportLoading(false);
        return;
      }

      // API 실패 시 예시 데이터로 대체 (fallback 로그도 함께 남긴다)
      const authIdForFallback = await getAuthId();
      if (authIdForFallback) {
        await supabase.from("ai_reports").insert({
          user_id: authIdForFallback,
          project_name: selectedProject.name,
          result: { fallback: true },
          prompt_version: liveVersionForLog,
          duration_ms: failDurationMs,
          status: "fallback",
        });
      }
      setGeminiResult({
        summary: `${selectedProject.name} UI 디자인 총괄 · 기여도 ${localPct}%`,
        achievements: [
          `${selectedProject.name}에서 개인정보·자료보관함 등 주요 화면 UI 전담 설계`,
          "Supabase Auth·Storage·DB 연동으로 실제 동작하는 프론트엔드 구현",
          `할 일 완료율 ${localPct}% 유지, 팀 공용 디자인 시스템(Cobalt Hub 컬러 팔레트) 정립`,
        ],
        coverLetter: `${selectedProject.name}에서 UI 디자인과 Supabase 백엔드 연동을 담당하며 개인정보 수정, 자료보관함, AI 성과 리포트 화면을 설계·구현했습니다. 팀 공용 컬러 시스템을 직접 제안·적용해 전체 화면의 통일감을 높였고, 할 일 완료율 ${localPct}%를 유지하며 일정 관리 역량을 입증했습니다. Figma 목업부터 실제 구현까지 전 과정을 경험하며 디자인과 개발을 연결하는 역할을 수행했습니다.`,
        tags: ["#UIUX", "#Figma", "#Supabase", "#React", "#팀협업", "#AI연동"],
        pct: localPct,
        doneCnt: localDoneCnt,
        pendingCnt: todos.filter(t => !t.done).length,
        total: todos.length,
      });
    } finally {
      setReportLoading(false);
    }
  };
  const toggleTodo = async (id: string) => {
    const target = todos.find(t => t.id === id);
    if (!target) return;
    const next = !target.done;
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: next } : t));
    const { error } = await supabase.from("todos").update({ completed: next }).eq("id", id);
    if (error) {
      console.warn("할 일 저장 실패:", error.message);
      setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !next } : t));
    }
  };
  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    const authId = await getAuthId();
    if (!authId) { alert("로그인이 필요해요."); return; }

    // todos.due_at 은 NOT NULL 이라 반드시 넣어야 해요. 기본값은 이번 주 일요일 밤.
    const payload: Record<string, unknown> = {
      user_id: authId,
      text,
      completed: false,
      due_at: thisWeekRange().end.toISOString(),
    };
    if (selectedProject.id) payload.project_id = selectedProject.id;

    const { data, error } = await supabase.from("todos").insert(payload).select("id").single();
    if (error) { alert("할 일 추가 실패: " + error.message); return; }

    setTodos(prev => [...prev, {
      id: String(data.id), text, done: false,
      week: thisWeekRange().label,
      project: selectedProject.id ? selectedProject.name : undefined,
      projectPath: selectedProject.id ? "/mainpage" : undefined,
    }]);
    setNewTodo("");
  };

  const deleteTodo = async (id: string) => {
    if (!confirm("이 할 일을 삭제할까요?")) return;
    const backup = todos;
    setTodos(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) { alert("삭제 실패: " + error.message); setTodos(backup); }
  };

  const pendingTodos   = todos.filter(t => !t.done);
  const doneTodos      = todos.filter(t => t.done);
  const doneCnt        = doneTodos.length;
  const pct            = todos.length > 0 ? Math.round((doneCnt / todos.length) * 100) : 0;
  const visibleDone    = showAll ? doneTodos : doneTodos.slice(0, 2);
  const weekTodos      = pendingTodos.filter(t => t.week);

  return (
    <div style={{ minHeight: "100vh", background: COLOR.gray50, fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", color: COLOR.gray800 }}>

      {/* 헤더 */}
      <div style={{ background: COLOR.main, padding: "0 24px", display: "flex", alignItems: "center", height: 56 }}>
        <Link href="/mainpage" style={{ fontWeight: 700, fontSize: 18, color: COLOR.white, letterSpacing: "-0.5px", textDecoration: "none" }}>Cobalt Hub</Link>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginLeft: "auto" }}>개인 정보</span>
      </div>

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 프로필 */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: COLOR.mainBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: COLOR.point, flexShrink: 0, overflow: "hidden" }}>
                {profileImg ? <img src={profileImg} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : nickname.slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{nickname}</p>
                <p style={{ margin: "2px 0 2px", fontSize: 13, color: COLOR.gray400 }}>{name}</p>
                <Link href="/mainpage" style={{ fontSize: 13, color: COLOR.point, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  참여 중인 프로젝트 {projectList.length}개 <span style={{ fontSize: 12 }}>›</span>
                </Link>
              </div>
              <button onClick={() => setShowEdit(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: COLOR.gray400, fontSize: 28, lineHeight: 1 }}>⚙</button>
            </div>
          </Card>

          {/* 진행상황 */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>진행상황</span>
              <span style={{ fontSize: 13, color: COLOR.gray600 }}>할 일 {doneCnt}/{todos.length}</span>
            </div>
            <ProgressBar pct={pct} />
            <p style={{ margin: "10px 0 0", fontSize: 28, fontWeight: 700, color: COLOR.point, textAlign: "right" }}>{pct}%</p>
          </Card>

          {/* 할일 */}
          <Card>
            <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600 }}>내 할일(To-Do)</p>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: COLOR.point, fontWeight: 600, background: COLOR.mainBg, display: "inline-block", padding: "4px 12px", borderRadius: 6 }}>
              📅 {thisWeekRange().label}
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
                placeholder="할 일을 입력하고 Enter"
                style={{ flex: 1, border: `1px solid ${COLOR.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }}
              />
              <button onClick={addTodo} disabled={!newTodo.trim()}
                style={{ background: newTodo.trim() ? COLOR.point : COLOR.gray200, color: "#fff", border: "none",
                         borderRadius: 8, padding: "0 16px", fontSize: 13, fontWeight: 600,
                         cursor: newTodo.trim() ? "pointer" : "default" }}>추가</button>
            </div>
            {todos.length === 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: COLOR.gray400 }}>
                등록된 할 일이 없어요. 위에 입력해서 첫 할 일을 만들어보세요.
              </p>
            )}
            {pendingTodos.length > 0 && (
              <div style={{ marginBottom: doneTodos.length > 0 ? 16 : 0, marginTop: 4 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {pendingTodos.map(t => <TodoRow key={t.id} todo={t} onToggle={() => toggleTodo(t.id)} onDelete={() => deleteTodo(t.id)} />)}
                </div>
              </div>
            )}
            {doneTodos.length > 0 && (
              <div>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: COLOR.gray400, fontWeight: 600 }}>✓ 완료</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {visibleDone.map(t => <TodoRow key={t.id} todo={t} onToggle={() => toggleTodo(t.id)} onDelete={() => deleteTodo(t.id)} />)}
                </div>
                {doneTodos.length > 2 && (
                  <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 12, background: "none", border: "none", color: COLOR.point, fontSize: 13, cursor: "pointer", padding: 0 }}>
                    {showAll ? "접기 ▲" : `완료된 항목 ${doneTodos.length - 2}개 더보기 ▼`}
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* AI 리포트 */}
          <Card style={{ background: COLOR.mainBg, border: `1px solid ${COLOR.border}` }}>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: COLOR.point }}>✦ AI 성과 리포트</p>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: COLOR.point }}>프로젝트를 선택하면 회의록·완료 할 일·기여도를 종합해 성과 카드를 자동 생성합니다.</p>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <button onClick={() => setShowProjectPicker(!showProjectPicker)} style={{ width: "100%", background: COLOR.white, border: `1px solid ${COLOR.border}`, borderRadius: 10, padding: "11px 14px", fontSize: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: COLOR.gray800 }}>
                <span>📁 {selectedProject.name}</span>
                <span style={{ color: COLOR.gray400 }}>{showProjectPicker ? "▲" : "▼"}</span>
              </button>
              {showProjectPicker && (
                <div style={{ position: "absolute", top: "110%", left: 0, right: 0, background: COLOR.white, border: `1px solid ${COLOR.gray200}`, borderRadius: 10, zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                  {projectList.map(p => (
                    <button key={p.id} onClick={() => { setSelectedProject(p); setShowProjectPicker(false); }} style={{ display: "block", width: "100%", padding: "11px 14px", background: selectedProject.id === p.id ? COLOR.mainBg : COLOR.white, border: "none", fontSize: 14, cursor: "pointer", textAlign: "left", color: selectedProject.id === p.id ? COLOR.point : COLOR.gray800, fontWeight: selectedProject.id === p.id ? 600 : 400 }}>
                      📁 {p.name} <span style={{ fontSize: 12, color: COLOR.gray400, marginLeft: 8 }}>{p.period}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setShowReport(true); generateReport(); }}
              disabled={projectList.length === 0}
              style={{ width: "100%", background: projectList.length === 0 ? COLOR.gray200 : COLOR.point, color: projectList.length === 0 ? COLOR.gray400 : "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: projectList.length === 0 ? "default" : "pointer" }}
            >
              {projectList.length === 0 ? "참여 중인 프로젝트가 없어요" : `${selectedProject.name} 리포트 생성하기`}
            </button>

            {/* 지난 리포트 히스토리 */}
            {reportHistory.length > 0 && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${COLOR.border}`, paddingTop: 12 }}>
                <button onClick={() => setShowHistory(!showHistory)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, color: COLOR.point }}>
                  🕘 지난 리포트 {reportHistory.length}개 {showHistory ? "▲" : "▼"}
                </button>
                {showHistory && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {reportHistory.map(r => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, background: COLOR.white, border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: "9px 12px" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: COLOR.gray800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.project_name} · 기여도 {r.result?.pct ?? 0}%
                          </p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: COLOR.gray400 }}>
                            {new Date(r.created_at).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button onClick={() => { setGeminiResult(r.result); setShowReport(true); }}
                          style={{ flexShrink: 0, background: COLOR.mainBg, color: COLOR.point, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>보기</button>
                        <button onClick={() => exportReportPdf(r.result, r.project_name, "")}
                          style={{ flexShrink: 0, background: COLOR.gray100, color: COLOR.gray600, border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11, cursor: "pointer" }}>PDF</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 리포트 모달 */}
      {showReport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={() => setShowReport(false)}>
          <div style={{ background: COLOR.white, borderRadius: 20, padding: 24, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: `1px solid ${COLOR.gray200}`, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: COLOR.mainBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 14, color: COLOR.point, overflow: "hidden" }}>
                {profileImg ? <img src={profileImg} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : nickname.slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{nickname} · UI 디자인 파트</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: COLOR.gray600 }}>{selectedProject.name} · {selectedProject.period}</p>
              </div>
              <span style={{ fontSize: 12, color: COLOR.point, background: COLOR.mainBg, padding: "4px 10px", borderRadius: 6 }}>✦ AI 생성</span>
            </div>

            {reportLoading && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 24, margin: "0 0 12px" }}>✦</p>
                <p style={{ fontSize: 14, color: COLOR.gray600, margin: 0 }}>회의록과 산출물을 읽고 분석하는 중이에요...</p>
                <p style={{ fontSize: 12, color: COLOR.gray400, margin: "6px 0 0" }}>잠시만 기다려주세요</p>
              </div>
            )}

            {!reportLoading && geminiResult && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                  {[[`${geminiResult.pct}%`, "기여도", COLOR.point], [String(geminiResult.doneCnt), "완료 할일", COLOR.gray800], [String(geminiResult.pendingCnt), "미완료", COLOR.gray800], [String(geminiResult.total), "전체", COLOR.gray800]].map(([val, label, color]) => (
                    <div key={label} style={{ background: COLOR.gray50, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color }}>{val}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: COLOR.gray600 }}>{label}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: COLOR.gray50, borderRadius: 12, padding: 14, marginBottom: 14, textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COLOR.point }}>✦ {geminiResult.summary}</p>
                </div>
                <div style={{ background: COLOR.gray50, borderRadius: 12, padding: 16, marginBottom: 14 }}>
                  <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>핵심 성과</p>
                  {geminiResult.achievements.map((text, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <span style={{ color: COLOR.point, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: COLOR.mainBg, border: `1px solid ${COLOR.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: COLOR.point }}>❝ 자소서 추천 문장</p>
                  <p style={{ margin: 0, fontSize: 13, color: COLOR.point, lineHeight: 1.7 }}>{geminiResult.coverLetter}</p>
                </div>
                {geminiResult.images && geminiResult.images.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>회의 · 산출물 기록</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {geminiResult.images.map(im => (
                        <a key={`${im.url}-${im.name}`} href={im.url} target="_blank" rel="noreferrer"
                           style={{ border: `1px solid ${COLOR.gray200}`, borderRadius: 10, overflow: "hidden", textDecoration: "none", display: "block" }}>
                          <img src={im.url} alt={im.name} style={{ width: "100%", height: 76, objectFit: "cover", display: "block", background: COLOR.gray100 }} />
                          <p style={{ margin: 0, padding: "5px 7px", fontSize: 10, color: COLOR.gray600, background: COLOR.gray50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{im.name}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {((geminiResult.evidenceMeetings?.length ?? 0) > 0 || (geminiResult.evidenceFiles?.length ?? 0) > 0) && (
                  <div style={{ background: COLOR.gray50, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: COLOR.gray800 }}>📎 분석에 사용한 근거 자료</p>
                    {(geminiResult.evidenceMeetings ?? []).map((m, i) => (
                      <p key={`m${i}-${m}`} style={{ margin: "0 0 3px", fontSize: 11, color: COLOR.gray600 }}>· 회의록 — {m}</p>
                    ))}
                    {(geminiResult.evidenceFiles ?? []).map((f, i) => (
                      <p key={`f${i}-${f}`} style={{ margin: "0 0 3px", fontSize: 11, color: COLOR.gray600 }}>· 문서 — {f}</p>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {geminiResult.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 12, color: COLOR.gray600, background: COLOR.gray100, border: `1px solid ${COLOR.gray200}`, padding: "4px 10px", borderRadius: 999 }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <button onClick={() => { navigator.clipboard.writeText(geminiResult.coverLetter); alert("복사됐어요!"); }} style={{ flex: 1, background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>문장 복사</button>
                  <button onClick={() => exportReportPdf(geminiResult, selectedProject.name, selectedProject.period)} style={{ flex: 1, background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>PDF 저장</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setGeminiResult(null); generateReport(); }} style={{ flex: 1, background: COLOR.gray100, color: COLOR.gray800, border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, cursor: "pointer" }}>다시 생성</button>
                  <button onClick={() => setShowReport(false)} style={{ flex: 1, background: COLOR.gray100, color: COLOR.gray600, border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, cursor: "pointer" }}>닫기</button>
                </div>
              </>
            )}

            {!reportLoading && !geminiResult && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <button onClick={generateReport} style={{ background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>다시 시도하기</button>
              </div>
            )}
          </div>
        </div>
      )}

            {/* 수정 모달 */}
      {showEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={() => setShowEdit(false)}>
          <div style={{ background: COLOR.white, borderRadius: 20, padding: 24, maxWidth: 420, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button onClick={() => setShowEdit(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: COLOR.gray600, padding: 0 }}>←</button>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>개인 정보 수정</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 18, borderBottom: `1px solid ${COLOR.gray200}`, marginBottom: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: COLOR.mainBg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: COLOR.point, overflow: "hidden", flexShrink: 0 }}>
                {profileImg ? <img src={profileImg} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : nickname.slice(0, 2)}
              </div>
              <button onClick={() => imgInputRef.current?.click()} style={{ background: COLOR.gray100, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: COLOR.gray800 }}>📷 사진 변경</button>
              <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleProfileImg} />
              {profileImg && (
                <button
                  onClick={async () => {
                    const authId = await getAuthId();
                    if (authId) await supabase.from("profiles").update({ avatar_url: null }).eq("id", authId);
                    setProfileImg(null);
                  }}
                  style={{ background: "none", border: "none", fontSize: 12, color: COLOR.gray400, cursor: "pointer", padding: 0 }}
                >
                  기본으로 초기화
                </button>
              )}
            </div>
            <EditableField label="닉네임 (화면 표시 이름)" value={nickname} onChange={setNickname} />
            <EditableField label="이름 (실명)" value={name} onChange={setName} />
            <EditableField label="이메일" value={email} onChange={setEmail} />
            <div onClick={() => setShowPwChange(true)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: `1px solid ${COLOR.gray200}`, marginBottom: 14, cursor: "pointer" }}>
              <span style={{ fontSize: 14 }}>비밀번호 변경</span>
              <span style={{ color: COLOR.gray400 }}>›</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <p style={{ margin: 0, fontSize: 14 }}>카카오톡 알림 받기</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: COLOR.gray400 }}>마감 D-1, 회의록 업데이트 알림</p>
              </div>
              <div onClick={() => setKakaoOn(!kakaoOn)} style={{ width: 44, height: 26, borderRadius: 999, background: kakaoOn ? COLOR.point : COLOR.gray200, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: kakaoOn ? "auto" : 3, right: kakaoOn ? 3 : "auto" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSave} style={{ flex: 2, background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>저장하기</button>
              <button onClick={() => setShowEdit(false)} style={{ flex: 1, background: COLOR.gray100, color: COLOR.gray600, border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 변경 모달 */}
      {showPwChange && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }} onClick={() => setShowPwChange(false)}>
          <div style={{ background: COLOR.white, borderRadius: 20, padding: 24, maxWidth: 380, width: "100%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button onClick={() => setShowPwChange(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: COLOR.gray600, padding: 0 }}>←</button>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>비밀번호 변경</p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: COLOR.gray600, display: "block", marginBottom: 6 }}>현재 비밀번호</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="현재 비밀번호 입력"
                style={{ width: "100%", border: `1px solid ${COLOR.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: COLOR.gray600, display: "block", marginBottom: 6 }}>새 비밀번호</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="8자 이상 입력"
                style={{ width: "100%", border: `1px solid ${COLOR.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              <p style={{ margin: "6px 0 0", fontSize: 12, color: COLOR.gray400 }}>영문+숫자+특수문자 포함 8자 이상</p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: COLOR.gray600, display: "block", marginBottom: 6 }}>새 비밀번호 확인</label>
              <input type="password" value={newPwConfirm} onChange={e => setNewPwConfirm(e.target.value)} placeholder="다시 입력"
                style={{ width: "100%", border: `1px solid ${newPwConfirm && newPw !== newPwConfirm ? COLOR.danger : COLOR.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              {newPwConfirm && newPw !== newPwConfirm && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: COLOR.danger }}>비밀번호가 일치하지 않아요</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handlePwChange} style={{ flex: 2, background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>변경하기</button>
              <button onClick={() => { setShowPwChange(false); setCurrentPw(""); setNewPw(""); setNewPwConfirm(""); }} style={{ flex: 1, background: COLOR.gray100, color: COLOR.gray600, border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
