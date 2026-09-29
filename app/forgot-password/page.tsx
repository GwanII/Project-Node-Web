"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/src/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");

  // 이메일 형식 확인
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isButtonDisabled = loading || email.trim() === "";

  // 이메일 발송
  const handleResetPassword = async () => {
    if (loading || email.trim() === "") return;

    const trimmedEmail = email.trim();

    if (!isValidEmail(trimmedEmail)) {
      setEmailError("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    setEmailError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setLoading(false);

    if (error) {
      console.error("비밀번호 재설정 이메일 전송 오류:", error);

      if (error.code === "over_email_send_rate_limit") {
        alert("이메일 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      } else {
        alert("비밀번호 재설정 이메일 전송 중 오류가 발생했습니다.");
      }

      return;
    }

    setEmailSent(true);
  };

  return (
    <main className="flex min-h-screen">
      {/* 왼쪽 소개 영역 */}
      <section className="w-3/5 bg-blue-300">
        <div className="p-6">
          <img
            src="/logo/cobalt-hub-logo.svg"
            alt="cobalt-hub-logo"
            className="h-auto w-[280px]"
          />
        </div>
      </section>

      {/* 오른쪽 비밀번호 찾기 영역 */}
      <section className="relative flex w-2/5 items-center justify-center bg-gray-100">
        <div className="w-[80%] max-w-[570px]">

          {/* 책갈피 형태 탭 */}
          <div className="relative flex h-[44px] items-end">

            {/* 비활성 탭 */}
            <Link
              href="/find-account"
              className="
                relative z-0
                flex h-[44px] items-center justify-center
                rounded-t-[18px]
                border border-gray-300
                bg-gray-200/70
                px-7
                text-sm font-bold text-gray-400
                transition
                hover:bg-gray-100
                hover:text-gray-600
              "
            >
              계정 찾기
            </Link>

            {/* 활성 탭 */}
            <Link
              href="/forgot-password"
              className="
                relative z-20
                flex h-[44px] items-center justify-center
                rounded-t-[18px]
                border border-b-0 border-gray-300
                bg-white
                px-7
                text-sm font-bold text-gray-800
              "
            >
              비밀번호 찾기

              {/* 카드와 이어지는 연결부 */}
              <span
                className="
                  absolute
                  -bottom-[12px]
                  left-[1px]
                  right-[1px]
                  h-[13px]
                  bg-white
                "
              />
            </Link>
          </div>

          {/* 카드 */}
          <div
            className="
              relative z-10
              flex min-h-[50vh] flex-col
              rounded-r-[28px]
              rounded-bl-[28px]
              border border-gray-300
              bg-white
              px-10 py-10
            "
          >
            {!emailSent ? (
              <>
                {/* 제목 */}
                <h2 className="mb-4 text-center text-3xl font-bold text-gray-800">
                  비밀번호 찾기
                </h2>

                {/* 설명 */}
                <p className="mb-10 text-center text-sm leading-6 text-gray-500">
                  가입한 이메일 주소를 입력해 주세요.
                  <br />
                  비밀번호 재설정 링크를 보내드립니다.
                </p>

                {/* 이메일 입력 */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    이메일
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    disabled={loading}
                    placeholder="이메일을 입력해 주세요"
                    className="
                      w-full rounded
                      border border-gray-300
                      px-4 py-3
                      text-gray-800
                      outline-none
                      placeholder:text-gray-400
                      focus:border-gray-500
                      disabled:bg-gray-100
                    "
                  />

                  {emailError && (
                    <p className="mt-2 text-sm text-red-500">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* 재설정 이메일 보내기 */}
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isButtonDisabled}
                  className="
                    mt-6 w-full rounded
                    bg-gray-900
                    py-3
                    text-lg font-bold text-white
                    transition
                    disabled:cursor-not-allowed
                    disabled:bg-gray-500
                    disabled:opacity-60
                  "
                >
                  {loading ? "전송 중..." : "재설정 이메일 보내기"}
                </button>

                {/* 로그인으로 돌아가기 */}
                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    로그인으로 돌아가기
                  </Link>
                </div>
              </>
            ) : (
              <>
                {/* 이메일 전송 완료 화면 */}
                <h2 className="mb-4 text-center text-3xl font-bold text-gray-800">
                  이메일을 확인해 주세요
                </h2>

                <p className="text-center text-sm leading-6 text-gray-500">
                  입력한 이메일로 가입된 계정이 있다면
                  <br />
                  비밀번호 재설정 링크를 전송했습니다.
                </p>

                {/* 로그인으로 돌아가기 */}
                <div className="mt-8 text-center">
                  <Link
                    href="/login"
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    로그인으로 돌아가기
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 페이지 하단 */}
        <div className="absolute bottom-5 flex gap-2 text-base text-gray-400">
          <Link href="/terms" className="hover:text-gray-600">
            이용약관
          </Link>

          <span>|</span>

          <Link href="/privacy" className="hover:text-gray-600">
            개인정보 처리방침
          </Link>

          <span>|</span>

          <Link href="/faq" className="hover:text-gray-600">
            FAQ/문의
          </Link>
        </div>
      </section>
    </main>
  );
}