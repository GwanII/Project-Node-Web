import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

const KEY = "cover_letter";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("prompt_versions")
    .select("id, version, content, memo, model, temperature, fallback_enabled, is_live, created_by, created_at, profiles(name)")
    .eq("key", KEY)
    .order("version", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const versions = (data ?? []).map((v) => ({
    id: v.id,
    version: v.version,
    content: v.content,
    memo: v.memo,
    model: v.model,
    temperature: v.temperature,
    fallbackEnabled: v.fallback_enabled,
    isLive: v.is_live,
    authorName: (v as unknown as { profiles?: { name?: string } }).profiles?.name ?? "관리자",
    createdAt: v.created_at,
  }));

  return NextResponse.json({ versions });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { content, memo, model, temperature, fallbackEnabled } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "프롬프트 내용이 필요합니다." }, { status: 400 });
  }

  const { data: maxRow } = await supabaseAdmin
    .from("prompt_versions")
    .select("version")
    .eq("key", KEY)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (maxRow?.version ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("prompt_versions")
    .insert({
      key: KEY,
      version: nextVersion,
      content,
      memo: memo ?? null,
      model: model ?? "qwen2.5:7b",
      temperature: typeof temperature === "number" ? temperature : 0.3,
      fallback_enabled: fallbackEnabled !== false,
      is_live: false,
      created_by: auth.user.id,
    })
    .select("id, version")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.user.id, "프롬프트 새 버전 저장", `v${nextVersion}`);

  return NextResponse.json({ id: data.id, version: data.version });
}
