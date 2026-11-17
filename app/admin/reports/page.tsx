"use client";

import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";

type Report = {
  id: string;
  user: string;
  project: string;
  version: string;
  durationMs: number | null;
  createdAt: string;
  status: "success" | "parse_error" | "timeout" | "fallback";
};

const STATUS_LABEL: Record<string, string> = {
  success: "성공",
  parse_error: "파싱 실패",
  timeout: "시간 초과",
  fallback: "예시 대체",
};

const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  success: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  parse_error: { color: "#e5484d", bg: "#ffffff", border: "#e5484d" },
  timeout: { color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
  fallback: { color: "#6b7280", bg: "#f1f3f9", border: "#e6ebfb" },
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ monthCount: 0, successRate: 0, fallbackCount: 0, avgMs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/reports");
      const json = await res.json();
      setReports(json.reports ?? []);
      setStats(json.stats ?? stats);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    { label: "이번 달 생성 수", value: `${stats.monthCount}건`, color: "#1f2437" },
    { label: "성공률", value: `${stats.successRate}%`, color: "#4f46e5" },
    { label: "예시 데이터 대체", value: `${stats.fallbackCount}건`, color: "#b45309" },
    { label: "평균 응답 시간", value: stats.avgMs ? `${(stats.avgMs / 1000).toFixed(1)}초` : "-", color: "#1f2437" },
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

      <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr 0.8fr 0.8fr 1fr 0.8fr",
            gap: 12,
            padding: "13px 20px",
            background: "#f8faff",
            fontSize: 12,
            fontWeight: 700,
            color: "#6b7280",
            borderBottom: "1px solid #e6ebfb",
          }}
        >
          <span>회원</span>
          <span>프로젝트</span>
          <span>프롬프트</span>
          <span>소요</span>
          <span>생성 일시</span>
          <span style={{ textAlign: "right" }}>결과</span>
        </div>

        {!loading && reports.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "48px 0", color: "#9aa3b8" }}>
            <Inbox size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 13 }}>기록이 없습니다.</span>
          </div>
        )}

        {reports.map((r) => {
          const st = STATUS_STYLE[r.status] ?? STATUS_STYLE.success;
          return (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.4fr 0.8fr 0.8fr 1fr 0.8fr",
                gap: 12,
                padding: "13px 20px",
                fontSize: 13,
                alignItems: "center",
                borderBottom: "1px solid #f1f3f9",
              }}
            >
              <span style={{ fontWeight: 700 }}>{r.user}</span>
              <span style={{ color: "#5b6178" }}>{r.project}</span>
              <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, color: "#4f46e5" }}>{r.version}</span>
              <span style={{ color: "#5b6178" }}>{r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}초` : "-"}</span>
              <span style={{ color: "#5b6178" }}>{new Date(r.createdAt).toLocaleString("ko-KR")}</span>
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
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
