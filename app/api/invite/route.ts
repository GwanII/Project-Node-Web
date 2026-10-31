import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const projectId = body?.projectId as string | undefined;
  const invitedEmail = (body?.email as string | undefined)?.trim().toLowerCase();

  if (!projectId || !invitedEmail) {
    return NextResponse.json({ error: "projectId와 email이 필요합니다." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }

  // 요청자가 이 프로젝트의 팀원인지 확인 (팀원만 다른 사람을 초대할 수 있음)
  const { data: requesterMembership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!requesterMembership) {
    return NextResponse.json(
      { error: "이 프로젝트의 팀원만 초대할 수 있습니다." },
      { status: 403 }
    );
  }

  const [{ data: project }, { data: inviterProfile }, { data: invitedProfile }] =
    await Promise.all([
      supabaseAdmin.from("projectdata").select("project_name").eq("id", projectId).single(),
      supabaseAdmin.from("profiles").select("name").eq("id", user.id).single(),
      supabaseAdmin
        .from("profiles")
        .select("id, name")
        .eq("email", invitedEmail)
        .maybeSingle(),
    ]);

  if (invitedProfile) {
    const { data: alreadyMember } = await supabaseAdmin
      .from("project_members")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", invitedProfile.id)
      .maybeSingle();

    if (alreadyMember) {
      return NextResponse.json({ error: "이미 팀원으로 참여 중입니다." }, { status: 409 });
    }
  }

  const { data: existingInvite } = await supabaseAdmin
    .from("project_invites")
    .select("id")
    .eq("project_id", projectId)
    .eq("invited_email", invitedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json({ error: "이미 초대를 보낸 이메일입니다." }, { status: 409 });
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("project_invites")
    .insert({
      project_id: projectId,
      invited_email: invitedEmail,
      invited_user_id: invitedProfile?.id ?? null,
      invited_by: user.id,
    })
    .select("id")
    .single();

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: inviteError?.message ?? "초대 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const inviteLink = `${appUrl}/invite/${invite.id}`;
  const projectName = project?.project_name ?? "프로젝트";
  const inviterName = inviterProfile?.name ?? "팀원";

  if (invitedProfile) {
    // 이미 가입된 유저 → 인앱 알림으로 초대 (메일 발송 없음)
    const { error: notiError } = await supabaseAdmin.from("notifications").insert({
      user_id: invitedProfile.id,
      project_id: projectId,
      message: `${inviterName}님이 [${projectName}] 프로젝트에 초대했습니다.`,
      link: `/invite/${invite.id}`,
    });

    if (notiError) {
      console.error("초대 알림 생성 실패:", notiError);
    }
  } else {
    // 미가입 유저 → Supabase 기본 초대 메일 발송
    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      invitedEmail,
      { redirectTo: inviteLink }
    );

    if (emailError) {
      await supabaseAdmin.from("project_invites").delete().eq("id", invite.id);
      return NextResponse.json(
        { error: `초대 메일 발송 실패: ${emailError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    inviteId: invite.id,
    registered: !!invitedProfile,
  });
}
