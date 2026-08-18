"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getPasswordError = (password: string) => {
    if (password.length < 8 || password.length > 20) {
      return "비밀번호는 8~20자로 입력해 주세요.";
    }

    if (!/[A-Za-z]/.test(password)) {
      return "영문자를 1개 이상 포함해 주세요.";
    }

    if (!/\d/.test(password)) {
      return "숫자를 1개 이상 포함해 주세요.";
    }

    if (!/[^A-Za-z\d]/.test(password)) {
      return "특수문자를 1개 이상 포함해 주세요.";
    }

    return "";
  };
  // 비밀번호를 입력하기 시작했을 때만 오류 표시
  const passwordValidationError = password ? getPasswordError(password): "";

  const handleSignup = async () => {
    setMessage("");
    // 1. 빈 값 확인
    if (!name || !email || !password || !passwordCheck) {
      setMessage("모든 항목을 입력해 주세요.");
      return;
    }

    // 2. 이메일 형식 확인
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setMessage("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    // 3. 비밀번호 형식 확인
    const passwordValidationError = getPasswordError(password);

    if (passwordValidationError) {
      setMessage(passwordValidationError);
      return;
    }

    // 4. 비밀번호 일치 확인
    if (password !== passwordCheck) {
      setMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    // 5. 중복 요청 방지
    if (loading) {
      return;
    }

    setLoading(true);

    // 6. Supabase 회원가입 요청
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`,

        data: {
          name,
        },
      },
    });

    setLoading(false);

    // 7. 오류 처리
    if (error) {
      console.error(error);
      setMessage(error.message);
      return;
    }

    console.log(data);

    // 8. 이메일 인증 안내
    setMessage(
      "회원가입 요청이 완료되었습니다. 이메일에서 인증 링크를 확인해 주세요.",
    );
  };

  return (
    <main className="flex min-h-screen">
      {/* 왼쪽 소개 영역 */}
      <section className="w-3/5 bg-blue-500">
        <div className="p-6 text-white">
          <h1 className="text-3xl font-bold">이름</h1>
        </div>
      </section>

      {/* 오른쪽 회원가입 영역 */}
      <section className="relative flex w-2/5 items-center justify-center bg-gray-100">
        <div className="flex h-[60vh] w-[80%] max-w-[570px] flex-col rounded-[28px] border border-gray-300 bg-white px-10 py-10">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-800">
            이메일 회원가입
          </h2>

          {/* 이름 */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              이름
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해 주세요"
              className="w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />
          </div>

          {/* 이메일 */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              이메일
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력해 주세요"
              className="w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />
          </div>

          {/* 비밀번호 */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              비밀번호
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="영문자, 숫자, 특수문자 포함 8~20자"
                className="w-full rounded border border-gray-300 px-4 py-3 pr-16 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? (<EyeOff size={20} />) : (<Eye size={20} />)}
              </button>
            </div>

            {passwordValidationError && (
              <p className="mt-2 text-sm text-red-500">
                {passwordValidationError}
              </p>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              비밀번호 확인
            </label>

            <input
              type="password"
              value={passwordCheck}
              onChange={(e) => setPasswordCheck(e.target.value)}
              placeholder="비밀번호를 다시 입력해 주세요"
              className="w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />
          </div>

          {/* 메시지 */}
          {message && (
            <p className="mt-3 text-center text-sm text-gray-600">
              {message}
            </p>
          )}

          {/* 회원가입 버튼 */}
          <button
            type="button"
            onClick={handleSignup}
            disabled={
              loading ||
              !name ||
              !email ||
              !password ||
              !passwordCheck
            }
            className="mt-6 w-full rounded bg-blue-500 py-3 text-lg font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? "회원가입 중..." : "회원가입"}
          </button>

          {/* 로그인으로 돌아가기 */}
          <div className="mt-4 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?
            <Link
              href="/login"
              className="ml-2 font-bold text-gray-700 underline"
            >
              로그인
            </Link>
          </div>
        </div>

        {/* 페이지 하단 링크 */}
        <div className="absolute bottom-5 flex gap-1 text-base text-gray-400">
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