"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

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

const PROJECTS = [
  { id: 1, name: "프로젝트 NODE", period: "2026.06 ~ 2026.08 (8주)", path: "/mainpage" },
  { id: 2, name: "PBL2",          period: "2026.03 ~ 2026.06 (12주)", path: "/mainpage" },
  { id: 3, name: "AI 공모전",     period: "2026.07 ~ 2026.08 (6주)",  path: "/mainpage" },
];

const PERFORMANCE = [
  { label: "디자인", pct: 85 },
  { label: "기획·회의", pct: 60 },
  { label: "문서 정리", pct: 70 },
];

type Todo = { id: number; text: string; done: boolean; week?: string; project?: string; projectPath?: string };

const INITIAL_TODOS: Todo[] = [
  { id: 1, text: "로그인 화면 디자인",     done: true,  project: "프로젝트 NODE", projectPath: "/mainpage" },
  { id: 2, text: "회원가입 화면 디자인",   done: true,  project: "프로젝트 NODE", projectPath: "/mainpage" },
  { id: 3, text: "자료보관함 화면 디자인", done: false, week: "이번주(8/10~8/12)에 할 일", project: "프로젝트 NODE", projectPath: "/mainpage" },
  { id: 4, text: "개인정보 수정 화면 구현", done: false, week: "이번주(8/10~8/12)에 할 일", project: "AI 공모전", projectPath: "/mainpage" },
];

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
  const [todos, setTodos]             = useState<Todo[]>(INITIAL_TODOS);
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
  const [selectedProject, setSelectedProject]     = useState(PROJECTS[0]);
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

  // ── Gemini AI 리포트 생성 ──
  const generateReport = async () => {
    setReportLoading(true);
    setGeminiResult(null);

    const localDoneCnt = todos.filter(t => t.done).length;
    const localPct = Math.round((localDoneCnt / todos.length) * 100);

    try {
      const authId = await getAuthId();

      // 1. DB 데이터 수집
      const [{ data: profileData }, { data: filesData }, { data: meetingData }, { data: projectData }] = await Promise.all([
        supabase.from("profiles").select("name, nickname").eq("id", authId ?? "").maybeSingle(),
        supabase.from("files").select("name, type, created_at").eq("uploader", nickname),
        supabase.from("sheet_items").select("name, section").eq("section", "files"),
        supabase.from("projectdata").select("project_name, description, start_date, end_date"),
      ]);

      const doneTodoList = todos.filter(t => t.done).map(t => t.text);
      const pendingTodoList = todos.filter(t => !t.done).map(t => t.text);
      const fileList = (filesData ?? []).map((f: {name: string; type: string}) => `${f.name}(${f.type})`);
      const meetingList = (meetingData ?? []).map((m: {name: string}) => m.name);
      const projectList = (projectData ?? []).map((p: {project_name: string; start_date: string; end_date: string}) => `${p.project_name}(${p.start_date}~${p.end_date})`);

      // 2. Gemini 프롬프트 구성
      const prompt = `
당신은 대학생 팀 프로젝트 성과를 분석해서 자기소개서 문장을 생성하는 AI입니다.
아래 데이터를 바탕으로 JSON 형식으로 응답해주세요.

[학생 정보]
- 이름: ${profileData?.nickname ?? nickname}
- 담당: UI 디자인 파트
- 선택한 프로젝트: ${selectedProject.name} (${selectedProject.period})

[참여 프로젝트 목록]
${projectList.length > 0 ? projectList.join("\n") : "데이터 없음"}

[완료한 할일]
${doneTodoList.length > 0 ? doneTodoList.join("\n") : "없음"}

[미완료 할일]
${pendingTodoList.length > 0 ? pendingTodoList.join("\n") : "없음"}

[업로드한 파일]
${fileList.length > 0 ? fileList.join("\n") : "없음"}

[회의록 목록]
${meetingList.length > 0 ? meetingList.join("\n") : "없음"}

[기여도] ${localPct}% (완료 ${localDoneCnt}/${todos.length}개)

위 데이터를 분석하여 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요:
{
  "summary": "한 줄 성과 요약 (30자 이내)",
  "achievements": ["핵심 성과 1", "핵심 성과 2", "핵심 성과 3"],
  "coverLetter": "자기소개서 2~3문장. 구체적인 수치와 성과를 포함해서 작성.",
  "tags": ["#태그1", "#태그2", "#태그3", "#태그4", "#태그5"]
}`;

      // 3. Gemini API 호출
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        }
      );

      const data = await res.json();
      console.log("Gemini 응답:", JSON.stringify(data));
      if (data.error) throw new Error(data.error.message);
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!raw) throw new Error("응답이 비어있어요.");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setGeminiResult({ ...parsed, pct: localPct, doneCnt: localDoneCnt, pendingCnt: todos.filter(t=>!t.done).length, total: todos.length });

    } catch (err: unknown) {
      console.error("Gemini 오류:", err);
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
  const toggleTodo     = (id: number) => setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const pendingTodos   = todos.filter(t => !t.done);
  const doneTodos      = todos.filter(t => t.done);
  const doneCnt        = doneTodos.length;
  const pct            = Math.round((doneCnt / todos.length) * 100);
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
                  참여 중인 프로젝트 {PROJECTS.length}개 <span style={{ fontSize: 12 }}>›</span>
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
              📅 이번주(8/10~8/12)에 할 일
            </p>
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
                  {PROJECTS.map(p => (
                    <button key={p.id} onClick={() => { setSelectedProject(p); setShowProjectPicker(false); }} style={{ display: "block", width: "100%", padding: "11px 14px", background: selectedProject.id === p.id ? COLOR.mainBg : COLOR.white, border: "none", fontSize: 14, cursor: "pointer", textAlign: "left", color: selectedProject.id === p.id ? COLOR.point : COLOR.gray800, fontWeight: selectedProject.id === p.id ? 600 : 400 }}>
                      📁 {p.name} <span style={{ fontSize: 12, color: COLOR.gray400, marginLeft: 8 }}>{p.period}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setShowReport(true); generateReport(); }}
              style={{ width: "100%", background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              {selectedProject.name} 리포트 생성하기
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
                <p style={{ fontSize: 14, color: COLOR.gray600, margin: 0 }}>Gemini가 데이터를 분석하고 있어요...</p>
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
