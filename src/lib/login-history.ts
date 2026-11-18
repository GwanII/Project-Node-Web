
import "server-only";

import { supabaseAdmin } from "@/src/lib/supabase-admin";

// 지원하는 로그인 방식
type LoginMethod = "password" | "google";

function getSessionId(accessToken: string): string | null {
  try {
    const payload = accessToken.split(".")[1];

    if (!payload) {
      return null;
    }

    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    const sessionId = claims.session_id;

    const isValidSessionId =
      typeof sessionId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sessionId
      );

    return isValidSessionId ? sessionId : null;
  } catch {
    // JWT 디코딩 또는 JSON 파싱 실패
    return null;
  }
}

// User-Agent를 분석하여 접속 환경 확인
function detectDevice(userAgent: string) {
  const ua = userAgent.toLowerCase();

  // 태블릿 여부 확인
  const tablet =
    /ipad|tablet|kindle|silk|playbook/.test(ua) ||
    (/android/.test(ua) && !/mobile/.test(ua));

  // 모바일 여부 확인
  const mobile =
    !tablet &&
    /iphone|ipod|android|mobile/.test(ua);

  // 기기 종류 구분
  const device_type = tablet
    ? "tablet"
    : mobile
      ? "mobile"
      : ua
        ? "desktop"
        : "unknown";

  // 운영체제 구분
  const os_name = /ipad/.test(ua)
    ? "iPadOS"
    : /iphone|ipod/.test(ua)
      ? "iOS"
      : /android/.test(ua)
        ? "Android"
        : /windows/.test(ua)
          ? "Windows"
          : /mac os|macintosh/.test(ua)
            ? "macOS"
            : /linux/.test(ua)
              ? "Linux"
              : "Unknown";

  // 브라우저 구분
  const browser_name = /edg\//.test(ua)
    ? "Edge"
    : /opr\//.test(ua)
      ? "Opera"
      : /firefox\//.test(ua)
        ? "Firefox"
        : /chrome\//.test(ua)
          ? "Chrome"
          : /safari\//.test(ua)
            ? "Safari"
            : "Unknown";

  return {
    device_type,
    os_name,
    browser_name,
  };
}

// HTTP 요청 헤더에서 클라이언트 IP 추출
function getClientIp(headers: Headers): string | null {
  // 프록시가 전달한 IP 목록
  const forwarded = headers.get("x-forwarded-for");

  // 여러 IP가 있다면 첫 번째 값을 사용
  const ip = (
    forwarded?.split(",")[0] ??
    headers.get("x-real-ip") ??
    ""
  ).trim();

  if (
    !ip ||
    ip.length > 45 ||
    !/^[0-9a-fA-F:.]+$/.test(ip)
  ) {
    return null;
  }

  return ip;
}

// 로그인 성공 기록을 Supabase DB에 저장
export async function recordLoginHistory({
  accessToken,
  loginMethod,
  headers,
}: {
  accessToken: string;
  loginMethod: LoginMethod;
  headers: Headers;
}) {
  // 1. Supabase Auth에서 실제 사용자 인증
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // 2. 인증 토큰에서 세션 ID 추출
  const auth_session_id = getSessionId(accessToken);

  if (!auth_session_id) {
    throw new Error("Missing session_id claim");
  }

  // 3. 브라우저 User-Agent 가져오기
  const user_agent = (
    headers.get("user-agent") ?? ""
  ).slice(0, 2048);

  // 기기 종류, OS, 브라우저 분석
  const device = detectDevice(user_agent);

  // 4~5. IP 및 로그인 정보를 DB에 저장
  const { error } = await supabaseAdmin
    .from("login_history")
    .insert({
      user_id: user.id,
      login_method: loginMethod,
      auth_session_id,
      user_agent,
      ip_address: getClientIp(headers),

      // device_type, os_name, browser_name
      ...device,
    });

  // 23505: PostgreSQL UNIQUE 제약 조건 위반
  // 같은 세션이 이미 기록된 경우에는 무시
  if (error && error.code !== "23505") {
    throw error;
  }
}
