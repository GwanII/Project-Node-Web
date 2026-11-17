import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "../../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { key } = await params;
  const body = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.price === "number") updates.price = body.price;
  if (typeof body.priceLabel === "string") updates.price_label = body.priceLabel;
  if (typeof body.projectLimit === "string") updates.project_limit = body.projectLimit;
  if (typeof body.memberLimit === "string") updates.member_limit = body.memberLimit;
  if (Array.isArray(body.features)) updates.features = body.features;
  if (typeof body.isActive === "boolean") updates.is_active = body.isActive;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 값이 없습니다." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("plans").update(updates).eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(
    auth.user.id,
    "isActive" in updates ? (updates.is_active ? "플랜 판매 재개" : "플랜 판매 중지") : "플랜 정보 수정",
    key
  );

  return NextResponse.json({ ok: true });
}
