"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/src/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  // 비밀번호 보기 / 숨기기
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // 재설정 링크 확인 상태
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [isRecoveryValid, setIsRecoveryValid] = useState(false);

  const router = useRouter();

  // 비밀번호 오류 확인
  const getPasswordError = (
    password: string,
    passwordConfirm: string
  ) => {
    // 1순위: 비밀번호 일치 여부
    if (password !== passwordConfirm) {
      return "비밀번호가 일치하지 않습니다.";
    }

    // 2순위: 길이
    if (password.length < 8 || password.length > 20) {
      return "비밀번호는 8~20자로 입력해 주세요.";
    }

    // 3순위: 영문자
    if (!/[A-Za-z]/.test(password)) {
      return "영문자를 1개 이상 포함해 주세요.";
    }

    // 4순위: 숫자
    if (!/\d/.test(password)) {
      return "숫자를 1개 이상 포함해 주세요.";
    }

    // 5순위: 특수문자
    if (!/[^A-Za-z\d]/.test(password)) {
      return "특수문자를 1개 이상 포함해 주세요.";
    }

    return "";
  };

  const isButtonDisabled =
    loading ||
    password.trim() === "" ||
    passwordConfirm.trim() === "";

  // 비밀번호 재설정 링크 확인
  useEffect(() => {
    let mounted = true;

    const checkRecovery = async () => {
      // URL에 만료되었거나 잘못된 링크 오류가 있는지 확인
      const url = new URL(window.location.href);

      const searchError = url.searchParams.get("error");
      const searchErrorCode = url.searchParams.get("error_code");

      const hashParams = new URLSearchParams(
        window.location.hash.replace("#", "")
      );

      const hashError = hashParams.get("error");
      const hashErrorCode = hashParams.get("error_code");

      if (
        searchError ||
        searchErrorCode ||
        hashError ||
        hashErrorCode
      ) {
        sessionStorage.removeItem("passwordRecovery");

        if (mounted) {
          setIsRecoveryValid(false);
          setCheckingRecovery(false);
        }

        return;
      }

      /*
        새로고침한 경우

        이전에 PASSWORD_RECOVERY 이벤트가 발생해서
        sessionStorage에 복구 상태가 저장되어 있고,
        Supabase 세션도 존재하면 계속 허용합니다.
      */
      const recoveryStored =
        sessionStorage.getItem("passwordRecovery") === "true";

      if (recoveryStored) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          if (mounted) {
            setIsRecoveryValid(true);
            setCheckingRecovery(false);
          }

          return;
        }

        // 복구 상태는 저장되어 있지만 세션이 없는 경우 제거
        sessionStorage.removeItem("passwordRecovery");
      }
    };

    checkRecovery();

    /*
      처음 비밀번호 재설정 이메일 링크로 들어왔을 때
      PASSWORD_RECOVERY 이벤트가 발생합니다.
    */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth 이벤트:", event);

      if (event === "PASSWORD_RECOVERY" && session) {
        sessionStorage.setItem("passwordRecovery", "true");

        if (mounted) {
          setIsRecoveryValid(true);
          setCheckingRecovery(false);
        }
      }
    });

    /*
      단순히 /reset-password 주소로 직접 들어왔다면
      PASSWORD_RECOVERY도 없고 저장된 복구 상태도 없습니다.

      Supabase가 재설정 링크를 처리할 시간을 기다린 뒤
      여전히 복구 상태가 아니면 차단합니다.
    */
    const timer = setTimeout(() => {
      const recoveryStored =
        sessionStorage.getItem("passwordRecovery") === "true";

      if (!recoveryStored && mounted) {
        setIsRecoveryValid(false);
        setCheckingRecovery(false);
      }
    }, 1000);

    return () => {
      mounted = false;

      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  // 비밀번호 변경
  const handleResetPassword = async () => {
    if (loading || !isRecoveryValid) return;

    // 비밀번호 검사
    const errorMessage = getPasswordError(
      password,
      passwordConfirm
    );

    if (errorMessage) {
      setPasswordError(errorMessage);
      return;
    }

    setPasswordError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setLoading(false);

      console.error("비밀번호 변경 오류:", error);

      if (error.code === "same_password") {
        setPasswordError(
          "기존 비밀번호와 다른 비밀번호를 입력해 주세요."
        );
      } else {
        setPasswordError(
          "비밀번호 변경 중 오류가 발생했습니다. 재설정 링크를 다시 요청해 주세요."
        );
      }

      return;
    }

    /*
      비밀번호 변경이 완료되었으므로
      현재 탭에 저장한 복구 상태를 제거합니다.
    */
    sessionStorage.removeItem("passwordRecovery");

    /*
      재설정 과정에서 생성된 Supabase 세션도 종료합니다.
    */
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error("로그아웃 오류:", signOutError);
    }

    setLoading(false);

    alert("비밀번호가 변경되었습니다.");

    router.push("/login");
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

      {/* 오른쪽 비밀번호 재설정 영역 */}
      <section className="relative flex w-2/5 items-center justify-center bg-gray-100">
        <div className="flex min-h-[50vh] w-[80%] max-w-[570px] flex-col rounded-[28px] border border-gray-300 bg-white px-10 py-10">

          {checkingRecovery ? (
            <>
              {/* 재설정 링크 확인 중 */}
              <h2 className="mb-4 text-center text-3xl font-bold text-gray-800">
                링크 확인 중
              </h2>

              <p className="text-center text-sm leading-6 text-gray-500">
                비밀번호 재설정 링크를 확인하고 있습니다.
              </p>
            </>
          ) : isRecoveryValid ? (
            <>
              {/* 정상적인 재설정 링크 */}

              {/* 제목 */}
              <h2 className="mb-4 text-center text-3xl font-bold text-gray-800">
                비밀번호 재설정
              </h2>

              {/* 설명 */}
              <p className="mb-10 text-center text-sm leading-6 text-gray-500">
                새로 사용할 비밀번호를 입력해 주세요.
              </p>

              {/* 새 비밀번호 */}
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  새 비밀번호
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                    }}
                    disabled={loading}
                    placeholder="새 비밀번호를 입력해 주세요"
                    className="
                      w-full rounded
                      border border-gray-300
                      px-4 py-3 pr-12
                      text-gray-800
                      outline-none
                      placeholder:text-gray-400
                      focus:border-gray-500
                      disabled:bg-gray-100
                    "
                  />

                  {/* 비밀번호 보기 / 숨기기 */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "비밀번호 숨기기"
                        : "비밀번호 보기"
                    }
                    className="
                      absolute right-3 top-1/2
                      -translate-y-1/2
                      text-gray-400
                      transition
                      hover:text-gray-600
                      disabled:cursor-not-allowed
                    "
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* 새 비밀번호 확인 */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  새 비밀번호 확인
                </label>

                <div className="relative">
                  <input
                    type={showPasswordConfirm ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => {
                      setPasswordConfirm(e.target.value);
                      setPasswordError("");
                    }}
                    disabled={loading}
                    placeholder="새 비밀번호를 다시 입력해 주세요"
                    className="
                      w-full rounded
                      border border-gray-300
                      px-4 py-3 pr-12
                      text-gray-800
                      outline-none
                      placeholder:text-gray-400
                      focus:border-gray-500
                      disabled:bg-gray-100
                    "
                  />

                  {/* 비밀번호 확인 보기 / 숨기기 */}
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswordConfirm(!showPasswordConfirm)
                    }
                    disabled={loading}
                    aria-label={
                      showPasswordConfirm
                        ? "비밀번호 숨기기"
                        : "비밀번호 보기"
                    }
                    className="
                      absolute right-3 top-1/2
                      -translate-y-1/2
                      text-gray-400
                      transition
                      hover:text-gray-600
                      disabled:cursor-not-allowed
                    "
                  >
                    {showPasswordConfirm ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* 비밀번호 오류 */}
              {passwordError && (
                <p className="mt-3 text-sm text-red-500">
                  {passwordError}
                </p>
              )}

              {/* 비밀번호 변경 버튼 */}
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
                {loading ? "변경 중..." : "비밀번호 변경"}
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
              {/* 유효하지 않은 재설정 링크 */}

              <h2 className="mb-4 text-center text-3xl font-bold text-gray-800">
                유효하지 않은 링크입니다
              </h2>

              <p className="mb-8 text-center text-sm leading-6 text-gray-500">
                비밀번호 재설정 링크가 만료되었거나
                <br />
                올바른 재설정 링크가 아닙니다.
              </p>

              <Link
                href="/forgot-password"
                className="
                  flex w-full items-center justify-center
                  rounded
                  bg-gray-900
                  py-3
                  text-lg font-bold text-white
                "
              >
                재설정 이메일 다시 받기
              </Link>

              <div className="mt-6 text-center">
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