import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "user";
  if (role !== "admin" && role !== "super_admin") {
    return { error: NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 }) };
  }

  return { user, profile: profile! };
}

export async function logAdminAction(adminId: string, action: string, target?: string) {
  await supabaseAdmin.from("admin_audit_logs").insert({ admin_id: adminId, action, target });
}
