"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type PlanKey = "basic" | "premium" | "pro";

interface PlanInfo {
  name: string;
  price: string;
  priceLabel: string;
  features: string[];
}

const PLAN_INFO: Record<PlanKey, PlanInfo> = {
  basic: {
    name: "기본 플랜",
    price: "무료",
    priceLabel: "",
    features: ["프로젝트 최대 8개 생성", "팀원 최대 5명 초대", "기본 통계 제공"],
  },
  premium: {
    name: "프리미엄 플랜",
    price: "₩9,900",
    priceLabel: "/ 월",
    features: ["프로젝트 무제한 생성", "팀원 무제한 초대", "고급 통계 및 리포트", "우선 고객 지원"],
  },
  pro: {
    name: "프로 플랜",
    price: "₩19,900",
    priceLabel: "/ 월",
    features: ["프리미엄 기능 모두 포함", "전담 매니저 배정", "API 연동 지원", "맞춤형 보안 설정"],
  },
};

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const plan = PLAN_INFO[(planParam as PlanKey) ?? "premium"] ?? PLAN_INFO.premium;

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert(`${plan.name} 결제가 완료되었습니다!`);
      router.push("/mainpage");
    }, 800);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* 왼쪽: 주문 요약 */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 h-fit">
          <Link
            href="/mainpage"
            className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-800 mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            돌아가기
          </Link>

          <h2 className="text-lg font-bold text-gray-900 mb-1">주문 요약</h2>
          <p className="text-sm text-gray-500 mb-6">선택하신 플랜 정보를 확인해주세요.</p>

          <div className="rounded-xl border-2 border-[#8CA5FF] bg-blue-50/40 p-5 mb-6">
            <span className="inline-block text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200 mb-2">
              선택한 플랜
            </span>
            <p className="font-bold text-gray-900 text-base mb-1">{plan.name}</p>
            <p className="text-2xl font-extrabold text-gray-900 mb-3">
              {plan.price}
              {plan.priceLabel && (
                <span className="text-sm font-medium text-gray-500"> {plan.priceLabel}</span>
              )}
            </p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between text-sm font-semibold text-gray-700 border-t border-gray-100 pt-4">
            <span>오늘 결제 금액</span>
            <span className="text-lg font-extrabold text-gray-900">
              {plan.price}
              {plan.priceLabel && <span className="text-sm font-medium text-gray-500"> {plan.priceLabel}</span>}
            </span>
          </div>
        </div>

        {/* 오른쪽: 결제 정보 입력 */}
        <div className="md:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">결제 정보 입력</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">카드 번호</label>
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">유효기간</label>
                <input
                  type="text"
                  required
                  placeholder="MM / YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CVC</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="123"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">카드 소유자명</label>
              <input
                type="text"
                required
                placeholder="홍길동"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full mt-2 py-3 bg-[#8CA5FF] hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-md"
            >
              {isProcessing
                ? "결제 처리 중..."
                : `${plan.price}${plan.priceLabel ? ` ${plan.priceLabel}` : ""} 결제하기`}
            </button>
            <p className="text-xs text-gray-400 text-center">
              실제 결제가 이루어지지 않는 테스트 화면입니다.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentContent />
    </Suspense>
  );
}
