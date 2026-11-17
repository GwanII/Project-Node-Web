
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

type RecoveryStatus = "checking" | "verified" | "invalid";

export default function RecoveryPage() {
  const [status, setStatus] =
    useState<RecoveryStatus>("checking");

  const [message, setMessage] = useState(
    "이메일 인증 정보를 확인하고 있습니다."
  );

  useEffect(() => {
    let active = true;

    const checkRecovery = async () => {
      const url = new URL(window.location.href);

      const hash = new URLSearchParams(
        url.hash.substring(1)
      );

      const error =
        hash.get("error") ||
        url.searchParams.get("error");

      const errorCode =
        hash.get("error_code") ||
        url.searchParams.get("error_code");

      if (error || errorCode) {
        if (active) {
          setStatus("invalid");
          setMessage(
            "인증 링크가 만료되었거나 유효하지 않습니다."
          );
        }
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const type = hash.get("type");

      if (
        type !== "recovery" ||
        !accessToken ||
        !refreshToken
      ) {
        if (active) {
          setStatus("invalid");
          setMessage(
            "비밀번호 복구 인증 정보가 없습니다."
          );
        }
        return;
      }

      // 전달된 access token을 Supabase 서버에서 검증
      const { data, error: userError } =
        await supabase.auth.getUser(accessToken);

      if (userError || !data.user) {
        if (active) {
          setStatus("invalid");
          setMessage(
            "인증 정보를 확인할 수 없습니다."
          );
        }
        return;
      }

      if (active) {
        setStatus("verified");
        setMessage(
          "Supabase 인증 토큰 확인에 성공했습니다."
        );
      }
    };

    checkRecovery();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <section className="w-full max-w-md rounded-2xl border border-gray-300 bg-white p-10 text-center">
        <h1 className="mb-5 text-2xl font-bold text-gray-800">
          비밀번호 재설정 인증
        </h1>

        <p className="text-sm leading-6 text-gray-600">
          {message}
        </p>

        {status === "checking" && (
          <p className="mt-5 text-sm text-gray-400">
            잠시만 기다려 주세요.
          </p>
        )}

        {status === "verified" && (
          <p className="mt-5 text-sm text-blue-600">
            복구 권한 발급 기능은 다음 단계에서 연결합니다.
          </p>
        )}

        {status === "invalid" && (
          <Link
            href="/forgot-password"
            className="mt-6 block rounded bg-gray-900 py-3 font-semibold text-white"
          >
            재설정 이메일 다시 받기
          </Link>
        )}
      </section>
    </main>
  );
}
