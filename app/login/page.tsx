"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const isLoginDisabled = loading || email.trim() === "" || password.trim() === "";

  const router = useRouter();

  const handleLogin = async () => {
    if (isLoginDisabled) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setLoading(false);
      if (error.code === "invalid_credentials") {
        alert("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (error.code === "email_not_confirmed") {
        alert("이메일 인증을 완료해주세요.");
      } else if (error.code === "over_request_rate_limit") {
        alert("로그인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      } else {
        alert("로그인 중 오류가 발생했습니다.");
      }

      console.log("로그인 에러:", error);
      return;
    }

    alert("로그인에 성공했습니다.");
    console.log(data);
    router.push("/mainpage");
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.log("Google 로그인 오류:", error);
      alert("Google 로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <main className="flex min-h-screen">
      {/* 왼쪽 소개 영역 */}
      <section className="w-3/5 bg-blue-500">
        <div className="p-6 text-white">
          <h1 className="text-3xl font-bold">이름</h1>
        </div>
      </section>

      {/* 오른쪽 로그인 영역 */}
      <section className="relative flex w-2/5 items-center justify-center bg-gray-100">
        <div className="flex h-[60vh] w-[80%] max-w-[570px] flex-col rounded-[28px] border border-gray-300 bg-white px-10 py-10">
          
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-800">
            로그인
          </h2>

          {/* 입력 영역 */}
          <div>
            <input
              type="email"
              placeholder="이메일을 입력해 주세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />

            <input
              type="password"
              placeholder="비밀번호를 입력해 주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />
          </div>

          {/* 버튼 영역 */}
          <div className="mt-10">
            <button 
              onClick={handleLogin}
              disabled={isLoginDisabled}
              className="mb-2 w-full rounded bg-gray-900 py-3 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:bg-gray-500 disabled:text-gray-100 disabled:opacity-60">
              {loading ? "로그인 중..." : "로그인하기"}
            </button>

          {/* 링크 영역 */}
            <Link
              href="/signup"
              className="flex w-full items-center justify-center rounded border border-gray-300 bg-white py-3 text-lg font-bold text-gray-700 hover:border-gray-500"
            >
              이메일 회원가입
            </Link>

            <div className="mt-2 text-right">
              <Link
                href="/reset-password"
                className="text-sm text-gray-500 underline hover:text-gray-900"
              >
                비밀번호 재설정
              </Link>
            </div>
          </div>

          {/* SNS 영역 */}
          <div className="mt-8">
            <p className="text-center text-sm text-gray-600">
              SNS 계정으로 간편하게 시작하기
            </p>

            <div className="mt-3 flex justify-center gap-4">
              {/* Google */}
              <button 
                onClick={handleGoogleLogin}
                className="flex h-[5vh] w-[5vh] min-h-[48px] min-w-[48px] max-h-[60px] max-w-[60px] items-center justify-center rounded-xl border border-gray-300 bg-white">
                <img
                  src="/login/icon/google.png"
                  alt="google"
                  className="h-[65%] w-[65%] object-contain"
                />
              </button>

              {/* Kakao */}
              <button className="flex h-[5vh] w-[5vh] min-h-[48px] min-w-[48px] max-h-[60px] max-w-[60px] items-center justify-center rounded-xl border border-yellow-300 bg-yellow-300">
                <img
                  src="/login/icon/kakao.png"
                  alt="kakao"
                  className="h-[65%] w-[65%] object-contain"
                />
              </button>

              {/* GitHub */}
              <button className="flex h-[5vh] w-[5vh] min-h-[48px] min-w-[48px] max-h-[60px] max-w-[60px] items-center justify-center rounded-xl border border-gray-900 bg-gray-900">
                <img
                  src="/login/icon/github.png"
                  alt="github"
                  className="h-[65%] w-[65%] object-contain"
                />
              </button>

              {/* Facebook */}
              <button className="flex h-[5vh] w-[5vh] min-h-[48px] min-w-[48px] max-h-[60px] max-w-[60px] items-center justify-center rounded-xl border border-blue-500 bg-blue-500">
                <img
                  src="/login/icon/facebook.png"
                  alt="facebook"
                  className="h-[65%] w-[65%] object-contain"
                />
              </button>

              {/* Naver */}
              <button className="flex h-[5vh] w-[5vh] min-h-[48px] min-w-[48px] max-h-[60px] max-w-[60px] items-center justify-center rounded-xl border border-green-500 bg-green-500">
                <img
                  src="/login/icon/naver.png"
                  alt="naver"
                  className="h-[65%] w-[65%] object-contain"
                />
              </button>
            </div>
          </div>

          {/* 카드 아래쪽 */}
          <div className="mt-6 flex justify-end gap-1 text-sm text-gray-400">
            <Link href="/find-account" className="hover:text-gray-600">
              계정 찾기
            </Link>
            <span>/</span>
            <Link href="/forgot-password" className="hover:text-gray-600">
              비밀번호 찾기
            </Link>
          </div>
        </div>

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