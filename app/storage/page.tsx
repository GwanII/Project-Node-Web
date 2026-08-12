"use client";

import { useState, useRef, useEffect } from "react";

const COLOR = {
  main: "#1F9D63",
  light: "#57C77E",
  mainBg: "#EDFAF3",
  danger: "#EF4444",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray800: "#1F2937",
  white: "#FFFFFF",
};

type FileType = "전체" | "사진" | "URL" | "문서";
type SortType = "날짜순" | "가나다순";

type FileItem = {
  id: number;
  name: string;
  type: "사진" | "URL" | "문서";
  uploader: string;
  date: string;
  dateNum: number;
  size?: string;
  url?: string;
};

const INITIAL_FILES: FileItem[] = [
  { id: 1, name: "디자인_시안.png",         type: "사진", uploader: "권소희", date: "8월 1일",  dateNum: 801, size: "890 KB" },
  { id: 2, name: "참고 레퍼런스 노션 링크",  type: "URL",  uploader: "권소희", date: "7월 30일", dateNum: 730, url: "https://notion.so" },
  { id: 3, name: "기획서_v2.pdf",           type: "문서", uploader: "권소희", date: "7월 28일", dateNum: 728, size: "3.1 MB" },
  { id: 4, name: "최종발표_자료.pptx",      type: "문서", uploader: "박서연", date: "8월 1일",  dateNum: 801, size: "12.4 MB" },
  { id: 5, name: "와이어프레임.png",         type: "사진", uploader: "박서연", date: "7월 25일", dateNum: 725, size: "2.1 MB" },
  { id: 6, name: "피그마 디자인 링크",       type: "URL",  uploader: "권소희", date: "7월 20일", dateNum: 720, url: "https://figma.com" },
];

const TYPE_ICON: Record<string, string>  = { 사진: "🖼", URL: "🔗", 문서: "📄" };
const TYPE_COLOR: Record<string, string> = { 사진: "#3B82F6", URL: "#8B5CF6", 문서: "#EF4444" };

// 프로젝트별 회의록 데이터
const MEETING_DATA: Record<string, { label: string; meetings: string[] }> = {
  "프로젝트 NODE": { label: "프로젝트 NODE", meetings: ["1차 회의록", "2차 회의록", "3차 회의록", "4차 회의록", "5차 회의록"] },
  "PBL2":          { label: "PBL2",          meetings: ["1차 회의록", "2차 회의록", "3차 회의록"] },
  "AI 공모전":     { label: "AI 공모전",     meetings: ["1차 회의록", "2차 회의록"] },
};
const PROJECT_NAMES = Object.keys(MEETING_DATA);

export default function StoragePage() {
  const [files, setFiles]               = useState<FileItem[]>(INITIAL_FILES);
  const [tab, setTab]                   = useState<FileType>("전체");
  const [sort, setSort]                 = useState<SortType>("날짜순");
  const [search, setSearch]             = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput]         = useState("");
  const [urlName, setUrlName]           = useState("");

  // 회의록 선택 단계: null → 프로젝트 선택 → 회의록 선택
  const [meetingStep, setMeetingStep]       = useState<null | "project" | "meeting">(null);
  const [meetingProject, setMeetingProject] = useState("");

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const uploadBtnRef   = useRef<HTMLDivElement>(null);

  // ✅ 업로드 메뉴 바깥 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (uploadBtnRef.current && !uploadBtnRef.current.contains(e.target as Node)) {
        setShowUploadMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext  = f.name.split(".").pop()?.toLowerCase() ?? "";
    const type: "사진" | "URL" | "문서" = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext) ? "사진" : "문서";
    const size = f.size > 1024 * 1024
      ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(f.size / 1024)} KB`;
    setFiles((prev) => [{ id: Date.now(), name: f.name, type, uploader: "권소희", date: "방금", dateNum: 999, size }, ...prev]);
    setShowUploadMenu(false);
    e.target.value = "";
  };

  const handleMeetingImport = () => {
    setShowUploadMenu(false);
    setMeetingStep("project"); // 1단계: 프로젝트 선택으로
  };

  const handleMeetingSelect = (meeting: string) => {
    const name = `[${meetingProject}] ${meeting}.txt`;
    setFiles((prev) => [{ id: Date.now(), name, type: "문서", uploader: "권소희", date: "방금", dateNum: 999, size: "12 KB" }, ...prev]);
    setMeetingStep(null);
    setMeetingProject("");
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    setFiles((prev) => [{ id: Date.now(), name: urlName.trim() || urlInput, type: "URL", uploader: "권소희", date: "방금", dateNum: 999, url: urlInput }, ...prev]);
    setUrlInput(""); setUrlName(""); setShowUrlInput(false);
  };

  const handleDelete = (id: number) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const filtered = files
    .filter((f) => tab === "전체" || f.type === tab)
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "가나다순" ? a.name.localeCompare(b.name, "ko") : b.dateNum - a.dateNum);

  return (
    <div style={{ minHeight: "100vh", background: COLOR.gray50, fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", color: COLOR.gray800 }}>

      {/* 헤더 */}
      <div style={{ background: COLOR.white, borderBottom: `1px solid ${COLOR.gray200}`, padding: "0 24px", display: "flex", alignItems: "center", height: 56 }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: COLOR.main, letterSpacing: "-0.5px" }}>TACT</span>
        <span style={{ color: COLOR.gray400, fontSize: 14, marginLeft: "auto" }}>자료 보관함</span>
      </div>

      <div style={{ padding: "28px 32px" }}>

        {/* 타이틀 + 업로드 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>자료 보관함</p>

          {/* ✅ 업로드 드롭다운 — ref로 바깥 클릭 감지 */}
          <div ref={uploadBtnRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowUploadMenu((v) => !v)}
              style={{ background: COLOR.main, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              ↑ 파일 업로드 {showUploadMenu ? "▲" : "▾"}
            </button>

            {showUploadMenu && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                background: COLOR.white, border: `1px solid ${COLOR.gray200}`,
                borderRadius: 12, zIndex: 100,
                minWidth: 220, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                overflow: "hidden",
              }}>
                {/* 옵션 1: 회의록 */}
                <button
                  onClick={handleMeetingImport}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", background: "none", border: "none", borderBottom: `1px solid ${COLOR.gray100}`, fontSize: 14, cursor: "pointer", textAlign: "left", color: COLOR.gray800 }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>📝</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>프로젝트 회의록 가져오기</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: COLOR.gray400 }}>작성된 회의록을 바로 보관</p>
                  </div>
                </button>
                {/* 옵션 2: 컴퓨터 파일 */}
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowUploadMenu(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", background: "none", border: "none", borderBottom: `1px solid ${COLOR.gray100}`, fontSize: 14, cursor: "pointer", textAlign: "left", color: COLOR.gray800 }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>💻</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>컴퓨터 파일에서 가져오기</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: COLOR.gray400 }}>PPT, PDF, 이미지 등</p>
                  </div>
                </button>
                {/* 옵션 3: URL */}
                <button
                  onClick={() => { setShowUrlInput(true); setShowUploadMenu(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", background: "none", border: "none", fontSize: 14, cursor: "pointer", textAlign: "left", color: COLOR.gray800 }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>🔗</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: 14 }}>URL 링크 추가</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: COLOR.gray400 }}>노션, 피그마, 구글 링크 등</p>
                  </div>
                </button>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelect} />
        </div>

        {/* 회의록 선택 — 1단계: 프로젝트 */}
        {meetingStep === "project" && (
          <div style={{ background: COLOR.white, border: `1px solid ${COLOR.gray200}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>📝</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>프로젝트 선택</p>
              <button onClick={() => setMeetingStep(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: COLOR.gray400, fontSize: 18, padding: 0 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PROJECT_NAMES.map((p) => (
                <button key={p} onClick={() => { setMeetingProject(p); setMeetingStep("meeting"); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: COLOR.gray50, border: `1px solid ${COLOR.gray200}`, borderRadius: 10, cursor: "pointer", fontSize: 14, color: COLOR.gray800, textAlign: "left" }}>
                  <span>📁</span> {p}
                  <span style={{ marginLeft: "auto", color: COLOR.gray400 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 회의록 선택 — 2단계: 몇 차 회의록 */}
        {meetingStep === "meeting" && (
          <div style={{ background: COLOR.white, border: `1px solid ${COLOR.gray200}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setMeetingStep("project")} style={{ background: "none", border: "none", cursor: "pointer", color: COLOR.gray600, fontSize: 18, padding: 0 }}>←</button>
              <span style={{ fontSize: 18 }}>📁</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{meetingProject}</p>
              <button onClick={() => { setMeetingStep(null); setMeetingProject(""); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: COLOR.gray400, fontSize: 18, padding: 0 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MEETING_DATA[meetingProject]?.meetings.map((m) => (
                <button key={m} onClick={() => handleMeetingSelect(m)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: COLOR.gray50, border: `1px solid ${COLOR.gray200}`, borderRadius: 10, cursor: "pointer", fontSize: 14, color: COLOR.gray800, textAlign: "left" }}>
                  <span>📄</span> {m}
                  <span style={{ marginLeft: "auto", color: COLOR.main, fontSize: 13 }}>가져오기</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* URL 입력창 */}
        {showUrlInput && (
          <div style={{ background: COLOR.white, border: `1px solid ${COLOR.gray200}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>🔗 URL 링크 추가</p>
            <input value={urlName} onChange={(e) => setUrlName(e.target.value)} placeholder="링크 이름 (선택)" style={{ width: "100%", border: `1px solid ${COLOR.gray200}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, marginBottom: 8, outline: "none", boxSizing: "border-box" }} />
            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://" style={{ width: "100%", border: `1px solid ${COLOR.gray200}`, borderRadius: 8, padding: "8px 12px", fontSize: 14, marginBottom: 10, outline: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAddUrl} style={{ flex: 1, background: COLOR.main, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>추가</button>
              <button onClick={() => setShowUrlInput(false)} style={{ flex: 1, background: COLOR.gray100, color: COLOR.gray600, border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, cursor: "pointer" }}>취소</button>
            </div>
          </div>
        )}

        {/* 검색창 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: COLOR.white, border: `1px solid ${COLOR.gray200}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
          <span style={{ color: COLOR.gray400 }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="파일·URL 검색" style={{ flex: 1, border: "none", outline: "none", fontSize: 14, background: "transparent", color: COLOR.gray800 }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: COLOR.gray400, fontSize: 16, padding: 0 }}>✕</button>}
        </div>

        {/* 탭 + 정렬 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["전체", "사진", "URL", "문서"] as FileType[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ fontSize: 13, padding: "6px 14px", borderRadius: 999, border: tab === t ? "none" : `1px solid ${COLOR.gray200}`, background: tab === t ? COLOR.main : COLOR.white, color: tab === t ? "#fff" : COLOR.gray600, cursor: "pointer", fontWeight: tab === t ? 600 : 400 }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowSortMenu((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, background: COLOR.white, border: `1px solid ${COLOR.gray200}`, borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer", color: COLOR.gray600, whiteSpace: "nowrap" }}>
              ↕ {sort} ▾
            </button>
            {showSortMenu && (
              <div style={{ position: "absolute", right: 0, top: "110%", background: COLOR.white, border: `1px solid ${COLOR.gray200}`, borderRadius: 10, overflow: "hidden", zIndex: 10, minWidth: 110, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                {(["날짜순", "가나다순"] as SortType[]).map((s) => (
                  <button key={s} onClick={() => { setSort(s); setShowSortMenu(false); }} style={{ display: "block", width: "100%", padding: "10px 16px", background: sort === s ? COLOR.mainBg : COLOR.white, border: "none", fontSize: 13, cursor: "pointer", textAlign: "left", color: sort === s ? COLOR.main : COLOR.gray800, fontWeight: sort === s ? 600 : 400 }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 파일 목록 */}
        <div style={{ background: COLOR.white, borderRadius: 16, border: `1px solid ${COLOR.gray200}`, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: COLOR.gray400 }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>📭</p>
              <p style={{ margin: 0, fontSize: 14 }}>파일이 없어요</p>
            </div>
          ) : (
            filtered.map((file, idx) => (
              <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: idx === 0 ? "none" : `1px solid ${COLOR.gray100}` }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: file.type === "사진" ? "#EFF6FF" : file.type === "URL" ? "#F5F3FF" : "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {TYPE_ICON[file.type]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: COLOR.gray400 }}>
                    <span style={{ color: TYPE_COLOR[file.type], fontWeight: 500 }}>{file.type}</span>
                    {" · "}{file.uploader}{" · "}{file.date}{file.size && ` · ${file.size}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => handleDelete(file.id)} style={{ background: COLOR.gray100, border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: COLOR.danger }}>🗑</button>
                  {file.type === "URL" ? (
                    <button onClick={() => file.url && window.open(file.url, "_blank")} style={{ background: COLOR.mainBg, border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: COLOR.main }}>↗</button>
                  ) : (
                    <button style={{ background: COLOR.mainBg, border: "none", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, color: COLOR.main }}>↓</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 안내 */}
        <div style={{ background: COLOR.mainBg, border: `1px solid ${COLOR.light}`, borderRadius: 12, padding: "12px 16px", marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: COLOR.main }}>영구 보관 파일</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: COLOR.main }}>프로젝트 종료 후에도 파일이 삭제되지 않고 영구 보관됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
