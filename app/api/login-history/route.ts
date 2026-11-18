import { NextResponse } from "next/server";
import { recordLoginHistory } from "@/src/lib/login-history";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await recordLoginHistory({
      accessToken: token,
      loginMethod: "password",
      headers: request.headers,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("로그인 기록 저장 오류:", error);
    return NextResponse.json({ error: "Failed to save login history" }, { status: 500 });
  }
}
