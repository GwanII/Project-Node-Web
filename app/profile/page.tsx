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
    if (newPw !== newPwConfirm) { alert("새 비밀번호가 일치하지 않아요."); return; }
    if (newPw.length < 6) { alert("비밀번호는 6자 이상이어야 해요."); return; }

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

  const doneCnt        = todos.filter(t => t.done).length;
  const pct            = Math.round((doneCnt / todos.length) * 100);
  const toggleTodo     = (id: number) => setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const pendingTodos   = todos.filter(t => !t.done);
  const doneTodos      = todos.filter(t => t.done);
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
            <button onClick={() => setShowReport(true)} style={{ width: "100%", background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
              {[["기여도", `${pct}%`, COLOR.point], ["완료 할 일", doneCnt, COLOR.gray800], ["참여 회의", 8, COLOR.gray800], ["담당 화면", 5, COLOR.gray800]].map(([label, val, color]) => (
                <div key={String(label)} style={{ background: COLOR.gray50, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 11, color: COLOR.gray600 }}>{label}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: String(color) }}>{val}</p>
                </div>
              ))}
            </div>
            <div style={{ background: COLOR.gray50, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>파트별 기여 분석</p>
              {PERFORMANCE.map(p => (
                <div key={p.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}><span>{p.label}</span><span style={{ color: COLOR.gray600 }}>{p.pct}%</span></div>
                  <ProgressBar pct={p.pct} />
                </div>
              ))}
            </div>
            <div style={{ background: COLOR.gray50, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600 }}>핵심 성과</p>
              {["로그인·회원가입·개인정보·자료보관함 등 5개 화면 UI 전담 설계", "팀 공용 색상·컴포넌트 시스템 정립으로 전체 화면 통일감 확보", "할 일 마감 준수율 90% 유지, 3회 회의록 정리 담당"].map(text => (
                <div key={text} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: COLOR.point, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, lineHeight: 1.5 }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ background: COLOR.mainBg, border: `1px solid ${COLOR.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: COLOR.point }}>❝ 자소서 추천 문장</p>
              <p style={{ margin: 0, fontSize: 13, color: COLOR.point, lineHeight: 1.7 }}>
                "8주간 진행된 {selectedProject.name}에서 UI 디자인을 총괄하여 5개 핵심 화면을 설계했습니다. 팀원 간 화면 스타일이 제각각이던 문제를 공용 디자인 시스템 구축으로 해결해 협업 효율을 높였고, 할 일 마감 준수율 90%를 유지하며 일정 관리와 책임감을 입증했습니다."
              </p>
            </div>
            <div style={{ background: COLOR.gray50, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600 }}>첨부 문서</p>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: COLOR.gray400 }}>이 리포트의 근거가 된 자료예요</p>
              {[["📄", "회의록 모음 (3건)", "6/12, 7/03, 7/24"], ["✅", "완료한 할 일 내역 (13건)", "To-Do 트래커 기록"], ["🎨", "디자인 산출물 (5개 화면)", "Figma 링크"]].map(([icon, title, sub]) => (
                <div key={String(title)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${COLOR.gray200}` }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 13 }}>{title}</p><p style={{ margin: "1px 0 0", fontSize: 12, color: COLOR.gray400 }}>{sub}</p></div>
                  <span style={{ color: COLOR.gray400, cursor: "pointer" }}>↗</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {["#UIUX", "#Figma", "#디자인시스템", "#협업", "#일정관리"].map(tag => (
                <span key={tag} style={{ fontSize: 12, color: COLOR.gray600, background: COLOR.gray100, border: `1px solid ${COLOR.gray200}`, padding: "4px 10px", borderRadius: 999 }}>{tag}</span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ flex: 1, background: COLOR.point, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>PDF로 저장</button>
              <button style={{ flex: 1, background: COLOR.gray100, color: COLOR.gray800, border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>문장 복사</button>
              <button onClick={() => setShowReport(false)} style={{ flex: 1, background: COLOR.gray100, color: COLOR.gray600, border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, cursor: "pointer" }}>닫기</button>
            </div>
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
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="6자 이상 입력"
                style={{ width: "100%", border: `1px solid ${COLOR.border}`, borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
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
