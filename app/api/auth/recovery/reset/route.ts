import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/src/lib/supabase-admin";
import {
  RECOVERY_COOKIE_NAME,
  hashRecoveryToken,
} from "@/src/lib/password-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResetRequestBody = {
  password?: unknown;
  confirmPassword?: unknown;
};

type ClaimResult = {
  grant_id: string;
  recovery_user_id: string;
};

function jsonResponse(
  status: number,
  message: string,
  code: string,
  success = false
): NextResponse {
  return NextResponse.json(
    {
      success,
      code,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

function clearRecoveryCookie(
  response: NextResponse
): NextResponse {
  response.cookies.set(RECOVERY_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function validatePassword(
  password: string,
  confirmPassword: string
): string | null {
  if (password !== confirmPassword) {
    return "비밀번호가 일치하지 않습니다.";
  }

  if (password.length < 8 || password.length > 20) {
    return "비밀번호는 8~20자로 입력해 주세요.";
  }

  if (!/[A-Za-z]/.test(password)) {
    return "영문자를 1개 이상 포함해 주세요.";
  }

  if (!/[0-9]/.test(password)) {
    return "숫자를 1개 이상 포함해 주세요.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "특수문자를 1개 이상 포함해 주세요.";
  }

  return null;
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  return origin === request.nextUrl.origin;
}

function isRecoveryTokenValid(
  token: string | undefined
): token is string {
  return (
    typeof token === "string" &&
    /^[a-f0-9]{64}$/.test(token)
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  // 1. 동일 출처 요청 확인
  if (!isSameOrigin(request)) {
    return jsonResponse(
      403,
      "허용되지 않은 요청입니다.",
      "invalid_origin"
    );
  }

  // 2. 요청 본문 확인
  let body: ResetRequestBody;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      400,
      "올바르지 않은 요청 형식입니다.",
      "invalid_request"
    );
  }

  if (!body || typeof body !== "object") {
    return jsonResponse(
      400,
      "올바르지 않은 요청입니다.",
      "invalid_request"
    );
  }

  const { password, confirmPassword } = body;

  if (
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    return jsonResponse(
      400,
      "비밀번호를 입력해 주세요.",
      "invalid_password"
    );
  }

  // 3. 비밀번호 유효성 검사
  const validationError = validatePassword(
    password,
    confirmPassword
  );

  if (validationError) {
    return jsonResponse(
      400,
      validationError,
      "invalid_password"
    );
  }

  // 4. 복구 쿠키 확인
  const recoveryToken = request.cookies.get(
    RECOVERY_COOKIE_NAME
  )?.value;

  if (!isRecoveryTokenValid(recoveryToken)) {
    return jsonResponse(
      401,
      "비밀번호 복구 인증이 필요합니다.",
      "recovery_required"
    );
  }

  const tokenHash = hashRecoveryToken(recoveryToken);
  const processingId = randomUUID();

  // 5. 복구 권한 처리권 획득
  const {
    data: claimData,
    error: claimError,
  } = await supabaseAdmin.rpc(
    "claim_password_recovery_grant",
    {
      p_token_hash: tokenHash,
      p_processing_id: processingId,
    }
  );

  if (claimError) {
    console.error(
      "[Recovery Reset] 처리권 획득 오류:",
      claimError
    );

    return jsonResponse(
      500,
      "복구 권한 확인 중 오류가 발생했습니다.",
      "recovery_check_failed"
    );
  }

  const claims = claimData as ClaimResult[] | null;

  if (!claims || claims.length !== 1) {
    // 이미 처리 중인지, 만료인지 여부는
    // 상태 조회 API를 통해 구분할 수 있음
    return jsonResponse(
      409,
      "복구 권한이 만료되었거나 현재 처리 중입니다.",
      "recovery_unavailable"
    );
  }

  const userId = claims[0].recovery_user_id;

  // 6. 실제 비밀번호 변경
  let authResult;

  try {
    authResult =
      await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );
  } catch (error) {
    // Supabase에서 이미 변경했을 가능성이 있음
    console.error(
      "[Recovery Reset] Auth 응답 불확실:",
      error
    );

    return jsonResponse(
      503,
      "서버 또는 네트워크 문제로 비밀번호 변경 결과를 확인할 수 없습니다. 새 비밀번호로 로그인을 시도하거나 이메일 인증을 다시 진행해 주세요.",
      "recovery_uncertain"
    );
  }

  if (authResult.error) {
    console.error(
      "[Recovery Reset] Auth 오류:",
      authResult.error
    );

    // 특정 오류는 Auth가 명확히 변경을 거부한 것으로 취급
    // 일반적인 400/422 전체를 무조건 안전한 실패로
    // 간주하지 않음
    const safeRejectionCodes = new Set([
      "same_password",
      "weak_password",
    ]);

    if (
      safeRejectionCodes.has(
        authResult.error.code ?? ""
      )
    ) {
      const {
        data: released,
        error: releaseError,
      } = await supabaseAdmin.rpc(
        "release_password_recovery_grant",
        {
          p_token_hash: tokenHash,
          p_processing_id: processingId,
        }
      );

      if (releaseError || released !== true) {
        console.error(
          "[Recovery Reset] 처리권 해제 실패:",
          releaseError
        );

        return jsonResponse(
          503,
          "복구 권한 상태를 확인할 수 없습니다. 이메일 인증을 다시 진행해 주세요.",
          "recovery_uncertain"
        );
      }

      return jsonResponse(
        400,
        authResult.error.code === "same_password"
          ? "기존 비밀번호와 다른 비밀번호를 입력해 주세요."
          : "비밀번호 보안 조건을 확인해 주세요.",
        "password_rejected"
      );
    }

    // 그 외 오류는 실제 변경 여부를 확신하지 않음
    return jsonResponse(
      503,
      "비밀번호 변경 결과를 확인할 수 없습니다. 새 비밀번호로 로그인을 시도하거나 이메일 인증을 다시 진행해 주세요.",
      "recovery_uncertain"
    );
  }

  // 7. Auth 변경 성공 후 복구 권한 사용 완료
  const {
    data: completed,
    error: completeError,
  } = await supabaseAdmin.rpc(
    "complete_password_recovery_grant",
    {
      p_token_hash: tokenHash,
      p_processing_id: processingId,
    }
  );

  if (completeError || completed !== true) {
    console.error(
      "[Recovery Reset] 권한 사용 완료 처리 실패:",
      completeError
    );

    // Auth 변경은 성공했으나 DB 상태 확정 실패
    // 재시도 시 중복 변경을 막기 위해 처리권 유지
    return jsonResponse(
      503,
      "비밀번호 변경은 처리되었지만 복구 권한 정리가 완료되지 않았습니다. 새 비밀번호로 로그인을 확인해 주세요.",
      "recovery_uncertain"
    );
  }

  // 8. 성공 시 복구 쿠키 제거
  const response = jsonResponse(
    200,
    "비밀번호가 성공적으로 변경되었습니다.",
    "password_updated",
    true
  );

  return clearRecoveryCookie(response);
}
