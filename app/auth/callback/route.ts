import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/src/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/mainpage`);
    }
    console.log("Google OAuth 세션 교환 오류:", error);
  }

  return NextResponse.redirect(`${origin}/login`);
}