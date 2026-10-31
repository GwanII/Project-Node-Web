import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseAdmin
    .from("ai_reports")
    .select("id, project_name, prompt_version, duration_ms, status, created_at, user_id, profiles(name, nickname)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const thisMonth = rows.filter((r) => new Date(r.created_at) >= startOfMonth);
  const successCount = thisMonth.filter((r) => r.status === "success").length;
  const fallbackCount = thisMonth.filter((r) => r.status === "fallback").length;
  const durations = thisMonth.map((r) => r.duration_ms).filter((d): d is number => typeof d === "number");
  const avgMs = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  const reports = rows.map((r) => ({
    id: r.id,
    user:
      (r as unknown as { profiles?: { name?: string; nickname?: string } }).profiles?.name ??
      (r as unknown as { profiles?: { name?: string; nickname?: string } }).profiles?.nickname ??
      "알 수 없음",
    project: r.project_name,
    version: r.prompt_version ? `v${r.prompt_version}` : "-",
    durationMs: r.duration_ms,
    createdAt: r.created_at,
    status: r.status,
  }));

  return NextResponse.json({
    reports,
    stats: {
      monthCount: thisMonth.length,
      successRate: thisMonth.length > 0 ? Math.round((successCount / thisMonth.length) * 100) : 0,
      fallbackCount,
      avgMs,
    },
  });
}
