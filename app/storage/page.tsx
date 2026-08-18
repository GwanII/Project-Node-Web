"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

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

type FileType = "전체" | "사진" | "URL" | "문서";
type SortType = "날짜순" | "가나다순";
type FolderRow = { id: string; name: string; created_at: string };
type FileRow = {
  id: string; name: string; type: "사진" | "URL" | "문서";
  uploader: string; size?: string; url?: string;
  storage_path?: string; folder_id?: string | null; created_at: string;
};

const MEETING_DATA: Record<string, string[]> = {
  "프로젝트 NODE": ["1차 회의록","2차 회의록","3차 회의록","4차 회의록","5차 회의록"],
  "PBL2":          ["1차 회의록","2차 회의록","3차 회의록"],
  "AI 공모전":     ["1차 회의록","2차 회의록"],
};
const PROJECT_NAMES = Object.keys(MEETING_DATA);
const TYPE_ICON: Record<string, string> = { 사진:"🖼", URL:"🔗", 문서:"📄" };
const USER_KEY = "sohee";

export default function StoragePage() {
  const [files, setFiles]                     = useState<FileRow[]>([]);
  const [folders, setFolders]                 = useState<FolderRow[]>([]);
  const [uploaderName, setUploaderName]       = useState("권소희");
  const [loading, setLoading]                 = useState(true);
  const [tab, setTab]                         = useState<FileType>("전체");
  const [sort, setSort]                       = useState<SortType>("날짜순");
  const [search, setSearch]                   = useState("");
  const [showSortMenu, setShowSortMenu]       = useState(false);
  const [showUploadMenu, setShowUploadMenu]   = useState(false);
  const [showUrlInput, setShowUrlInput]       = useState(false);
  const [urlInput, setUrlInput]               = useState("");
  const [urlName, setUrlName]                 = useState("");
  const [meetingStep, setMeetingStep]         = useState<null|"project"|"meeting">(null);
  const [meetingProject, setMeetingProject]   = useState("");
  const [currentFolder, setCurrentFolder]     = useState<FolderRow|null>(null);
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName]     = useState("");
  const [movingFile, setMovingFile]           = useState<FileRow|null>(null);
  const [deletingFolder, setDeletingFolder]   = useState<FolderRow|null>(null);
  const [uploading, setUploading]             = useState(false);

  // ── 다중 선택 ──
  const [selected, setSelected]               = useState<Set<string>>(new Set());
  const [showBulkMove, setShowBulkMove]       = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (uploadBtnRef.current && !uploadBtnRef.current.contains(e.target as Node))
        setShowUploadMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: foldersData }, { data: filesData }, { data: profileData }] = await Promise.all([
      supabase.from("folders").select("*").order("created_at", { ascending: false }),
      supabase.from("files").select("*").order("created_at", { ascending: false }),
      supabase.from("user_profiles").select("name").eq("user_key", USER_KEY).maybeSingle(),
    ]);
    setFolders((foldersData as FolderRow[]) ?? []);
    setFiles((filesData as FileRow[]) ?? []);
    if (profileData?.name) setUploaderName(profileData.name);
    setLoading(false);
    setSelected(new Set());
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── 파일 업로드 ──
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true); setShowUploadMenu(false);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    const type: "사진"|"URL"|"문서" = ["png","jpg","jpeg","gif","webp"].includes(ext) ? "사진" : "문서";
    const size = f.size > 1024*1024 ? `${(f.size/1024/1024).toFixed(1)} MB` : `${Math.round(f.size/1024)} KB`;
    const safeFileName = `${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const { error } = await supabase.storage.from("cobalt-files").upload(safeFileName, f);
    if (error) { alert("업로드 실패: " + error.message); setUploading(false); return; }
    await supabase.from("files").insert({ name: f.name, type, uploader: uploaderName, size, storage_path: safeFileName, folder_id: currentFolder?.id ?? null });
    await fetchAll(); setUploading(false); e.target.value = "";
  };

  const handleMeetingSelect = async (meeting: string) => {
    const name = `[${meetingProject}] ${meeting}.txt`;
    await supabase.from("files").insert({ name, type: "문서", uploader: uploaderName, size: "12 KB", folder_id: currentFolder?.id ?? null });
    await fetchAll(); setMeetingStep(null); setMeetingProject("");
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    await supabase.from("files").insert({ name: urlName.trim() || urlInput, type: "URL", uploader: uploaderName, url: urlInput, folder_id: currentFolder?.id ?? null });
    await fetchAll(); setUrlInput(""); setUrlName(""); setShowUrlInput(false);
  };

  const handleDelete = async (file: FileRow) => {
    if (file.storage_path) await supabase.storage.from("cobalt-files").remove([file.storage_path]);
    await supabase.from("files").delete().eq("id", file.id);
    await fetchAll();
  };

  const handleDownload = async (file: FileRow) => {
    if (!file.storage_path) return;
    const { data } = await supabase.storage.from("cobalt-files").download(file.storage_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a"); a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await supabase.from("folders").insert({ name: newFolderName.trim(), created_by: uploaderName });
    await fetchAll(); setNewFolderName(""); setShowFolderInput(false);
  };

  const handleDeleteFolderOnly = async (id: string) => {
    await supabase.from("files").update({ folder_id: null }).eq("folder_id", id);
    await supabase.from("folders").delete().eq("id", id);
    await fetchAll(); setDeletingFolder(null);
  };

  const handleDeleteFolderWithFiles = async (id: string) => {
    const folderFiles = files.filter(f => f.folder_id === id && f.storage_path);
    if (folderFiles.length > 0) await supabase.storage.from("cobalt-files").remove(folderFiles.map(f => f.storage_path!));
    await supabase.from("files").delete().eq("folder_id", id);
    await supabase.from("folders").delete().eq("id", id);
    await fetchAll(); setDeletingFolder(null);
  };

  const handleMoveToFolder = async (folderId: string | null) => {
    if (!movingFile) return;
    await supabase.from("files").update({ folder_id: folderId }).eq("id", movingFile.id);
    await fetchAll(); setMovingFile(null);
  };

  // ── 다중 선택 ──
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === visibleFiles.length) setSelected(new Set());
    else setSelected(new Set(visibleFiles.map(f => f.id)));
  };

  // ── 선택 파일 일괄 이동 ──
  const handleBulkMove = async (folderId: string | null) => {
    const ids = Array.from(selected);
    await Promise.all(ids.map(id => supabase.from("files").update({ folder_id: folderId }).eq("id", id)));
    await fetchAll(); setShowBulkMove(false);
  };

  // ── 선택 파일 일괄 삭제 ──
  const handleBulkDelete = async () => {
    if (!confirm(`선택한 ${selected.size}개 파일을 삭제할까요?`)) return;
    const selectedFiles = files.filter(f => selected.has(f.id));
    const storagePaths = selectedFiles.filter(f => f.storage_path).map(f => f.storage_path!);
    if (storagePaths.length > 0) await supabase.storage.from("cobalt-files").remove(storagePaths);
    await Promise.all(Array.from(selected).map(id => supabase.from("files").delete().eq("id", id)));
    await fetchAll();
  };

  const visibleFiles = files
    .filter(f => currentFolder ? f.folder_id === currentFolder.id : true)
    .filter(f => tab === "전체" || f.type === tab)
    .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => sort === "가나다순" ? a.name.localeCompare(b.name,"ko") : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const BtnStyle = (active?: boolean): React.CSSProperties => ({
    fontSize:13, padding:"6px 14px", borderRadius:999, cursor:"pointer", fontWeight: active?600:400,
    border: active?"none":`1px solid ${COLOR.border}`,
    background: active?COLOR.point:COLOR.white, color: active?"#fff":COLOR.gray600,
  });

  const formatDate = (iso: string) => { const d = new Date(iso); return `${d.getMonth()+1}월 ${d.getDate()}일`; };

  return (
    <div style={{ minHeight:"100vh", background:COLOR.gray50, fontFamily:"'Pretendard','Apple SD Gothic Neo',sans-serif", color:COLOR.gray800 }}>
      <div style={{ background:COLOR.main, padding:"0 24px", display:"flex", alignItems:"center", height:56 }}>
        <span style={{ fontWeight:700, fontSize:18, color:COLOR.white, letterSpacing:"-0.5px" }}>Cobalt Hub</span>
        <span style={{ color:"rgba(255,255,255,0.8)", fontSize:14, marginLeft:"auto" }}>자료 보관함</span>
      </div>

      <div style={{ padding:"28px 32px" }}>

        {/* 타이틀 + 버튼 */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {currentFolder && <button onClick={() => setCurrentFolder(null)} style={{ background:"none", border:"none", cursor:"pointer", color:COLOR.gray400, fontSize:20, padding:0 }}>←</button>}
            <p style={{ margin:0, fontSize:20, fontWeight:700 }}>{currentFolder ? `📁 ${currentFolder.name}` : "자료 보관함"}</p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {!currentFolder && <button onClick={() => setShowFolderInput(true)} style={{ background:COLOR.white, color:COLOR.point, border:`1px solid ${COLOR.border}`, borderRadius:10, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>📁 폴더 만들기</button>}
            <div ref={uploadBtnRef} style={{ position:"relative" }}>
              <button onClick={() => setShowUploadMenu(v => !v)} disabled={uploading} style={{ background:uploading?COLOR.gray400:COLOR.point, color:"#fff", border:"none", borderRadius:10, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:uploading?"default":"pointer" }}>
                {uploading ? "업로드 중..." : `↑ 파일 업로드 ${showUploadMenu?"▲":"▾"}`}
              </button>
              {showUploadMenu && (
                <div style={{ position:"absolute", right:0, top:"calc(100% + 6px)", background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:12, zIndex:100, minWidth:220, boxShadow:"0 8px 24px rgba(0,0,0,0.12)", overflow:"hidden" }}>
                  <button onClick={() => { setShowUploadMenu(false); setMeetingStep("project"); }} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"14px 16px", background:"none", border:"none", borderBottom:`1px solid ${COLOR.gray100}`, fontSize:14, cursor:"pointer", textAlign:"left", color:COLOR.gray800 }}>
                    <span style={{ fontSize:22 }}>📝</span><div><p style={{ margin:0, fontWeight:500 }}>프로젝트 회의록 가져오기</p><p style={{ margin:"2px 0 0", fontSize:12, color:COLOR.gray400 }}>작성된 회의록을 바로 보관</p></div>
                  </button>
                  <button onClick={() => { fileInputRef.current?.click(); setShowUploadMenu(false); }} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"14px 16px", background:"none", border:"none", borderBottom:`1px solid ${COLOR.gray100}`, fontSize:14, cursor:"pointer", textAlign:"left", color:COLOR.gray800 }}>
                    <span style={{ fontSize:22 }}>💻</span><div><p style={{ margin:0, fontWeight:500 }}>컴퓨터 파일에서 가져오기</p><p style={{ margin:"2px 0 0", fontSize:12, color:COLOR.gray400 }}>PPT, PDF, 이미지 등</p></div>
                  </button>
                  <button onClick={() => { setShowUrlInput(true); setShowUploadMenu(false); }} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:"14px 16px", background:"none", border:"none", fontSize:14, cursor:"pointer", textAlign:"left", color:COLOR.gray800 }}>
                    <span style={{ fontSize:22 }}>🔗</span><div><p style={{ margin:0, fontWeight:500 }}>URL 링크 추가</p><p style={{ margin:"2px 0 0", fontSize:12, color:COLOR.gray400 }}>노션, 피그마, 구글 링크 등</p></div>
                  </button>
                </div>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" style={{ display:"none" }} onChange={handleFileSelect} />
        </div>

        {/* 폴더 만들기 입력 */}
        {showFolderInput && (
          <div style={{ background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:12, padding:16, marginBottom:16, display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:20 }}>📁</span>
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key==="Enter" && handleCreateFolder()} placeholder="폴더 이름 입력" style={{ flex:1, border:`1px solid ${COLOR.border}`, borderRadius:8, padding:"8px 12px", fontSize:14, outline:"none" }} autoFocus />
            <button onClick={handleCreateFolder} style={{ background:COLOR.point, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>만들기</button>
            <button onClick={() => { setShowFolderInput(false); setNewFolderName(""); }} style={{ background:COLOR.gray100, color:COLOR.gray600, border:"none", borderRadius:8, padding:"8px 14px", fontSize:13, cursor:"pointer" }}>취소</button>
          </div>
        )}

        {/* 폴더 목록 */}
        {!currentFolder && folders.length > 0 && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
            {folders.map(folder => (
              <div key={folder.id} style={{ background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, cursor:"pointer", minWidth:160 }} onClick={() => setCurrentFolder(folder)}>
                <span style={{ fontSize:24 }}>📁</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:500 }}>{folder.name}</p>
                  <p style={{ margin:"2px 0 0", fontSize:12, color:COLOR.gray400 }}>{files.filter(f => f.folder_id===folder.id).length}개 파일</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setDeletingFolder(folder); }} style={{ background:"none", border:"none", cursor:"pointer", color:COLOR.gray400, fontSize:16, padding:0 }}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {/* 회의록 1단계 */}
        {meetingStep === "project" && (
          <div style={{ background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <span>📝</span><p style={{ margin:0, fontSize:14, fontWeight:600 }}>프로젝트 선택</p>
              <button onClick={() => setMeetingStep(null)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:COLOR.gray400, fontSize:18, padding:0 }}>✕</button>
            </div>
            {PROJECT_NAMES.map(p => (
              <button key={p} onClick={() => { setMeetingProject(p); setMeetingStep("meeting"); }} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 14px", background:COLOR.gray50, border:`1px solid ${COLOR.border}`, borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.gray800, textAlign:"left", marginBottom:8 }}>
                <span>📁</span>{p}<span style={{ marginLeft:"auto", color:COLOR.gray400 }}>›</span>
              </button>
            ))}
          </div>
        )}

        {/* 회의록 2단계 */}
        {meetingStep === "meeting" && (
          <div style={{ background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <button onClick={() => setMeetingStep("project")} style={{ background:"none", border:"none", cursor:"pointer", color:COLOR.gray600, fontSize:18, padding:0 }}>←</button>
              <span>📁</span><p style={{ margin:0, fontSize:14, fontWeight:600 }}>{meetingProject}</p>
              <button onClick={() => { setMeetingStep(null); setMeetingProject(""); }} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:COLOR.gray400, fontSize:18, padding:0 }}>✕</button>
            </div>
            {MEETING_DATA[meetingProject]?.map(m => (
              <button key={m} onClick={() => handleMeetingSelect(m)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"12px 14px", background:COLOR.gray50, border:`1px solid ${COLOR.border}`, borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.gray800, textAlign:"left", marginBottom:8 }}>
                <span>📄</span>{m}<span style={{ marginLeft:"auto", color:COLOR.point, fontSize:13 }}>가져오기</span>
              </button>
            ))}
          </div>
        )}

        {/* URL 입력 */}
        {showUrlInput && (
          <div style={{ background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
            <p style={{ margin:"0 0 10px", fontSize:14, fontWeight:600 }}>🔗 URL 링크 추가</p>
            <input value={urlName} onChange={e => setUrlName(e.target.value)} placeholder="링크 이름 (선택)" style={{ width:"100%", border:`1px solid ${COLOR.border}`, borderRadius:8, padding:"8px 12px", fontSize:14, marginBottom:8, outline:"none", boxSizing:"border-box" }} />
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://" style={{ width:"100%", border:`1px solid ${COLOR.border}`, borderRadius:8, padding:"8px 12px", fontSize:14, marginBottom:10, outline:"none", boxSizing:"border-box" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={handleAddUrl} style={{ flex:1, background:COLOR.point, color:"#fff", border:"none", borderRadius:8, padding:"9px 0", fontSize:13, fontWeight:600, cursor:"pointer" }}>추가</button>
              <button onClick={() => setShowUrlInput(false)} style={{ flex:1, background:COLOR.gray100, color:COLOR.gray600, border:"none", borderRadius:8, padding:"9px 0", fontSize:13, cursor:"pointer" }}>취소</button>
            </div>
          </div>
        )}

        {/* 폴더 삭제 확인 모달 */}
        {deletingFolder && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setDeletingFolder(null)}>
            <div style={{ background:COLOR.white, borderRadius:16, padding:24, minWidth:320, maxWidth:400 }} onClick={e => e.stopPropagation()}>
              <p style={{ margin:"0 0 6px", fontSize:16, fontWeight:600 }}>📁 {deletingFolder.name} 삭제</p>
              <p style={{ margin:"0 0 20px", fontSize:13, color:COLOR.gray600 }}>이 폴더에 파일 {files.filter(f => f.folder_id===deletingFolder.id).length}개가 있어요. 어떻게 할까요?</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <button onClick={() => handleDeleteFolderOnly(deletingFolder.id)} style={{ padding:"13px 16px", background:COLOR.mainBg, border:`1px solid ${COLOR.border}`, borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.point, fontWeight:600, textAlign:"left" }}>
                  📁 폴더만 삭제<p style={{ margin:"3px 0 0", fontSize:12, color:COLOR.gray400, fontWeight:400 }}>안의 파일은 루트로 이동해요</p>
                </button>
                <button onClick={() => handleDeleteFolderWithFiles(deletingFolder.id)} style={{ padding:"13px 16px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.danger, fontWeight:600, textAlign:"left" }}>
                  🗑 폴더와 파일 모두 삭제<p style={{ margin:"3px 0 0", fontSize:12, color:"#F87171", fontWeight:400 }}>완전히 삭제되며 복구할 수 없어요</p>
                </button>
                <button onClick={() => setDeletingFolder(null)} style={{ padding:"11px 0", background:COLOR.gray100, border:"none", borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.gray600 }}>취소</button>
              </div>
            </div>
          </div>
        )}

        {/* 단일 파일 폴더 이동 모달 */}
        {movingFile && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setMovingFile(null)}>
            <div style={{ background:COLOR.white, borderRadius:16, padding:24, minWidth:300 }} onClick={e => e.stopPropagation()}>
              <p style={{ margin:"0 0 16px", fontSize:15, fontWeight:600 }}>📁 폴더로 이동</p>
              <button onClick={() => handleMoveToFolder(null)} style={{ display:"block", width:"100%", padding:"11px 14px", background:COLOR.gray50, border:`1px solid ${COLOR.border}`, borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.gray800, textAlign:"left", marginBottom:8 }}>🏠 루트 (폴더 없음)</button>
              {folders.map(f => <button key={f.id} onClick={() => handleMoveToFolder(f.id)} style={{ display:"block", width:"100%", padding:"11px 14px", background:COLOR.gray50, border:`1px solid ${COLOR.border}`, borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.gray800, textAlign:"left", marginBottom:8 }}>📁 {f.name}</button>)}
              <button onClick={() => setMovingFile(null)} style={{ width:"100%", background:COLOR.gray100, color:COLOR.gray600, border:"none", borderRadius:10, padding:"10px 0", fontSize:13, cursor:"pointer", marginTop:4 }}>취소</button>
            </div>
          </div>
        )}

        {/* 일괄 이동 모달 */}
        {showBulkMove && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }} onClick={() => setShowBulkMove(false)}>
            <div style={{ background:COLOR.white, borderRadius:16, padding:24, minWidth:300 }} onClick={e => e.stopPropagation()}>
              <p style={{ margin:"0 0 4px", fontSize:15, fontWeight:600 }}>📁 {selected.size}개 파일 이동</p>
              <p style={{ margin:"0 0 16px", fontSize:13, color:COLOR.gray400 }}>이동할 위치를 선택하세요</p>
              <button onClick={() => handleBulkMove(null)} style={{ display:"block", width:"100%", padding:"11px 14px", background:COLOR.gray50, border:`1px solid ${COLOR.border}`, borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.gray800, textAlign:"left", marginBottom:8 }}>🏠 루트 (폴더 없음)</button>
              {folders.map(f => <button key={f.id} onClick={() => handleBulkMove(f.id)} style={{ display:"block", width:"100%", padding:"11px 14px", background:COLOR.gray50, border:`1px solid ${COLOR.border}`, borderRadius:10, cursor:"pointer", fontSize:14, color:COLOR.gray800, textAlign:"left", marginBottom:8 }}>📁 {f.name}</button>)}
              <button onClick={() => setShowBulkMove(false)} style={{ width:"100%", background:COLOR.gray100, color:COLOR.gray600, border:"none", borderRadius:10, padding:"10px 0", fontSize:13, cursor:"pointer", marginTop:4 }}>취소</button>
            </div>
          </div>
        )}

        {/* 검색 */}
        <div style={{ display:"flex", alignItems:"center", gap:10, background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
          <span style={{ color:COLOR.gray400 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="파일·URL 검색" style={{ flex:1, border:"none", outline:"none", fontSize:14, background:"transparent", color:COLOR.gray800 }} />
          {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:COLOR.gray400, fontSize:16, padding:0 }}>✕</button>}
        </div>

        {/* 탭 + 정렬 */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ display:"flex", gap:6 }}>
            {(["전체","사진","URL","문서"] as FileType[]).map(t => <button key={t} onClick={() => setTab(t)} style={BtnStyle(tab===t)}>{t}</button>)}
          </div>
          <div style={{ position:"relative" }}>
            <button onClick={() => setShowSortMenu(v => !v)} style={{ display:"flex", alignItems:"center", gap:6, background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:8, padding:"7px 12px", fontSize:13, cursor:"pointer", color:COLOR.gray600 }}>↕ {sort} ▾</button>
            {showSortMenu && (
              <div style={{ position:"absolute", right:0, top:"110%", background:COLOR.white, border:`1px solid ${COLOR.border}`, borderRadius:10, overflow:"hidden", zIndex:10, minWidth:110, boxShadow:"0 4px 12px rgba(0,0,0,0.08)" }}>
                {(["날짜순","가나다순"] as SortType[]).map(s => <button key={s} onClick={() => { setSort(s); setShowSortMenu(false); }} style={{ display:"block", width:"100%", padding:"10px 16px", background:sort===s?COLOR.mainBg:COLOR.white, border:"none", fontSize:13, cursor:"pointer", textAlign:"left", color:sort===s?COLOR.point:COLOR.gray800, fontWeight:sort===s?600:400 }}>{s}</button>)}
              </div>
            )}
          </div>
        </div>

        {/* ── 다중 선택 액션 바 ── */}
        {selected.size > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:10, background:COLOR.mainBg, border:`1px solid ${COLOR.border}`, borderRadius:12, padding:"10px 16px", marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:600, color:COLOR.point }}>{selected.size}개 선택됨</span>
            <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
              {folders.length > 0 && (
                <button onClick={() => setShowBulkMove(true)} style={{ background:COLOR.point, color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, cursor:"pointer" }}>📁 폴더 이동</button>
              )}
              <button onClick={handleBulkDelete} style={{ background:COLOR.danger, color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, fontWeight:600, cursor:"pointer" }}>🗑 삭제</button>
              <button onClick={() => setSelected(new Set())} style={{ background:COLOR.gray100, color:COLOR.gray600, border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer" }}>취소</button>
            </div>
          </div>
        )}

        {/* 파일 목록 */}
        <div style={{ background:COLOR.white, borderRadius:16, border:`1px solid ${COLOR.border}`, overflow:"hidden" }}>
          {/* 전체 선택 헤더 */}
          {visibleFiles.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:`1px solid ${COLOR.gray100}`, background:COLOR.gray50 }}>
              <input type="checkbox" checked={selected.size===visibleFiles.length && visibleFiles.length>0} onChange={toggleSelectAll} style={{ width:16, height:16, cursor:"pointer", accentColor:COLOR.point }} />
              <span style={{ fontSize:12, color:COLOR.gray400 }}>전체 선택</span>
            </div>
          )}

          {loading ? (
            <div style={{ padding:"40px 0", textAlign:"center", color:COLOR.gray400 }}><p style={{ fontSize:14, margin:0 }}>불러오는 중...</p></div>
          ) : visibleFiles.length === 0 ? (
            <div style={{ padding:"40px 0", textAlign:"center", color:COLOR.gray400 }}><p style={{ fontSize:32, margin:"0 0 8px" }}>📭</p><p style={{ margin:0, fontSize:14 }}>파일이 없어요</p></div>
          ) : (
            visibleFiles.map((file, idx) => (
              <div key={file.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderTop: idx===0?"none":`1px solid ${COLOR.gray100}`, background: selected.has(file.id)?COLOR.mainBg:"transparent", transition:"background 0.1s" }}>
                {/* 체크박스 */}
                <input type="checkbox" checked={selected.has(file.id)} onChange={() => toggleSelect(file.id)} style={{ width:16, height:16, cursor:"pointer", flexShrink:0, accentColor:COLOR.point }} />

                <div style={{ width:40, height:40, borderRadius:10, background:file.type==="사진"?"#EFF6FF":file.type==="URL"?COLOR.mainBg:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {TYPE_ICON[file.type]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.name}</p>
                  <p style={{ margin:"2px 0 0", fontSize:12, color:COLOR.gray400 }}>
                    {file.type} · {file.uploader} · {formatDate(file.created_at)}{file.size && ` · ${file.size}`}
                    {file.folder_id && <span style={{ marginLeft:6, color:COLOR.point }}>📁 {folders.find(f=>f.id===file.folder_id)?.name}</span>}
                  </p>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  {folders.length > 0 && (
                    <button onClick={() => setMovingFile(file)} style={{ background:COLOR.mainBg, border:"none", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16, color:COLOR.point }} title="폴더로 이동">📂</button>
                  )}
                  <button onClick={() => handleDelete(file)} style={{ background:COLOR.gray100, border:"none", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16, color:COLOR.danger }}>🗑</button>
                  {file.type==="URL" ? (
                    <button onClick={() => file.url && window.open(file.url,"_blank")} style={{ background:COLOR.mainBg, border:"none", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16, color:COLOR.point }}>↗</button>
                  ) : (
                    <button onClick={() => handleDownload(file)} disabled={!file.storage_path} style={{ background:file.storage_path?COLOR.mainBg:COLOR.gray100, border:"none", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:file.storage_path?"pointer":"default", fontSize:16, color:file.storage_path?COLOR.point:COLOR.gray400 }}>↓</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 하단 안내 */}
        <div style={{ background:COLOR.mainBg, border:`1px solid ${COLOR.border}`, borderRadius:12, padding:"12px 16px", marginTop:16, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:20 }}>🔒</span>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:COLOR.point }}>영구 보관 파일</p>
            <p style={{ margin:"2px 0 0", fontSize:12, color:COLOR.point }}>프로젝트 종료 후에도 파일이 삭제되지 않고 영구 보관됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
