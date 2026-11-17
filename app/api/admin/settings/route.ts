import { NextResponse } from "next/server";
import { requireAdmin } from "../_lib/requireAdmin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const [{ data: admins, error: adminsError }, { data: logs, error: logsError }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, name, nickname, email, role")
      .in("role", ["admin", "super_admin"])
      .order("name", { ascending: true }),
    supabaseAdmin
      .from("admin_audit_logs")
      .select("id, action, target, created_at, profiles(name, nickname)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (adminsError) return NextResponse.json({ error: adminsError.message }, { status: 500 });
  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 });

  return NextResponse.json({
    admins: (admins ?? []).map((a) => ({
      id: a.id,
      name: a.name || a.nickname,
      email: a.email,
      role: a.role === "super_admin" ? "최고 관리자" : "관리자",
    })),
    auditLog: (logs ?? []).map((l) => ({
      id: l.id,
      time: new Date(l.created_at).toLocaleString("ko-KR"),
      who:
        (l as unknown as { profiles?: { name?: string; nickname?: string } }).profiles?.name ??
        (l as unknown as { profiles?: { name?: string; nickname?: string } }).profiles?.nickname ??
        "관리자",
      what: l.target ? `${l.action} · ${l.target}` : l.action,
    })),
  });
}

export async function POST(req: Request) {
  // 관리자 초대: 기존 가입 회원의 이메일로 admin 권한을 부여한다 (이미 가입된 회원만 가능).
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "해당 이메일로 가입된 회원이 없습니다." }, { status: 404 });
  }
  if (target.role === "admin" || target.role === "super_admin") {
    return NextResponse.json({ error: "이미 관리자입니다." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").update({ role: "admin" }).eq("id", target.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from("admin_audit_logs").insert({
    admin_id: auth.user.id,
    action: "관리자 초대",
    target: email,
  });

  return NextResponse.json({ ok: true });
}
