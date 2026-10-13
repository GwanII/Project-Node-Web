import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { name, email, password, turnstileToken } = await request.json();

    // 1. 필요한 값 확인
    if (!name || !email || !password || !turnstileToken) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 },
      );
    }

    // 2. Turnstile Secret Key 확인
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      console.error("TURNSTILE_SECRET_KEY가 설정되지 않았습니다.");

      return NextResponse.json(
        { error: "서버 설정 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    // 3. Cloudflare에 Turnstile token 검증 요청
    const formData = new FormData();

    formData.append("secret", secretKey);
    formData.append("response", turnstileToken);

    const turnstileResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      },
    );

    const turnstileResult = await turnstileResponse.json();

    // 4. CAPTCHA 검증 실패
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: "CAPTCHA 인증에 실패했습니다." },
        { status: 400 },
      );
    }

    // 5. CAPTCHA 성공 → Supabase 회원가입
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.headers.get("origin")}/login`,
        data: {
          name,
        },
      },
    });

    // 6. Supabase 오류 처리
    if (error) {
      console.error(error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    // 7. 회원가입 성공
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}