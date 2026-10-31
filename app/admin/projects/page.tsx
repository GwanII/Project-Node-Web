"use client";

import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";

type Project = {
  id: string;
  name: string;
  owner: string;
  template: string;
  members: number;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  createdAt: string;
};

function fmt(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR");
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/projects");
      const json = await res.json();
      setProjects(json.projects ?? []);
      setTemplateCounts(json.templateCounts ?? {});
      setLoading(false);
    })();
  }, []);

  const templateEntries = Object.entries(templateCounts);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))",
          gap: 14,
        }}
      >
        {(templateEntries.length > 0 ? templateEntries : [["전체", 0] as [string, number]]).map(
          ([label, value]) => (
            <div key={label} style={{ border: "1.5px solid #c7d2fe", borderRadius: 16, padding: "16px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{label}</div>
              <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900 }}>
                {value}
                <span style={{ fontSize: 12, color: "#9aa3b8", fontWeight: 400 }}> 개</span>
              </div>
            </div>
          )
        )}
      </div>

      <section style={{ border: "1.5px solid #c7d2fe", borderRadius: 18, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 0.9fr 0.9fr 0.7fr 1.4fr 0.8fr",
            gap: 12,
            padding: "13px 20px",
            background: "#f8faff",
            fontSize: 12,
            fontWeight: 700,
            color: "#6b7280",
            borderBottom: "1px solid #e6ebfb",
          }}
        >
          <span>프로젝트명</span>
          <span>소유자</span>
          <span>템플릿</span>
          <span>팀원</span>
          <span>기간</span>
          <span style={{ textAlign: "right" }}>진행</span>
        </div>

        {!loading && projects.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "48px 0", color: "#9aa3b8" }}>
            <Inbox size={28} strokeWidth={1.5} />
            <span style={{ fontSize: 13 }}>기록이 없습니다.</span>
          </div>
        )}

        {projects.map((p) => (
          <div
            key={p.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 0.9fr 0.9fr 0.7fr 1.4fr 0.8fr",
              gap: 12,
              padding: "14px 20px",
              fontSize: 13,
              alignItems: "center",
              borderBottom: "1px solid #f1f3f9",
            }}
          >
            <span style={{ fontWeight: 700 }}>{p.name}</span>
            <span style={{ color: "#5b6178" }}>{p.owner}</span>
            <span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#4f46e5",
                  background: "#eef2ff",
                  borderRadius: 6,
                  padding: "2px 8px",
                }}
              >
                {p.template}
              </span>
            </span>
            <span style={{ color: "#5b6178" }}>{p.members}명</span>
            <span style={{ color: "#5b6178" }}>
              {fmt(p.startDate)} – {fmt(p.endDate)}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
              <div style={{ width: 56, height: 6, borderRadius: 999, background: "#e6ebfb", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#4f46e5", width: `${p.progress}%` }} />
              </div>
              <span style={{ fontSize: 12, color: "#6b7280", width: 32, textAlign: "right" }}>{p.progress}%</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
