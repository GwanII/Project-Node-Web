"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/src/lib/supabase";

const REMEMBERED_EMAIL_KEY = "cobalthub_remembered_email";

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);

  // 비밀번호 표시 여부
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // 휴대폰 인증 화면 표시 여부
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  // 휴대폰 인증 관련 state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const isLoginDisabled =
    loading || email.trim() === "" || password.trim() === "";

  // 이전에 저장한 이메일 불러오기 (브라우저에서만 실행)
  useEffect(() => {
    try {
      const savedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberEmail(true);
      }
    } catch (error) {
      console.warn("저장된 이메일을 불러오지 못했습니다:", error);
    }
  }, []);

  // 체크 해제하면 저장된 이메일을 즉시 삭제
  const handleRememberEmailChange = (checked: boolean) => {
    setRememberEmail(checked);
    if (!checked) {
      try {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch (error) {
        console.warn("저장된 이메일을 삭제하지 못했습니다:", error);
      }
    }
  };

  // 휴대폰 번호 자동 하이픈
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);

    if (numbers.length <= 3) {
      return numbers;
    }

    if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }

    return `${numbers.slice(0, 3)}-${numbers.slice(
      3,
      7
    )}-${numbers.slice(7)}`;
  };

  // Google OAuth callback에서 /login?oauth=success 로 돌아온 경우
  // 현재 로그인된 사용자의 휴대폰 인증 여부 확인
  useEffect(() => {
    const oauthResult = searchParams.get("oauth");

    if (oauthResult !== "success") {
      return;
    }

    const checkOAuthUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Google 로그인 사용자 확인 오류:", error);
        return;
      }

      if (!user) {
        return;
      }

      console.log("Google 로그인 사용자:", user);

      // URL에서 ?oauth=success 제거
      window.history.replaceState({}, "", "/login");

      // 이미 휴대폰 인증이 완료된 사용자
      if (user.phone) {
        router.push("/mainpage");
        return;
      }

      // 휴대폰 번호가 없는 사용자
      setShowPhoneVerification(true);
    };

    checkOAuthUser();
  }, [searchParams, router]);

  // 010-1234-5678 → +821012345678
  const convertToE164 = (phoneNumber: string) => {
    const numbersOnly = phoneNumber.replace(/[^0-9]/g, "");

    if (!/^010\d{8}$/.test(numbersOnly)) {
      return null;
    }

    return `+82${numbersOnly.slice(1)}`;
  };

  // 이메일 + 비밀번호 로그인

  // 이메일 + 비밀번호 로그인
  const handleLogin = async () => {
    if (isLoginDisabled) return;

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        console.error("Supabase 로그인 오류:", {
          message: error.message,
          code: error.code,
          status: error.status,
        });

        if (error.code === "invalid_credentials") {
          alert("이메일 또는 비밀번호가 올바르지 않습니다.");
        } else if (error.code === "email_not_confirmed") {
          alert("이메일 인증을 완료해주세요.");
        } else if (
          error.code === "over_request_rate_limit"
        ) {
          alert(
            "로그인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
          );
        } else {
          alert("로그인 중 오류가 발생했습니다.");
        }

        return;
      }

      if (!data.user) {
        alert("로그인 사용자 정보를 확인할 수 없습니다.");
        return;
      }

      // 로그인 성공 시 체크 상태에 따라 이메일만 저장 (비밀번호는 저장하지 않음)
      try {
        if (rememberEmail) {
          window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        } else {
          window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch (storageError) {
        // 저장소 접근이 차단되어도 로그인은 정상적으로 계속 진행
        console.warn("이메일 기억하기 저장 실패:", storageError);
      }

      // 로그인 이력 저장 실패가 실제 로그인 성공을 방해하지 않도록 분리
      if (data.session?.access_token) {
        try {
          const response = await fetch("/api/login-history", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
          });
          if (!response.ok) {
            console.warn("로그인 기록 저장 실패:", response.status);
          }
        } catch (historyError) {
          console.warn("로그인 기록 API 호출 실패:", historyError);
        }
      }

      console.log("로그인 성공:", data);

      // 이미 휴대폰 인증이 완료된 사용자
      if (data.user.phone) {
        router.push("/mainpage");
        return;
      }

      // 휴대폰 인증이 안 된 사용자
      setShowPhoneVerification(true);
    } catch (error) {
      console.error("로그인 요청 중 예외 발생:", error);
      alert("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };


  // 휴대폰 OTP 전송
  const handleSendOtp = async () => {
    if (phoneLoading) return;

    const formattedPhone = convertToE164(phone);

    if (!formattedPhone) {
      alert("올바른 휴대폰 번호를 입력해 주세요.");
      return;
    }

    setPhoneLoading(true);

    const { error } = await supabase.auth.updateUser({
      phone: formattedPhone,
    });

    setPhoneLoading(false);

    if (error) {
      console.error("인증번호 전송 오류:", error);
      alert(`인증번호 전송 실패: ${error.message}`);
      return;
    }

    setOtpSent(true);
    alert("인증번호가 전송되었습니다.");
  };

  // OTP 검증
  const handleVerifyOtp = async () => {
    if (phoneLoading) return;

    const formattedPhone = convertToE164(phone);

    if (!formattedPhone) {
      alert("올바른 휴대폰 번호를 입력해 주세요.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      alert("6자리 인증번호를 입력해 주세요.");
      return;
    }

    setPhoneLoading(true);

    // 전화번호 변경 OTP 인증
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: "phone_change",
    });

    if (error) {
      setPhoneLoading(false);

      console.error("휴대폰 인증 오류:", error);
      alert("인증번호가 올바르지 않거나 만료되었습니다.");
      return;
    }

    console.log("OTP 인증 성공:", data);
    alert("휴대폰 인증이 완료되었습니다.");

    router.push("/mainpage");
  };

  // Google OAuth
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
      <section className="w-3/5 bg-blue-300">
        <div className="p-6">
          <img
            src="/logo/cobalt-hub-logo.svg"
            alt="cobalt-hub-logo"
            className="h-auto w-[280px]"
          />
        </div>
      </section>

      {/* 오른쪽 로그인 영역 */}
      <section className="relative flex w-2/5 items-center justify-center bg-gray-100">
        <div className="flex h-[60vh] w-[80%] max-w-[570px] flex-col rounded-[28px] border border-gray-300 bg-white px-10 py-10">
          {!showPhoneVerification ? (
            <>
              {/* 로그인 화면 */}
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

                {/* 비밀번호 */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 입력해 주세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded border border-gray-300 px-4 py-3 pr-12 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={
                      showPassword ? "비밀번호 숨기기" : "비밀번호 보기"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* 이메일 기억하기 */}
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => handleRememberEmailChange(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-blue-600"
                />
                이메일 기억하기
              </label>

              {/* 버튼 영역 */}
              <div className="mt-7">
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoginDisabled}
                  className="mb-2 w-full rounded bg-gray-900 py-3 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:bg-gray-500 disabled:text-gray-100 disabled:opacity-60"
                >
                  {loading ? "로그인 중..." : "로그인하기"}
                </button>

                <Link
                  href="/signup"
                  className="flex w-full items-center justify-center rounded border border-gray-300 bg-white py-3 text-lg font-bold text-gray-700 hover:border-gray-500"
                >
                  이메일 회원가입
                </Link>
              </div>

              {/* SNS 영역 */}
              <div className="mt-6">
                {/* 구분선 + 설명 */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />

                  <p className="shrink-0 text-sm text-gray-400">
                    SNS 계정으로 간편하게 시작하기
                  </p>

                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* SNS 버튼 */}
                <div className="mt-3 flex justify-center gap-4">
                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex h-14 w-14 items-center justify-center rounded-4xl border border-transparent transition duration-200 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm"
                    aria-label="Google 로그인"
                  >
                    <img
                      src="/login/icon/Google.svg"
                      alt="Google"
                      className="h-13 w-13 object-contain"
                    />
                  </button>

                  {/* GitHub */}
                  <button
                    type="button"
                    className="flex h-14 w-14 items-center justify-center rounded-4xl border border-transparent transition duration-200 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm"
                    aria-label="GitHub 로그인"
                  >
                    <img
                      src="/login/icon/Github.svg"
                      alt="GitHub"
                      className="h-15 w-15 scale-120 object-contain"
                    />
                  </button>

                  {/* Facebook */}
                  <button
                    type="button"
                    className="flex h-14 w-14 items-center justify-center rounded-4xl border border-transparent transition duration-200 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm"
                    aria-label="Facebook 로그인"
                  >
                    <img
                      src="/login/icon/Facebook.png"
                      alt="Facebook"
                      className="h-12.5 w-12.5 object-contain"
                    />
                  </button>

                  {/* Naver */}
                  <button
                    type="button"
                    className="flex h-14 w-14 items-center justify-center rounded-4xl border border-transparent transition duration-200 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm"
                    aria-label="Naver 로그인"
                  >
                    <img
                      src="/login/icon/Naver.png"
                      alt="Naver"
                      className="h-13 w-13 object-contain"
                    />
                  </button>
                </div>
              </div>

              {/* 카드 아래쪽 */}
              <div className="mt-4 flex justify-end gap-1 text-sm text-gray-400">
                <Link
                  href="/find-account"
                  className="hover:text-gray-600"
                >
                  계정 찾기
                </Link>

                <span>/</span>

                <Link
                  href="/forgot-password"
                  className="hover:text-gray-600"
                >
                  비밀번호 찾기
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* 휴대폰 인증 화면 */}
              <h2 className="mb-4 text-center text-3xl font-bold text-gray-800">
                휴대폰 인증
              </h2>

              <p className="mb-8 text-center text-sm text-gray-500">
                서비스 이용을 위해 휴대폰 인증을 완료해 주세요.
              </p>

              {/* 휴대폰 번호 */}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  휴대폰 번호
                </label>

                <div className="flex gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) =>
                      setPhone(formatPhoneNumber(e.target.value))
                    }
                    disabled={otpSent}
                    placeholder="010-1234-5678"
                    maxLength={13}
                    className="min-w-0 flex-1 rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500 disabled:bg-gray-100"
                  />

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={
                      phoneLoading ||
                      otpSent ||
                      phone.trim() === ""
                    }
                    className="shrink-0 rounded border border-blue-500 px-4 text-sm font-bold text-blue-500 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                  >
                    {phoneLoading && !otpSent
                      ? "전송 중..."
                      : otpSent
                        ? "전송 완료"
                        : "인증하기"}
                  </button>
                </div>
              </div>

              {/* OTP 입력 */}
              {otpSent && (
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    인증번호
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="6자리 인증번호를 입력해 주세요"
                    className="w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={phoneLoading || otp.length !== 6}
                    className="mt-4 w-full rounded bg-gray-900 py-3 text-lg font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-500 disabled:opacity-60"
                  >
                    {phoneLoading ? "인증 중..." : "인증 완료"}
                  </button>
                </div>
              )}
            </>
          )}
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
