
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/src/lib/supabase-admin";
import {
  RECOVERY_COOKIE_NAME,
  hashRecoveryToken,
  isRecoveryGrantValid,
  getRecoveryRemainingSeconds,
  type PasswordRecoveryGrant,
} from "@/src/lib/password-recovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RecoveryGrantWithProcessing =
  PasswordRecoveryGrant & {
    processing_id: string | null;
    processing_started_at: string | null;
  };

type RecoveryStatus =
  | "active"
  | "processing"
  | "invalid";

function statusResponse(
  status: RecoveryStatus,
  remainingSeconds = 0,
  httpStatus = 200
): NextResponse {
  return NextResponse.json(
    {
      valid: status === "active",
      status,
      remainingSeconds,
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // 1. HttpOnly 복구 쿠키 확인
    const recoveryToken = request.cookies.get(
      RECOVERY_COOKIE_NAME
    )?.value;

    if (
      !recoveryToken ||
      !/^[a-f0-9]{64}$/.test(recoveryToken)
    ) {
      return statusResponse("invalid");
    }

    // 2. 복구 토큰 해시 생성
    const tokenHash = hashRecoveryToken(recoveryToken);

    // 3. DB 조회
    const { data, error } = await supabaseAdmin
      .from("password_recovery_grants")
      .select(
        "id, user_id, token_hash, created_at, expires_at, used_at, processing_id, processing_started_at"
      )
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      console.error(
        "[Recovery Status] DB 조회 오류:",
        error
      );

      return statusResponse("invalid", 0, 500);
    }

    if (!data) {
      return statusResponse("invalid");
    }

    const grant =
      data as RecoveryGrantWithProcessing;

    // 4. 이미 사용했거나 만료된 권한
    if (!isRecoveryGrantValid(grant)) {
      return statusResponse("invalid");
    }

    const remainingSeconds =
      getRecoveryRemainingSeconds(grant);

    // 5. 비밀번호 변경 처리 중 또는 결과 불확실
    if (grant.processing_id !== null) {
      return statusResponse(
        "processing",
        remainingSeconds
      );
    }

    // 6. 정상적으로 사용할 수 있는 권한
    return statusResponse(
      "active",
      remainingSeconds
    );
  } catch (error) {
    console.error(
      "[Recovery Status] 서버 오류:",
      error
    );

    return statusResponse("invalid", 0, 500);
  }
}
