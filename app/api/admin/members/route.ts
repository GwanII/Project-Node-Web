import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, name, nickname, email, phone, onboarding_completed, role, is_suspended, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const [{ data: memberRows }, { data: payRows }] = await Promise.all([
    supabaseAdmin.from("project_members").select("user_id"),
    supabaseAdmin
      .from("payments")
      .select("user_id, plan, paid_at, status")
      .eq("status", "완료")
      .order("paid_at", { ascending: false }),
  ]);

  const projectCountByUser = new Map<string, number>();
  for (const row of memberRows ?? []) {
    if (!row.user_id) continue;
    projectCountByUser.set(row.user_id, (projectCountByUser.get(row.user_id) ?? 0) + 1);
  }

  const latestPlanByUser = new Map<string, string>();
  for (const row of payRows ?? []) {
    if (!latestPlanByUser.has(row.user_id)) latestPlanByUser.set(row.user_id, row.plan);
  }

  const members = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname,
    email: p.email,
    phone: p.phone,
    role: p.role,
    isSuspended: p.is_suspended,
    verified: !!p.onboarding_completed,
    plan: latestPlanByUser.get(p.id) ?? "기본",
    projects: projectCountByUser.get(p.id) ?? 0,
    createdAt: p.created_at,
  }));

  return NextResponse.json({ members });
}
