import "server-only";

import {
  createHash,
  randomBytes,
} from "node:crypto";

// 비밀번호 복구 권한 유지 시간
export const RECOVERY_DURATION_MINUTES = 10;

// 복구 권한을 저장하는 쿠키 이름
export const RECOVERY_COOKIE_NAME =
  "cobalthub_password_recovery";

// 복구 권한 데이터 타입
export type PasswordRecoveryGrant = {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

// 복구 권한 만료 시각 계산
export function getRecoveryExpiresAt(
  now: Date = new Date()
): Date {
  return new Date(
    now.getTime() +
      RECOVERY_DURATION_MINUTES * 60 * 1000
  );
}

// 암호학적으로 안전한 복구 토큰 생성
export function generateRecoveryToken(): string {
  return randomBytes(32).toString("hex");
}

// 복구 토큰을 SHA-256으로 해시
// 데이터베이스에는 원본 토큰을 저장하지 않음
export function hashRecoveryToken(
  token: string
): string {
  return createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

// 복구 권한 유효성 검사
export function isRecoveryGrantValid(
  grant: PasswordRecoveryGrant,
  now: Date = new Date()
): boolean {
  // 이미 사용한 권한은 거부
  if (grant.used_at !== null) {
    return false;
  }

  const createdAt = new Date(
    grant.created_at
  ).getTime();

  const expiresAt = new Date(
    grant.expires_at
  ).getTime();

  const currentTime = now.getTime();

  // 잘못된 날짜 데이터는 거부
  if (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(currentTime)
  ) {
    return false;
  }

  // 만료 시각이 발급 시각보다 빠르거나 같으면 거부
  if (expiresAt <= createdAt) {
    return false;
  }

  // 발급 이전 시각이면 거부
  if (currentTime < createdAt) {
    return false;
  }

  // 만료된 권한은 거부
  if (currentTime >= expiresAt) {
    return false;
  }

  return true;
}

// 남은 복구 시간 계산 (초 단위)
export function getRecoveryRemainingSeconds(
  grant: PasswordRecoveryGrant,
  now: Date = new Date()
): number {
  if (!isRecoveryGrantValid(grant, now)) {
    return 0;
  }

  const expiresAt = new Date(
    grant.expires_at
  ).getTime();

  return Math.max(
    0,
    Math.ceil(
      (expiresAt - now.getTime()) / 1000
    )
  );
}
