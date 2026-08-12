import Link from "next/link";

export default function SignupPage() {
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
              placeholder="이름을 입력해 주세요"
              className="w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />
          </div>

          {/* 이메일 */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700">
              이메일
            </label>

            <div className="flex gap-2">
              <input
                type="email"
                placeholder="이메일을 입력해 주세요"
                className="min-w-0 flex-1 rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
              />

              <button
                type="button"
                className="shrink-0 rounded-xl border border-blue-400 px-4 text-sm text-blue-500"
              >
                인증하기
              </button>
            </div>

            <input
              type="text"
              placeholder="인증번호를 입력해 주세요"
              className="mt-2 w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">
              비밀번호
            </label>

            <input
              type="password"
              placeholder="영문자, 숫자, 특수문자 포함 8~20자"
              className="mb-2 w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />

            <input
              type="password"
              placeholder="비밀번호를 확인해 주세요"
              className="w-full rounded border border-gray-300 px-4 py-3 text-gray-800 outline-none placeholder:text-gray-400 focus:border-gray-500"
            />
          </div>

          {/* 회원가입 버튼 */}
          <button
            type="button"
            className="mt-6 w-full rounded bg-gray-400 py-3 text-lg font-bold text-white"
          >
            회원가입
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