import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "../../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (id === auth.user.id && "role" in body) {
    return NextResponse.json({ error: "본인의 권한은 변경할 수 없습니다." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.isSuspended === "boolean") updates.is_suspended = body.isSuspended;
  if (typeof body.role === "string" && ["user", "admin", "super_admin"].includes(body.role)) {
    updates.role = body.role;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 값이 없습니다." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(
    auth.user.id,
    "isSuspended" in updates ? (updates.is_suspended ? "회원 정지" : "회원 정지 해제") : "회원 권한 변경",
    id
  );

  return NextResponse.json({ ok: true });
}
