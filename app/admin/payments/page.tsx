"use client";

import { useEffect, useMemo, useState } from "react";
import { Inbox } from "lucide-react";

type Payment = {
  id: string;
  user: string;
  email: string;
  plan: string;
  amount: number;
  method: string | null;
  cardHolder: string | null;
  status: "완료" | "환불" | "실패";
  paidAt: string;
  refundedAt: string | null;
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  완료: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  환불: { color: "#6b7280", bg: "#f1f3f9", border: "#e6ebfb" },
  실패: { color: "#e5484d", bg: "#ffffff", border: "#e5484d" },
};

const FILTERS = ["전체", "완료", "환불", "실패"];

function won(n: number) {
  return `₩${n.toLocaleString("ko-KR")}`;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ monthRevenue: 0, completedCount: 0, refundedCount: 0, failedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("전체");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/payments");
    const json = await res.json();
    const list: Payment[] = json.payments ?? [];
    setPayments(list);
    setStats(json.stats ?? stats);
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (filter === "전체" ? payments : payments.filter((p) => p.status === filter)),
    [payments, filter]
  );

  const selected = payments.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  async function refund() {
    if (!selected) return;
    if (!confirm(`${selected.id} 결제를 환불 처리하시겠습니까?`)) return;
    setRefunding(true);
    try {
      const res = await fetch(`/api/admin/payments/${selected.id}/refund`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert(json?.error ?? "환불 처리에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setRefunding(false);
    }
  }

  const statCards = [
    { label: "이번 달 매출", value: won(stats.monthRevenue), color: "#1f2437" },
    { label: "결제 완료", value: `${stats.completedCount}건`, color: "#4f46e5" },
    { label: "환불", value: `${stats.refundedCount}건`, color: "#6b7280" },
    { label: "결제 실패", value: `${stats.failedCount}건`, color: "#e5484d" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 14 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ border: "1.5px solid #c7d2fe", borderRadius: 16, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{s.label}</div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        <section style={{ flex: "999 1 600px", minWidth: 0, border: "1.5px solid #c7d2fe", borderRadius: 18, overflowX: "auto" }}>
          <div
            style={{
              minWidth: 600,
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr 0.9fr 0.9fr 1.1fr 0.8fr",
              gap: 12,
              padding: "13px 20px",
              background: "#f8faff",
              fontSize: 12,
              fontWeight: 700,
              color: "#6b7280",
              borderBottom: "1px solid #e6ebfb",
            }}
          >
            <span>주문번호</span>
            <span>회원</span>
            <span>플랜</span>
            <span>금액</span>
            <span>결제 일시</span>
            <span style={{ textAlign: "right" }}>상태</span>
          </div>

          {!loading && filtered.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "48px 0", color: "#9aa3b8" }}>
              <Inbox size={28} strokeWidth={1.5} />
              <span style={{ fontSize: 13 }}>기록이 없습니다.</span>
            </div>
          )}

          {filtered.map((p) => {
            const st = STATUS_STYLE[p.status];
            const active = selected?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  minWidth: 600,
                  whiteSpace: "nowrap",
                  display: "grid",
                  gridTemplateColumns: "1.1fr 0.9fr 0.9fr 0.9fr 1.1fr 0.8fr",
                  gap: 12,
                  padding: "13px 20px",
                  fontSize: 13,
                  alignItems: "center",
                  borderBottom: "1px solid #f1f3f9",
                  cursor: "pointer",
                  background: active ? "#f2f5ff" : "transparent",
                }}
              >
                <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "#5b6178" }}>{p.id}</span>
                <span style={{ fontWeight: 700 }}>{p.user}</span>
                <span style={{ color: "#5b6178" }}>{p.plan}</span>
                <span style={{ fontWeight: 700 }}>{won(p.amount)}</span>
                <span style={{ color: "#5b6178" }}>{new Date(p.paidAt).toLocaleString("ko-KR")}</span>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: "3px 9px",
                      border: "1px solid",
                      color: st.color,
                      background: st.bg,
                      borderColor: st.border,
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <section
          style={{
            flex: "1 1 300px",
            boxSizing: "border-box",
            border: "1.5px solid #c7d2fe",
            borderRadius: 18,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>결제 상세</div>
            {selected && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: "3px 9px",
                  border: "1px solid",
                  color: STATUS_STYLE[selected.status].color,
                  background: STATUS_STYLE[selected.status].bg,
                  borderColor: STATUS_STYLE[selected.status].border,
                }}
              >
                {selected.status}
              </span>
            )}
          </div>

          {selected ? (
            <>
              <div style={{ border: "1.5px solid #4f46e5", background: "#f2f5ff", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#4f46e5" }}>{selected.plan}</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{won(selected.amount)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {[
                  { k: "주문번호", v: selected.id },
                  { k: "회원", v: `${selected.user} (${selected.email})` },
                  { k: "결제 수단", v: selected.method ?? "-" },
                  { k: "카드 소유자", v: selected.cardHolder ?? "-" },
                  { k: "결제 일시", v: new Date(selected.paidAt).toLocaleString("ko-KR") },
                  { k: "환불 일시", v: selected.refundedAt ? new Date(selected.refundedAt).toLocaleString("ko-KR") : "-" },
                ].map((r) => (
                  <div key={r.k} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                    <span style={{ color: "#6b7280" }}>{r.k}</span>
                    <span style={{ fontWeight: 500, textAlign: "right" }}>{r.v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, textAlign: "center", border: "1.5px solid #c7d2fe", borderRadius: 10, padding: 9, fontSize: 12.5, color: "#5b6178", cursor: "pointer" }}>
                  영수증
                </div>
                <div
                  onClick={selected.status === "완료" && !refunding ? refund : undefined}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    border: "1.5px solid",
                    borderRadius: 10,
                    padding: 9,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: selected.status === "완료" ? "pointer" : "not-allowed",
                    opacity: selected.status === "완료" ? 1 : 0.4,
                    color: "#e5484d",
                    borderColor: "#e5484d",
                  }}
                >
                  {refunding ? "처리 중..." : "환불 처리"}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: "#9aa3b8", fontSize: 13 }}>선택된 결제가 없습니다.</div>
          )}
          <div style={{ fontSize: 11, color: "#9aa3b8", textAlign: "center" }}>현재 결제는 PG 미연동 테스트 데이터입니다.</div>
        </section>
      </div>
    </div>
  );
}
