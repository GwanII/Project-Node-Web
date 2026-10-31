import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

async function getInviteOr404(id: string) {
  const { data: invite } = await supabaseAdmin
    .from("project_invites")
    .select(
      "id, project_id, invited_email, invited_user_id, invited_by, role, permission, status, expires_at"
    )
    .eq("id", id)
    .maybeSingle();
  return invite;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const invite = await getInviteOr404(id);
  if (!invite) {
    return NextResponse.json({ error: "초대를 찾을 수 없습니다." }, { status: 404 });
  }

  const emailMatches =
    invite.invited_email?.toLowerCase() === (user.email ?? "").toLowerCase();
  const idMatches = invite.invited_user_id === user.id;

  if (!emailMatches && !idMatches) {
    return NextResponse.json({ error: "본인에게 온 초대가 아닙니다." }, { status: 403 });
  }

  const [{ data: project }, { data: inviterProfile }] = await Promise.all([
    supabaseAdmin.from("projectdata").select("project_name").eq("id", invite.project_id).single(),
    supabaseAdmin.from("profiles").select("name").eq("id", invite.invited_by).single(),
  ]);

  const expired = new Date(invite.expires_at) < new Date();

  return NextResponse.json({
    id: invite.id,
    status: expired && invite.status === "pending" ? "expired" : invite.status,
    role: invite.role,
    permission: invite.permission,
    projectId: invite.project_id,
    projectName: project?.project_name ?? "프로젝트",
    inviterName: inviterProfile?.name ?? "팀원",
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action as "accept" | "decline" | undefined;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const invite = await getInviteOr404(id);
  if (!invite) {
    return NextResponse.json({ error: "초대를 찾을 수 없습니다." }, { status: 404 });
  }

  const emailMatches =
    invite.invited_email?.toLowerCase() === (user.email ?? "").toLowerCase();
  const idMatches = invite.invited_user_id === user.id;

  if (!emailMatches && !idMatches) {
    return NextResponse.json({ error: "본인에게 온 초대가 아닙니다." }, { status: 403 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 초대입니다." }, { status: 409 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    await supabaseAdmin.from("project_invites").update({ status: "expired" }).eq("id", id);
    return NextResponse.json({ error: "만료된 초대입니다." }, { status: 410 });
  }

  if (action === "decline") {
    await supabaseAdmin
      .from("project_invites")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ success: true, status: "declined" });
  }

  const { data: existingMember } = await supabaseAdmin
    .from("project_members")
    .select("id")
    .eq("project_id", invite.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingMember) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const { error: memberError } = await supabaseAdmin.from("project_members").insert({
      project_id: invite.project_id,
      user_id: user.id,
      name: profile?.name || user.email || "팀원",
      role: invite.role,
      permission: invite.permission,
    });

    if (memberError) {
      return NextResponse.json(
        { error: "팀원 추가 실패: " + memberError.message },
        { status: 500 }
      );
    }
  }

  await supabaseAdmin
    .from("project_invites")
    .update({
      status: "accepted",
      invited_user_id: user.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ success: true, status: "accepted", projectId: invite.project_id });
}
