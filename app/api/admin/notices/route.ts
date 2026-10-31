import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

const TARGET_LABELS = ["전체 회원", "기본 플랜", "유료 플랜", "인증 미완료"] as const;

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select("id, target, title, body, sent_count, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notices: (data ?? []).map((n) => ({
      id: n.id,
      target: n.target,
      title: n.title,
      body: n.body,
      sentCount: n.sent_count,
      createdAt: n.created_at,
    })),
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { target, title, text } = body as { target?: string; title?: string; text?: string };

  if (!title?.trim() || !text?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
  }
  if (!TARGET_LABELS.includes(target as (typeof TARGET_LABELS)[number])) {
    return NextResponse.json({ error: "대상이 올바르지 않습니다." }, { status: 400 });
  }

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarding_completed");

  const { data: payRows } = await supabaseAdmin
    .from("payments")
    .select("user_id, plan, paid_at")
    .eq("status", "완료")
    .order("paid_at", { ascending: false });

  const latestPlanByUser = new Map<string, string>();
  for (const r of payRows ?? []) {
    if (!latestPlanByUser.has(r.user_id)) latestPlanByUser.set(r.user_id, r.plan);
  }

  let recipients = profiles ?? [];
  if (target === "기본 플랜") {
    recipients = recipients.filter((p) => (latestPlanByUser.get(p.id) ?? "기본 플랜").includes("기본"));
  } else if (target === "유료 플랜") {
    recipients = recipients.filter((p) => {
      const plan = latestPlanByUser.get(p.id);
      return !!plan && !plan.includes("기본");
    });
  } else if (target === "인증 미완료") {
    recipients = recipients.filter((p) => !p.onboarding_completed);
  }

  if (recipients.length > 0) {
    const rows = recipients.map((p) => ({
      user_id: p.id,
      message: `[공지] ${title}`,
      link: null,
    }));
    const { error: notifyError } = await supabaseAdmin.from("notifications").insert(rows);
    if (notifyError) {
      return NextResponse.json({ error: notifyError.message }, { status: 500 });
    }
  }

  const { error: insertError } = await supabaseAdmin.from("announcements").insert({
    target,
    title,
    body: text,
    sent_count: recipients.length,
    created_by: auth.user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await logAdminAction(auth.user.id, "공지 발송", `${target} · ${recipients.length}명`);

  return NextResponse.json({ ok: true, sentCount: recipients.length });
}
