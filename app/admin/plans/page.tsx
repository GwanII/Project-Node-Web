"use client";

import { useEffect, useState } from "react";

type Plan = {
  key: string;
  name: string;
  price: number;
  priceLabel: string;
  projectLimit: string;
  memberLimit: string;
  features: string[];
  isActive: boolean;
  subscribers: number;
};

function won(n: number) {
  return n > 0 ? `₩${n.toLocaleString("ko-KR")}` : "무료";
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/plans");
    const json = await res.json();
    setPlans(json.plans ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(p: Plan) {
    const res = await fetch(`/api/admin/plans/${p.key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (res.ok) await load();
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans/${editing.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          price: editing.price,
          priceLabel: editing.priceLabel,
          projectLimit: editing.projectLimit,
          memberLimit: editing.memberLimit,
          features: editing.features,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json?.error ?? "저장에 실패했습니다.");
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 18, alignItems: "start" }}>
        {!loading && plans.length === 0 && <div style={{ color: "#9aa3b8", fontSize: 13 }}>등록된 플랜이 없습니다.</div>}
        {plans.map((p) => {
          const highlight = p.key === "premium";
          return (
            <section
              key={p.key}
              style={{
                border: "1.5px solid",
                borderColor: highlight ? "#4f46e5" : "#c7d2fe",
                background: highlight ? "#f8faff" : "#ffffff",
                borderRadius: 18,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                opacity: p.isActive ? 1 : 0.55,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", background: "#ffffff", border: "1px solid #c7d2fe", borderRadius: 999, padding: "2px 9px" }}>
                  {p.key}
                </span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>구독 {p.subscribers}명</span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{p.name}</div>
                <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>
                  {won(p.price)}
                  <span style={{ fontSize: 13, fontWeight: 400, color: "#6b7280" }}> {p.priceLabel}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ border: "1px solid #c7d2fe", borderRadius: 10, padding: "9px 11px", background: "#ffffff" }}>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>프로젝트 한도</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{p.projectLimit}</div>
                </div>
                <div style={{ border: "1px solid #c7d2fe", borderRadius: 10, padding: "9px 11px", background: "#ffffff" }}>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>팀원 한도</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{p.memberLimit}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "#4f46e5", fontWeight: 700 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <div
                  onClick={() => setEditing(p)}
                  style={{ flex: 1, textAlign: "center", border: "1.5px solid #4f46e5", borderRadius: 10, padding: 9, fontSize: 12.5, fontWeight: 700, color: "#4f46e5", background: "#ffffff", cursor: "pointer" }}
                >
                  수정
                </div>
                <div
                  onClick={() => toggleActive(p)}
                  style={{ flex: 1, textAlign: "center", border: "1.5px solid #c7d2fe", borderRadius: 10, padding: 9, fontSize: 12.5, color: "#5b6178", background: "#ffffff", cursor: "pointer" }}
                >
                  {p.isActive ? "판매 중지" : "판매 재개"}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(31,36,55,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 18,
              border: "1.5px solid #c7d2fe",
              padding: 24,
              width: 420,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>{editing.name} 수정</div>
            <label style={{ fontSize: 12, color: "#6b7280" }}>플랜명</label>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              style={{ border: "1.5px solid #c7d2fe", borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none" }}
            />
            <label style={{ fontSize: 12, color: "#6b7280" }}>가격 (원)</label>
            <input
              type="number"
              value={editing.price}
              onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
              style={{ border: "1.5px solid #c7d2fe", borderRadius: 10, padding: "9px 12px", fontSize: 13, outline: "none" }}
            />
            <label style={{ fontSize: 12, color: "#6b7280" }}>기능 (한 줄에 하나씩)</label>
            <textarea
              value={editing.features.join("\n")}
              onChange={(e) => setEditing({ ...editing, features: e.target.value.split("\n") })}
              style={{ border: "1.5px solid #c7d2fe", borderRadius: 10, padding: "9px 12px", fontSize: 13, minHeight: 100, outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <div
                onClick={() => setEditing(null)}
                style={{ flex: 1, textAlign: "center", border: "1.5px solid #c7d2fe", borderRadius: 10, padding: 9, fontSize: 13, color: "#5b6178", cursor: "pointer" }}
              >
                취소
              </div>
              <div
                onClick={saveEdit}
                style={{
                  flex: 1,
                  textAlign: "center",
                  background: "#4f46e5",
                  borderRadius: 10,
                  padding: 9,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "저장 중..." : "저장"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
