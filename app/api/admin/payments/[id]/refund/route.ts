import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "../../../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "결제 내역을 찾을 수 없습니다." }, { status: 404 });
  }
  if (payment.status !== "완료") {
    return NextResponse.json({ error: "완료된 결제만 환불할 수 있습니다." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("payments")
    .update({ status: "환불", refunded_at: new Date().toISOString(), refunded_by: auth.user.id })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.user.id, "결제 환불 처리", id);

  return NextResponse.json({ ok: true });
}
