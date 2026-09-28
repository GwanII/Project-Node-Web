import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase-admin";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "토큰이 없습니다." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("mobile_upload_tokens")
    .select("expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "유효하지 않거나 만료된 링크입니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const token = formData.get("token");
  const file = formData.get("file");

  if (typeof token !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("mobile_upload_tokens")
    .select("created_by, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "유효하지 않거나 만료된 링크입니다." }, { status: 404 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `mobile-uploads/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("cobalt-files")
    .upload(storagePath, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type: "image" | "document" = IMAGE_EXTENSIONS.includes(ext) ? "image" : "document";
  const size =
    file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

  // 바로 files에 넣지 않고 대기 목록에 올려서, PC에서 확정 업로드를 눌러야 실제로 반영되게 한다.
  const { data: pendingRow, error: insertError } = await supabase
    .from("mobile_upload_pending")
    .insert({ token, name: file.name, type, size, storage_path: storagePath })
    .select("id, name")
    .single();

  if (insertError || !pendingRow) {
    return NextResponse.json({ error: insertError?.message ?? "저장 실패" }, { status: 500 });
  }

  return NextResponse.json({ success: true, item: pendingRow });
}
