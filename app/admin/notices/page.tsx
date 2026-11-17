"use client";

import { useEffect, useState } from "react";

type Notice = {
  id: string;
  target: string;
  title: string;
  body: string;
  sentCount: number;
  createdAt: string;
};

const TARGETS = ["전체 회원", "기본 플랜", "유료 플랜", "인증 미완료"];

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [target, setTarget] = useState("전체 회원");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/notices");
    const json = await res.json();
    setNotices(json.notices ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function publish() {
    if (!title.trim() || !body.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, title, text: body }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error ?? "발송에 실패했습니다.");
        return;
      }
      alert(`${json.sentCount}명에게 발송했습니다.`);
      setTitle("");
      setBody("");
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, alignItems: "start" }}>
      <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>새 공지 작성</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>대상</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TARGETS.map((t) => {
              const active = target === t;
              return (
                <div
                  key={t}
                  onClick={() => setTarget(t)}
                  style={{
                    padding: "6px 13px",
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: active ? "#4f46e5" : "#c7d2fe",
                    background: active ? "#4f46e5" : "#ffffff",
                    color: active ? "#ffffff" : "#5b6178",
                  }}
                >
                  {t}
                </div>
              );
            })}
          </div>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          style={{ border: "1.5px solid #c7d2fe", borderRadius: 10, padding: "11px 14px", fontSize: 13.5, outline: "none" }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="내용을 입력하세요"
          style={{ border: "1.5px solid #c7d2fe", borderRadius: 10, padding: "12px 14px", fontSize: 13.5, minHeight: 160, resize: "vertical", outline: "none", lineHeight: 1.6 }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>알림센터에 발송됩니다.</div>
          <div
            onClick={sending ? undefined : publish}
            style={{ background: "#4f46e5", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, color: "#ffffff", cursor: "pointer", opacity: sending ? 0.6 : 1 }}
          >
            {sending ? "발송 중..." : "발송"}
          </div>
        </div>
      </section>

      <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>발송 기록</div>
        {notices.length === 0 && <div style={{ fontSize: 13, color: "#9aa3b8" }}>기록이 없습니다.</div>}
        {notices.map((n) => (
          <div key={n.id} style={{ border: "1.5px solid #e6ebfb", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#4f46e5", background: "#eef2ff", borderRadius: 6, padding: "2px 7px" }}>
                {n.target}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{n.title}</span>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 5 }}>
              {new Date(n.createdAt).toLocaleString("ko-KR")} · {n.sentCount}명 발송
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
