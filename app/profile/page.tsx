"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

// ── 로컬 LLM(Ollama) 설정 ──
const OLLAMA_URL   = process.env.NEXT_PUBLIC_OLLAMA_URL   ?? "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? "qwen2.5:7b";

// ── 업로드 파일에서 텍스트 추출 ──
const MAX_CHARS_PER_FILE = 3000;   // 파일당 AI에 넘길 최대 글자 수
const MAX_FILES_TO_READ   = 5;     // 최대 몇 개 파일까지 읽을지

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
    text += content.items.map((it: { str?: string }) => it.str ?? "").join(" ") + "\n";
    if (text.length > MAX_CHARS_PER_FILE) break;
  }
  return text.slice(0, MAX_CHARS_PER_FILE);
}

async function readFileContent(storagePath: string, fileName: string): Promise<string | null> {
  const lower = fileName.toLowerCase();
  const isPdf  = lower.endsWith(".pdf");
  const isText = /\.(txt|md|csv|json)$/.test(lower);
  if (!isPdf && !isText) return null;

  try {
    const { data } = await supabase.storage.from("cobalt-files").download(storagePath);
    if (!data) return null;
    if (isPdf) return await extractPdfText(data);
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

function TodoRow({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={onToggle} style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, padding: 0, cursor: "pointer", border: `2px solid ${todo.done ? COLOR.point : COLOR.gray400}`, background: todo.done ? COLOR.point : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {todo.done && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
      </button>
      <span style={{ fontSize: 14, flex: 1, textDecoration: todo.done ? "line-through" : "none", color: todo.done ? COLOR.gray400 : COLOR.gray800 }}>{todo.text}</span>
      {todo.project && todo.projectPath && (
        <Link href={todo.projectPath} style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: todo.done ? COLOR.gray400 : COLOR.point, background: todo.done ? COLOR.gray100 : COLOR.mainBg, padding: "3px 8px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
          {todo.project} ›
        </Link>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const [todos, setTodos]             = useState<Todo[]>([]);
  const [showAll, setShowAll]         = useState(false);
  const [showReport, setShowReport]   = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [geminiResult, setGeminiResult]   = useState<{
    summary: string;
    achievements: string[];
    coverLetter: string;
    tags: string[];
    pct: number;
    doneCnt: number;
    pendingCnt: number;
    total: number;
  } | null>(null);
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

  // ── 로컬 LLM 리포트 생성 ──
  const generateReport = async () => {
    setReportLoading(true);
    setGeminiResult(null);

    const localDoneCnt = todos.filter(t => t.done).length;
    const localPct = todos.length > 0 ? Math.round((localDoneCnt / todos.length) * 100) : 0;

    try {
      const authId = await getAuthId();

      // 1. DB 데이터 수집
      const [{ data: profileData }, { data: filesData }, { data: meetingData }, { data: projectData }] = await Promise.all([
        supabase.from("profiles").select("name, nickname").eq("id", authId ?? "").maybeSingle(),
        supabase.from("files").select("name, type, created_at, storage_path").eq("uploader", nickname),
        supabase.from("sheet_items").select("name, section, content, project_name").eq("section", "files"),
        supabase.from("projectdata").select("project_name, description, start_date, end_date"),
      ]);

      const doneTodoList = todos.filter(t => t.done).map(t => t.text);
      const pendingTodoList = todos.filter(t => !t.done).map(t => t.text);
      // 파일 목록 + 읽을 수 있는 파일은 내용까지 추출
      const allFiles = (filesData ?? []) as {name: string; type: string; storage_path?: string}[];
      const fileList = allFiles.map(f => `${f.name}(${f.type})`);

      const readable = allFiles
        .filter(f => f.storage_path && /\.(pdf|txt|md|csv|json)$/i.test(f.name))
        .slice(0, MAX_FILES_TO_READ);

      const fileContents: string[] = [];
      for (const f of readable) {
        const text = await readFileContent(f.storage_path!, f.name);
        if (text && text.trim()) fileContents.push(`[${f.name}]\n${text.trim()}`);
      }
      // 선택한 프로젝트 회의록 우선, 없으면 전체
      const allMeetings = (meetingData ?? []) as {name: string; content?: string; project_name?: string}[];
      const scoped = allMeetings.filter(m => m.project_name === selectedProject.name);
      const targetMeetings = scoped.length > 0 ? scoped : allMeetings;
      const meetingList = targetMeetings.map(m =>
        m.content ? `[${m.name}]\n${m.content}` : m.name
      );
      const projectList = (projectData ?? []).map((p: {project_name: string; start_date: string; end_date: string}) => `${p.project_name}(${p.start_date}~${p.end_date})`);

      // 2. 프롬프트 구성
      const prompt = `당신은 취업 컨설턴트입니다. 대학생의 팀 프로젝트 기록을 분석해 자기소개서에 바로 쓸 수 있는 문장을 작성합니다.

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

2. "~했습니다", "열정을 보여주었습니다", "최선을 다했습니다" 같은 뻔한 표현을 금지합니다.
   행동 → 판단 → 결과 순서로 서술하세요.

3. achievements 3개는 각각 서로 다른 역량을 보여줘야 합니다.
   - 1번: 설계·구현 역량 (무엇을 어떻게 만들었는가)
   - 2번: 협업·커뮤니케이션 역량 (팀에 어떤 기여를 했는가)
   - 3번: 문제해결·주도성 (스스로 발견하고 개선한 것)
   각 항목은 70~100자로 쓰세요. "무엇을 → 어떻게 → 그래서 무엇이 달라졌는지"가 한 항목 안에 모두 들어가야 합니다.
   짧게 끊지 말고, 구체적인 명사(화면 이름, 기능 이름, 문서 이름)를 최소 2개 이상 포함하세요.

4. coverLetter는 3문장으로 작성하되 이 구조를 따르세요.
   - 1문장: 어떤 상황에서 무엇을 맡았는지 (프로젝트명, 기간, 역할 명시)
   - 2문장: 어떤 문제를 발견하고 어떻게 해결했는지 (구체적 행동)
   - 3문장: 그 결과 무엇이 달라졌는지 (수치 또는 변화)
   총 400~550자. 각 문장은 충분히 길고 구체적이어야 합니다.
   회의 기록과 산출물에서 확인되는 실제 사실(논의된 안건, 작성한 문서, 검토한 수치)을 최소 3개 이상 문장에 녹이세요.
   면접관이 읽고 "이건 진짜 해본 사람이 쓴 글이다"라고 느끼도록 쓰세요.

5. summary는 30~45자로, 이 사람이 무엇을 해내는 사람인지 규정하세요.
   나쁜 예: "2/4 할일을 완료했습니다"
   좋은 예: "디자인 시스템으로 팀 효율을 끌어올린 UI 설계자"

6. tags는 기술 스택과 역량 키워드 5개. 할일 제목을 태그로 만들지 마세요.
   나쁜 예: "#로그인화면"
   좋은 예: "#UIUX", "#디자인시스템", "#협업"

8. 모든 문장은 "~했습니다" 체로 끝까지 통일하세요.
   "~했음", "~함" 같은 개조식과 섞어 쓰지 마세요.

7. 회의 기록에 이 학생의 구체적인 담당 업무나 제안이 나오면 반드시 활용하세요.
   회의에서 어떤 문제가 논의됐고, 그 결과 무엇을 맡았는지를 문장에 녹이면 설득력이 올라갑니다.
   단, 기록에 없는 내용을 지어내지 마세요. 근거가 없으면 있는 사실만 깊게 쓰세요.

=== 출력 형식 ===
아래 JSON만 출력하세요. 설명, 인사말, 마크다운 코드블록 금지.

{
  "summary": "30~45자 한 줄 규정",
  "achievements": ["설계 역량 70~100자", "협업 역량 70~100자", "주도성 70~100자"],
  "coverLetter": "3~4문장 400~550자",
  "tags": ["#태그1", "#태그2", "#태그3", "#태그4", "#태그5"]
}`;

      // 3. 로컬 LLM(Ollama) 호출
      const res = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          format: "json",
          options: {
            temperature: 0.85,      // 표현을 다양하게
            top_p: 0.92,
            repeat_penalty: 1.15,   // 같은 말 반복 억제
            num_predict: 2500,
          },
        }),
      });

      const data = await res.json();
      console.log("LLM 응답:", JSON.stringify(data));
      if (data.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      const raw = data.response ?? "";
      if (!raw) throw new Error("응답이 비어있어요.");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setGeminiResult({ ...parsed, pct: localPct, doneCnt: localDoneCnt, pendingCnt: todos.filter(t=>!t.done).length, total: todos.length });

    } catch (err: unknown) {
      console.error("LLM 오류:", err);
      // API 실패 시 예시 데이터로 대체
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
            {todos.length === 0 && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: COLOR.gray400 }}>
                등록된 할 일이 없어요. 메인페이지에서 할 일을 추가해보세요.
              </p>
            )}
            {pendingTodos.length > 0 && (
              <div style={{ marginBottom: doneTodos.length > 0 ? 16 : 0, marginTop: 4 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {pendingTodos.map(t => <TodoRow key={t.id} todo={t} onToggle={() => toggleTodo(t.id)} />)}
                </div>
              </div>
            )}
            {doneTodos.length > 0 && (
              <div>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: COLOR.gray400, fontWeight: 600 }}>✓ 완료</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {visibleDone.map(t => <TodoRow key={t.id} todo={t} onToggle={() => toggleTodo(t.id)} />)}
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
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                  {geminiResult.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 12, color: COLOR.gray600, background: COLOR.gray100, border: `1px solid ${COLOR.gray200}`, padding: "4px 10px", borderRadius: 999 }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { navigator.clipboard.writeText(geminiResult.coverLetter); alert("복사됐어요!"); }} style={{ flex: 1, background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>문장 복사</button>
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
