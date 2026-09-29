"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function FindAccountPage() {
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  // 우리 서비스의 인증 요청 ID
  const [verificationId, setVerificationId] = useState("");

  // 인증 진행 상태
  const [codeSent, setCodeSent] = useState(false);
  const [accountFound, setAccountFound] = useState(false);

  // 찾은 계정
  const [foundEmail, setFoundEmail] = useState("");

  // 오류 메시지
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");

  // 로딩 상태
  const [sendingCode, setSendingCode] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  // 인증번호 유효시간
  const [expiresAt, setExpiresAt] = useState<number | null>(
    null
  );

  // 인증번호 재전송 가능 시간
  const [resendAvailableAt, setResendAvailableAt] =
    useState<number | null>(null);

  // 화면에 표시할 남은 시간
  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [resendRemainingSeconds, setResendRemainingSeconds] =
    useState(0);

  const isSendButtonDisabled =
    sendingCode || phone.trim() === "";

  const isVerifyButtonDisabled =
    checkingCode ||
    verificationCode.length !== 6 ||
    !verificationId ||
    remainingSeconds <= 0;

  /*
    인증번호 유효시간 카운트다운

    실제 만료 여부는 서버의 expires_at으로 검사하고,
    이 타이머는 사용자에게 남은 시간을 보여주기 위한 UI입니다.
  */
  useEffect(() => {
    if (!codeSent || !expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (expiresAt - Date.now()) / 1000
        )
      );

      setRemainingSeconds(remaining);
    };

    updateTimer();

    const timer = setInterval(
      updateTimer,
      1000
    );

    return () => clearInterval(timer);
  }, [codeSent, expiresAt]);

  /*
    인증번호 재전송 대기시간 카운트다운
  */
  useEffect(() => {
    if (!resendAvailableAt) {
      setResendRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (resendAvailableAt - Date.now()) /
            1000
        )
      );

      setResendRemainingSeconds(
        remaining
      );
    };

    updateTimer();

    const timer = setInterval(
      updateTimer,
      1000
    );

    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  // 인증번호 발송
  const handleSendCode = async () => {
    if (isSendButtonDisabled) return;

    setPhoneError("");
    setCodeError("");
    setSendingCode(true);

    try {
      const response = await fetch(
        "/api/phone-verification/send-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone,
            purpose: "account-recovery",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setPhoneError(
          data.error ||
            "인증번호 발송 중 오류가 발생했습니다."
        );
        return;
      }

      /*
        서버에서 반환한 verificationId를 저장합니다.

        브라우저에는 Vonage request_id를 전달하지 않고,
        우리 DB의 인증 요청 ID만 저장합니다.
      */
      setVerificationId(data.verificationId);

      setCodeSent(true);

      /*
        서버에서 받은 인증번호 유효시간을 기준으로
        화면 카운트다운을 시작합니다.
      */
      const now = Date.now();

      setExpiresAt(
        now + data.expiresIn * 1000
      );

      /*
        첫 발송 후 60초 동안은 재전송할 수 없습니다.
      */
      setResendAvailableAt(
        now + 60 * 1000
      );

      setVerificationCode("");
      setCodeError("");
    } catch (error) {
      console.error(
        "인증번호 발송 요청 오류:",
        error
      );

      setPhoneError(
        "인증번호 발송 중 오류가 발생했습니다."
      );
    } finally {
      setSendingCode(false);
    }
  };

  // 인증번호 재전송
  const handleResendCode = async () => {
    if (
      resendingCode ||
      !verificationId ||
      resendRemainingSeconds > 0
    ) {
      return;
    }

    setCodeError("");
    setPhoneError("");
    setResendingCode(true);

    try {
      const response = await fetch(
        "/api/phone-verification/resend-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            verificationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setCodeError(
          data.error ||
            "인증번호 재전송 중 오류가 발생했습니다."
        );

        /*
          서버가 남은 대기시간을 알려준 경우
          서버 기준으로 다시 타이머를 맞춥니다.
        */
        if (data.retryAfter) {
          setResendAvailableAt(
            Date.now() +
              data.retryAfter * 1000
          );
        }

        return;
      }

      const now = Date.now();

      /*
        재전송하면 인증번호 유효시간을
        다시 5분으로 설정합니다.
      */
      setExpiresAt(
        now + data.expiresIn * 1000
      );

      /*
        재전송 후 다시 60초 동안 기다립니다.
      */
      setResendAvailableAt(
        now +
          data.resendAvailableIn * 1000
      );

      /*
        이전에 입력했던 인증번호는
        새로운 인증번호와 관련이 없으므로 초기화합니다.
      */
      setVerificationCode("");
      setCodeError("");
    } catch (error) {
      console.error(
        "인증번호 재전송 요청 오류:",
        error
      );

      setCodeError(
        "인증번호 재전송 중 오류가 발생했습니다."
      );
    } finally {
      setResendingCode(false);
    }
  };

  // 인증번호 확인
  const handleVerifyCode = async () => {
    if (isVerifyButtonDisabled) return;

    setCodeError("");
    setCheckingCode(true);

    try {
      const response = await fetch(
        "/api/phone-verification/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          /*
            phone과 purpose는 보내지 않습니다.

            서버는 verificationId를 이용해 DB에서
            phone, purpose, vonage_request_id 등을
            직접 조회합니다.
          */
          body: JSON.stringify({
            verificationId,
            code: verificationCode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setCodeError(
          data.error ||
            "인증번호가 올바르지 않거나 만료되었습니다."
        );
        return;
      }

      setFoundEmail(data.email);
      setAccountFound(true);
    } catch (error) {
      console.error(
        "인증번호 확인 요청 오류:",
        error
      );

      setCodeError(
        "인증번호 확인 중 오류가 발생했습니다."
      );
    } finally {
      setCheckingCode(false);
    }
  };

  /*
    초를 MM:SS 형태로 표시합니다.
    예: 300 → 05:00
  */
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
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

      {/* 오른쪽 계정 찾기 영역 */}
      <section className="relative flex w-2/5 items-center justify-center bg-gray-100">
        <div className="w-[80%] max-w-[570px]">

          {/* 책갈피 형태 탭 */}
          <div className="relative flex h-[44px] items-end">

            {/* 활성 탭 */}
            <Link
              href="/find-account"
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
              계정 찾기

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

            {/* 비활성 탭 */}
            <Link
              href="/forgot-password"
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
              비밀번호 찾기
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
            {/* 제목 */}
            <h2 className="mb-4 text-center text-3xl font-bold text-gray-800">
              계정 찾기
            </h2>

            {/* 설명 */}
            <p className="mb-10 text-center text-sm leading-6 text-gray-500">
              가입 시 인증한 휴대폰 번호를 입력해 주세요.
              <br />
              인증이 완료되면 계정 정보를 확인할 수 있습니다.
            </p>

            {!accountFound ? (
              <>
                {/* 휴대폰 번호 입력 */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    휴대폰 번호
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError("");
                    }}
                    disabled={codeSent}
                    placeholder="010-1234-5678"
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

                  {phoneError && (
                    <p className="mt-2 text-sm text-red-500">
                      {phoneError}
                    </p>
                  )}
                </div>

                {/* 인증번호 받기 */}
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={
                    isSendButtonDisabled || codeSent
                  }
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
                  {sendingCode
                    ? "전송 중..."
                    : codeSent
                      ? "인증번호 전송 완료"
                      : "인증번호 받기"}
                </button>

                {/* 인증번호 입력 */}
                {codeSent && (
                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      인증번호
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(
                          e.target.value.replace(/\D/g, "")
                        );
                        setCodeError("");
                      }}
                      placeholder="6자리 인증번호를 입력해 주세요"
                      className="
                        w-full rounded
                        border border-gray-300
                        px-4 py-3
                        text-gray-800
                        outline-none
                        placeholder:text-gray-400
                        focus:border-gray-500
                      "
                    />

                    {/* 유효시간 / 재전송 */}
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <span
                        className={
                          remainingSeconds > 0
                            ? "text-gray-500"
                            : "text-red-500"
                        }
                      >
                        {remainingSeconds > 0
                          ? `인증번호 유효시간 ${formatTime(
                              remainingSeconds
                            )}`
                          : "인증번호가 만료되었습니다."}
                      </span>

                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={
                          resendingCode ||
                          resendRemainingSeconds > 0
                        }
                        className="
                          shrink-0
                          font-bold
                          text-blue-500
                          transition
                          hover:text-blue-700
                          disabled:cursor-not-allowed
                          disabled:text-gray-400
                        "
                      >
                        {resendingCode
                          ? "재전송 중..."
                          : resendRemainingSeconds > 0
                            ? `재전송 (${resendRemainingSeconds}초)`
                            : "인증번호 재전송"}
                      </button>
                    </div>

                    {codeError && (
                      <p className="mt-2 text-sm text-red-500">
                        {codeError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={isVerifyButtonDisabled}
                      className="
                        mt-4 w-full rounded
                        bg-gray-900
                        py-3
                        text-lg font-bold text-white
                        transition
                        disabled:cursor-not-allowed
                        disabled:bg-gray-500
                        disabled:opacity-60
                      "
                    >
                      {checkingCode
                        ? "확인 중..."
                        : "인증번호 확인"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* 계정 찾기 성공 */
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  가입된 계정
                </p>

                <p className="mt-3 text-xl font-bold text-gray-800">
                  {foundEmail}
                </p>

                <Link
                  href="/forgot-password"
                  className="
                    mt-8 flex w-full items-center justify-center
                    rounded
                    bg-gray-900
                    py-3
                    text-lg font-bold text-white
                  "
                >
                  비밀번호 재설정
                </Link>
              </div>
            )}

            {/* 로그인으로 돌아가기 */}
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>

        {/* 페이지 하단 */}
        <div className="absolute bottom-5 flex gap-2 text-base text-gray-400">
          <Link
            href="/terms"
            className="hover:text-gray-600"
          >
            이용약관
          </Link>

          <span>|</span>

          <Link
            href="/privacy"
            className="hover:text-gray-600"
          >
            개인정보 처리방침
          </Link>

          <span>|</span>

          <Link
            href="/faq"
            className="hover:text-gray-600"
          >
            FAQ/문의
          </Link>
        </div>
      </section>
    </main>
  );
}