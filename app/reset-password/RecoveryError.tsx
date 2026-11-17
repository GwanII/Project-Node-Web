
"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Mail, LogIn } from "lucide-react";

export default function RecoveryError() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  const handleReverify = () => {
    router.push("/find-account?tab=password");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle
              className="h-7 w-7 text-amber-600"
              aria-hidden="true"
            />
          </div>
        </div>

        <h1 className="mb-3 text-center text-xl font-bold text-gray-900">
          비밀번호 변경 결과를 확인할 수 없습니다
        </h1>

        <p className="mb-6 text-center text-sm leading-6 text-gray-600">
          서버 또는 네트워크 문제로 비밀번호 변경 결과를
          확인하지 못했습니다.
          <br />
          새 비밀번호가 이미 적용되었을 수 있습니다.
        </p>

        <div className="mb-6 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          <p className="mb-2 font-semibold">
            다음 순서로 진행해주세요.
          </p>

          <p>
            1. 방금 입력한 새 비밀번호로 로그인을 시도합니다.
          </p>

          <p>
            2. 로그인이 되지 않거나 결과를 확인할 수 없다면
            이메일 인증을 다시 진행합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleLogin}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <LogIn className="h-5 w-5" />
            새 비밀번호로 로그인
          </button>

          <button
            type="button"
            onClick={handleReverify}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Mail className="h-5 w-5" />
            이메일 재인증
          </button>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-gray-500">
          보안을 위해 이전 복구 권한으로는
          비밀번호 변경을 다시 시도할 수 없습니다.
        </p>
      </div>
    </div>
  );
}
