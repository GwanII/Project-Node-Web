import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "../../../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

const KEY = "cover_letter";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const { data: target } = await supabaseAdmin
    .from("prompt_versions")
    .select("id, version")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "버전을 찾을 수 없습니다." }, { status: 404 });
  }

  // key당 is_live는 1개만 허용되므로, 먼저 모두 내리고 대상만 올린다.
  const { error: unsetError } = await supabaseAdmin
    .from("prompt_versions")
    .update({ is_live: false })
    .eq("key", KEY)
    .eq("is_live", true);

  if (unsetError) {
    return NextResponse.json({ error: unsetError.message }, { status: 500 });
  }

  const { error: setError } = await supabaseAdmin
    .from("prompt_versions")
    .update({ is_live: true })
    .eq("id", id);

  if (setError) {
    return NextResponse.json({ error: setError.message }, { status: 500 });
  }

  await logAdminAction(auth.user.id, "프롬프트 배포", `v${target.version}`);

  return NextResponse.json({ ok: true });
}
