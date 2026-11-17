import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const monthStart = startOfMonth();
  const today = new Date();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(today.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [
    { count: userCount },
    { data: projects },
    { data: monthPayments },
    { data: recentPaymentRows },
    { data: revenuePayments },
    { data: monthReports },
    { data: unverified },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("projectdata").select("id, end_date"),
    supabaseAdmin.from("payments").select("amount, status").gte("paid_at", monthStart.toISOString()),
    supabaseAdmin
      .from("payments")
      .select("id, plan, amount, status, paid_at, profiles(name, nickname)")
      .order("paid_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("payments")
      .select("amount, status, paid_at")
      .eq("status", "완료")
      .gte("paid_at", fourteenDaysAgo.toISOString()),
    supabaseAdmin.from("ai_reports").select("status").gte("created_at", monthStart.toISOString()),
    supabaseAdmin.from("profiles").select("name, nickname").eq("onboarding_completed", false),
  ]);

  // KPI: 활성 프로젝트 (마감일이 없거나 아직 지나지 않은 프로젝트)
  const activeProjectCount = (projects ?? []).filter(
    (p) => !p.end_date || new Date(p.end_date) >= today
  ).length;

  // KPI: 이번 달 매출
  const monthRevenue = (monthPayments ?? [])
    .filter((p) => p.status === "완료")
    .reduce((sum, p) => sum + p.amount, 0);

  // KPI: AI 리포트 생성 수 / 실패율
  const reportStatuses = (monthReports ?? []).map((r) => r.status);
  const reportFailCount = reportStatuses.filter((s) => s === "parse_error" || s === "timeout").length;
  const reportFailRate = reportStatuses.length > 0 ? Math.round((reportFailCount / reportStatuses.length) * 100) : 0;

  // 전체 결제 실패 건수 (이번 달)
  const monthFailedPayments = (monthPayments ?? []).filter((p) => p.status === "실패").length;

  // 최근 14일 매출 차트 (데이터 없는 날은 0)
  const byDay = new Map<string, number>();
  for (const p of revenuePayments ?? []) {
    const key = dayKey(new Date(p.paid_at));
    byDay.set(key, (byDay.get(key) ?? 0) + p.amount);
  }
  const revenueDays: { date: string; amount: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo);
    d.setDate(fourteenDaysAgo.getDate() + i);
    const key = dayKey(d);
    revenueDays.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, amount: byDay.get(key) ?? 0 });
  }

  // 플랜 분포 (최근 완료 결제 기준, 없으면 기본)
  const { data: allPlanPayments } = await supabaseAdmin
    .from("payments")
    .select("user_id, plan, paid_at")
    .eq("status", "완료")
    .order("paid_at", { ascending: false });

  const latestPlanByUser = new Map<string, string>();
  for (const r of allPlanPayments ?? []) {
    if (!latestPlanByUser.has(r.user_id)) latestPlanByUser.set(r.user_id, r.plan);
  }
  const planCounts = new Map<string, number>();
  const totalUsers = userCount ?? 0;
  {
    const { data: allProfiles } = await supabaseAdmin.from("profiles").select("id");
    for (const p of allProfiles ?? []) {
      const plan = latestPlanByUser.get(p.id) ?? "기본 플랜";
      planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
    }
  }
  const planDist = Array.from(planCounts.entries()).map(([name, count]) => ({
    name,
    count,
    pct: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0,
  }));

  // 최근 결제 5건
  const recentPayments = (recentPaymentRows ?? []).map((r) => ({
    user:
      (r as unknown as { profiles?: { name?: string; nickname?: string } }).profiles?.name ??
      (r as unknown as { profiles?: { name?: string; nickname?: string } }).profiles?.nickname ??
      "알 수 없음",
    plan: r.plan,
    amount: r.amount,
    date: new Date(r.paid_at).toLocaleString("ko-KR"),
    status: r.status,
  }));

  // 처리 필요 목록
  const todos: { tag: string; text: string; href: string }[] = [];
  if (monthFailedPayments > 0) {
    todos.push({ tag: "결제 실패", text: `이번 달 결제 실패 ${monthFailedPayments}건`, href: "/admin/payments" });
  }
  if (reportFailCount > 0) {
    todos.push({ tag: "파싱 실패", text: `AI 리포트 ${reportFailCount}건 생성 실패`, href: "/admin/reports" });
  }
  const unverifiedList = (unverified ?? []) as { name?: string; nickname?: string }[];
  if (unverifiedList.length > 0) {
    const names = unverifiedList.slice(0, 2).map((u) => u.name || u.nickname).join(", ");
    const rest = unverifiedList.length > 2 ? ` 외 ${unverifiedList.length - 2}명` : "";
    todos.push({ tag: "인증 미완료", text: `${names}${rest} 휴대폰 인증 미완료`, href: "/admin/members" });
  }

  return NextResponse.json({
    kpis: {
      userCount: totalUsers,
      activeProjectCount,
      monthRevenue,
      aiReportCount: reportStatuses.length,
      aiReportFailRate: reportFailRate,
    },
    revenueDays,
    planDist,
    recentPayments,
    todos,
  });
}
