"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Dashboard = {
  kpis: {
    userCount: number;
    activeProjectCount: number;
    monthRevenue: number;
    aiReportCount: number;
    aiReportFailRate: number;
  };
  revenueDays: { date: string; amount: number }[];
  planDist: { name: string; count: number; pct: number }[];
  recentPayments: { user: string; plan: string; amount: number; date: string; status: string }[];
  todos: { tag: string; text: string; href: string }[];
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  완료: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  환불: { color: "#6b7280", bg: "#f1f3f9", border: "#e6ebfb" },
  실패: { color: "#e5484d", bg: "#ffffff", border: "#e5484d" },
};

const PLAN_BAR_COLOR: Record<string, string> = {
  "기본 플랜": "#c7d2fe",
  "프리미엄 플랜": "#4f46e5",
  "프로 플랜": "#1f2437",
};

// 서버에서 실제로 확인 가능한 상태만 표기한다. Ollama/휴대폰 인증/결제 PG는
// 각 관리자의 로컬 환경 또는 외부 연동 여부에 달려 있어 서버에서 자동 점검할 수 없다.
const SYSTEMS = [
  { name: "Supabase", status: "정상", dot: "#22c55e", color: "#16a34a" },
  { name: "Ollama (로컬 LLM)", status: "브라우저에서 확인", dot: "#9ca3af", color: "#6b7280" },
  { name: "휴대폰 인증 (Vonage)", status: "연동 상태 미확인", dot: "#9ca3af", color: "#6b7280" },
  { name: "결제 PG", status: "미연동", dot: "#9ca3af", color: "#6b7280" },
];

function won(n: number) {
  return `₩${n.toLocaleString("ko-KR")}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      setData(json);
      setLoading(false);
    })();
  }, []);

  if (loading || !data) {
    return <div style={{ color: "#9aa3b8", fontSize: 13 }}>불러오는 중...</div>;
  }

  const { kpis, revenueDays, planDist, recentPayments, todos } = data;
  const maxDay = Math.max(1, ...revenueDays.map((d) => d.amount));

  const kpiCards = [
    { label: "전체 회원", value: `${kpis.userCount}`, unit: "명" },
    { label: "활성 프로젝트", value: `${kpis.activeProjectCount}`, unit: "건" },
    { label: "이번 달 매출", value: won(kpis.monthRevenue), unit: "" },
    {
      label: "AI 리포트 생성",
      value: `${kpis.aiReportCount}`,
      unit: "건",
      sub: `실패율 ${kpis.aiReportFailRate}%`,
      subColor: kpis.aiReportFailRate > 0 ? "#e5484d" : "#4f46e5",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI 카드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 14 }}>
        {kpiCards.map((k) => (
          <div key={k.label} style={{ border: "1.5px solid #c7d2fe", borderRadius: 16, padding: "18px 20px", background: "#ffffff" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{k.label}</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.5px" }}>{k.value}</span>
              <span style={{ fontSize: 12, color: "#9aa3b8" }}>{k.unit}</span>
            </div>
            {k.sub && (
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: k.subColor }}>{k.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* 매출 차트 + 플랜분포/시스템상태 */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 18, alignItems: "stretch" }}>
        <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px" }}>최근 14일 매출</div>
            <div style={{ fontSize: 12, color: "#9aa3b8" }}>단위: 원</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180, paddingTop: 10, borderBottom: "1px solid #e6ebfb" }}>
            {revenueDays.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, height: "100%" }}>
                <span style={{ fontSize: 10, color: "#9aa3b8" }}>{d.amount > 0 ? d.amount.toLocaleString("ko-KR") : ""}</span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 26,
                    borderRadius: "6px 6px 0 0",
                    background: i === revenueDays.length - 1 ? "#4f46e5" : "#c7d2fe",
                    height: `${Math.round((d.amount / maxDay) * 130)}px`,
                    minHeight: d.amount > 0 ? 2 : 0,
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {revenueDays.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10.5, color: "#9aa3b8" }}>
                {d.date}
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px" }}>플랜 분포</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {planDist.length === 0 && <div style={{ fontSize: 13, color: "#9aa3b8" }}>회원이 없습니다.</div>}
            {planDist.map((p) => (
              <div key={p.name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                  <span style={{ color: "#6b7280" }}>
                    {p.count}명 · {p.pct}%
                  </span>
                </div>
                <div style={{ marginTop: 7, height: 8, borderRadius: 999, background: "#e6ebfb", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 999, background: PLAN_BAR_COLOR[p.name] ?? "#c7d2fe", width: `${p.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "auto", borderTop: "1px solid #eef1fb", paddingTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>시스템 상태</div>
            {SYSTEMS.map((s) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.dot }} />
                <span style={{ flex: 1 }}>{s.name}</span>
                <span style={{ color: s.color, fontWeight: 700 }}>{s.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 최근 결제 + 처리 필요 */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px" }}>최근 결제</div>
            <div onClick={() => router.push("/admin/payments")} style={{ fontSize: 12.5, fontWeight: 700, color: "#4f46e5", cursor: "pointer" }}>
              전체 보기 →
            </div>
          </div>
          {recentPayments.length === 0 && <div style={{ fontSize: 13, color: "#9aa3b8" }}>결제 내역이 없습니다.</div>}
          {recentPayments.map((r, i) => {
            const st = STATUS_STYLE[r.status] ?? STATUS_STYLE["완료"];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f3f9" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {r.user} <span style={{ fontWeight: 400, color: "#6b7280" }}>· {r.plan}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#9aa3b8", marginTop: 2 }}>{r.date}</div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{won(r.amount)}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: "2px 8px", border: "1px solid", color: st.color, background: st.bg, borderColor: st.border }}>
                  {r.status}
                </span>
              </div>
            );
          })}
        </section>

        <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px" }}>처리 필요</div>
            <div style={{ fontSize: 12, color: "#9aa3b8" }}>{todos.length}건</div>
          </div>
          {todos.length === 0 && <div style={{ fontSize: 13, color: "#9aa3b8" }}>처리할 항목이 없습니다.</div>}
          {todos.map((t, i) => (
            <div
              key={i}
              onClick={() => router.push(t.href)}
              style={{ display: "flex", alignItems: "center", gap: 12, border: "1.5px solid #e6ebfb", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}
            >
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#b45309", background: "#fef3c7", borderRadius: 6, padding: "2px 7px" }}>{t.tag}</span>
              <span style={{ flex: 1, fontSize: 13.5 }}>{t.text}</span>
              <span style={{ fontSize: 12, color: "#9aa3b8" }}>›</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
