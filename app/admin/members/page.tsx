"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox } from "lucide-react";

type Member = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string | null;
  role: string;
  isSuspended: boolean;
  verified: boolean;
  plan: string;
  projects: number;
  createdAt: string;
};

const PLAN_STYLE: Record<string, { color: string; bg: string }> = {
  기본: { color: "#6b7280", bg: "#f1f3f9" },
  프리미엄: { color: "#4f46e5", bg: "#eef2ff" },
  프로: { color: "#ffffff", bg: "#4f46e5" },
};

const FILTERS = ["전체", "기본", "프리미엄", "프로"];

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("전체");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/members");
    const json = await res.json();
    setMembers(json.members ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === "전체" ? members : members.filter((m) => m.plan === filter)),
    [members, filter]
  );

  async function toggleSuspend(m: Member) {
    setTogglingId(m.id);
    try {
      const res = await fetch(`/api/admin/members/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: !m.isSuspended }),
      });
      if (res.ok) await load();
      else {
        const json = await res.json().catch(() => ({}));
        alert(json?.error ?? "변경에 실패했습니다.");
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <div
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "7px 15px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: active ? "#4f46e5" : "#c7d2fe",
                  background: active ? "#4f46e5" : "#ffffff",
                  color: active ? "#ffffff" : "#5b6178",
                }}
              >
                {f}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12.5, color: "#6b7280" }}>{loading ? "불러오는 중..." : `전체 ${filtered.length}명`}</div>
      </div>

      <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1.6fr 0.9fr 0.8fr 0.9fr 0.8fr 0.9fr",
            gap: 12,
            padding: "13px 20px",
            background: "#f8faff",
            fontSize: 12,
            fontWeight: 700,
            color: "#6b7280",
            borderBottom: "1px solid #e6ebfb",
          }}
        >
          <span>이름</span>
          <span>이메일</span>
          <span>플랜</span>
          <span>프로젝트</span>
          <span>가입일</span>
          <span>인증</span>
          <span style={{ textAlign: "right" }}>상태</span>
        </div>

        {!loading && filtered.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "48px 0", color: "#9aa3b8" }}>
            <Inbox size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 13 }}>기록이 없습니다.</span>
          </div>
        )}

        {filtered.map((m) => {
          const planStyle = PLAN_STYLE[m.plan] ?? PLAN_STYLE["기본"];
          return (
            <div
              key={m.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1.6fr 0.9fr 0.8fr 0.9fr 0.8fr 0.9fr",
                gap: 12,
                padding: "13px 20px",
                fontSize: 13,
                alignItems: "center",
                borderBottom: "1px solid #f1f3f9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#eef2ff",
                    color: "#4f46e5",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto",
                  }}
                >
                  {(m.name || m.nickname || "?").slice(0, 1)}
                </span>
                <span style={{ fontWeight: 700 }}>{m.name || m.nickname}</span>
              </div>
              <span style={{ color: "#5b6178", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.email}
              </span>
              <span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: planStyle.color,
                    background: planStyle.bg,
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}
                >
                  {m.plan}
                </span>
              </span>
              <span style={{ color: "#5b6178" }}>{m.projects}개</span>
              <span style={{ color: "#5b6178" }}>
                {new Date(m.createdAt).toLocaleDateString("ko-KR")}
              </span>
              <span style={{ fontSize: 12, color: m.verified ? "#4f46e5" : "#9aa3b8", fontWeight: 700 }}>
                {m.verified ? "완료" : "미완료"}
              </span>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div
                  onClick={() => toggleSuspend(m)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "4px 11px",
                    cursor: togglingId === m.id ? "default" : "pointer",
                    opacity: togglingId === m.id ? 0.5 : 1,
                    border: "1px solid",
                    color: m.isSuspended ? "#e5484d" : "#4f46e5",
                    background: m.isSuspended ? "#ffffff" : "#eef2ff",
                    borderColor: m.isSuspended ? "#e5484d" : "#c7d2fe",
                  }}
                >
                  {m.isSuspended ? "정지됨" : "활성"}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
