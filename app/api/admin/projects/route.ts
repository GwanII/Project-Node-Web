import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data: projects, error } = await supabaseAdmin
    .from("projectdata")
    .select("id, project_name, selected_template, start_date, end_date, user_name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: members } = await supabaseAdmin
    .from("project_members")
    .select("project_id, progress");

  const byProject = new Map<string, { count: number; progressSum: number }>();
  for (const m of members ?? []) {
    const cur = byProject.get(m.project_id) ?? { count: 0, progressSum: 0 };
    cur.count += 1;
    cur.progressSum += m.progress ?? 0;
    byProject.set(m.project_id, cur);
  }

  const templateCounts: Record<string, number> = {};
  const result = (projects ?? []).map((p) => {
    templateCounts[p.selected_template] = (templateCounts[p.selected_template] ?? 0) + 1;
    const agg = byProject.get(p.id);
    const progress = agg && agg.count > 0 ? Math.round(agg.progressSum / agg.count) : 0;
    return {
      id: p.id,
      name: p.project_name,
      owner: p.user_name,
      template: p.selected_template,
      members: agg?.count ?? 0,
      startDate: p.start_date,
      endDate: p.end_date,
      progress,
      createdAt: p.created_at,
    };
  });

  return NextResponse.json({ projects: result, templateCounts });
}
