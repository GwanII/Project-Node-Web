"use client";

import { useEffect, useState } from "react";

type Admin = { id: string; name: string; email: string; role: string };
type LogRow = { id: string; time: string; who: string; what: string };

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [auditLog, setAuditLog] = useState<LogRow[]>([]);
  const [inviting, setInviting] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/settings");
    const json = await res.json();
    setAdmins(json.admins ?? []);
    setAuditLog(json.auditLog ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function inviteAdmin() {
    const email = prompt("관리자로 지정할 회원의 이메일을 입력하세요.");
    if (!email) return;
    setInviting(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error ?? "초대에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setInviting(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 18, alignItems: "start" }}>
      <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>관리자 계정</div>
          <div
            onClick={inviting ? undefined : inviteAdmin}
            style={{ fontSize: 12.5, fontWeight: 700, color: "#4f46e5", cursor: "pointer" }}
          >
            {inviting ? "처리 중..." : "+ 관리자 초대"}
          </div>
        </div>
        {admins.length === 0 && <div style={{ fontSize: 13, color: "#9aa3b8" }}>관리자가 없습니다.</div>}
        {admins.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1.5px solid #e6ebfb", borderRadius: 12, padding: "12px 14px" }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#1f2437",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: "0 0 auto",
              }}
            >
              {a.name.slice(0, 1)}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{a.email}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", background: "#eef2ff", borderRadius: 6, padding: "3px 9px" }}>{a.role}</span>
          </div>
        ))}
      </section>

      <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>활동 로그</div>
        {auditLog.length === 0 && <div style={{ fontSize: 13, color: "#9aa3b8" }}>기록이 없습니다.</div>}
        {auditLog.map((l) => (
          <div key={l.id} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid #f1f3f9" }}>
            <span style={{ color: "#9aa3b8", width: 140, flex: "0 0 140px" }}>{l.time}</span>
            <span style={{ fontWeight: 700, width: 60, flex: "0 0 60px" }}>{l.who}</span>
            <span style={{ color: "#5b6178" }}>{l.what}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
