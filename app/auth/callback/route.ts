import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Google OAuth 인증 후 Supabase가 전달한 일회성 code
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();

    // code를 실제 로그인 세션으로 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 세션 생성 성공
      // mainpage로 바로 이동하지 않고 login으로 돌아감
      // login 페이지에서 휴대폰 인증 여부를 확인
      return NextResponse.redirect(`${origin}/login?oauth=success`);
    }

    console.log("Google OAuth 세션 교환 오류:", error);
  }

  // code가 없거나 세션 생성에 실패한 경우
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}