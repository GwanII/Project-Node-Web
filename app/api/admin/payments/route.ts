import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("id, plan, amount, method, card_holder, status, paid_at, refunded_at, user_id, profiles(name, nickname, email)")
    .order("paid_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const rows = data ?? [];
  const thisMonth = rows.filter((r) => new Date(r.paid_at) >= startOfMonth);
  const revenue = thisMonth.filter((r) => r.status === "완료").reduce((sum, r) => sum + r.amount, 0);

  const payments = rows.map((r) => ({
    id: r.id,
    user: (r as unknown as { profiles?: { name?: string; nickname?: string } }).profiles?.name ?? "알 수 없음",
    email: (r as unknown as { profiles?: { email?: string } }).profiles?.email ?? "-",
    plan: r.plan,
    amount: r.amount,
    method: r.method,
    cardHolder: r.card_holder,
    status: r.status,
    paidAt: r.paid_at,
    refundedAt: r.refunded_at,
  }));

  return NextResponse.json({
    payments,
    stats: {
      monthRevenue: revenue,
      completedCount: thisMonth.filter((r) => r.status === "완료").length,
      refundedCount: thisMonth.filter((r) => r.status === "환불").length,
      failedCount: thisMonth.filter((r) => r.status === "실패").length,
    },
  });
}
