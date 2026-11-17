// 실제 데이터 연결 전까지 대시보드/일부 화면에서 쓰는 mock 데이터.
// 회원/프로젝트는 실데이터로 연결되어 있고, 결제·플랜·공지 등 아직 테이블이
// 비어있는 화면에서 레이아웃 확인용으로만 사용한다.

export const MOCK_KPIS = [
  { label: "전체 회원", value: "1,284", unit: "명", delta: "+38 이번 주", deltaColor: "#4f46e5" },
  { label: "활성 프로젝트", value: "392", unit: "건", delta: "+12 이번 주", deltaColor: "#4f46e5" },
  { label: "이번 달 매출", value: "₩4,820,000", unit: "", delta: "+6.2%", deltaColor: "#4f46e5" },
  { label: "AI 리포트 생성", value: "968", unit: "건", delta: "실패율 2.1%", deltaColor: "#e5484d" },
];

export const MOCK_REVENUE_DAYS = [
  182, 214, 166, 240, 298, 255, 190, 228, 310, 286, 342, 268, 305, 376,
];

export const MOCK_PLAN_DIST = [
  { name: "기본", count: 612, pct: 48, color: "#c7d2fe" },
  { name: "프리미엄", count: 498, pct: 39, color: "#4f46e5" },
  { name: "프로", count: 174, pct: 13, color: "#1f2437" },
];

export const MOCK_SYSTEMS = [
  { name: "Supabase", status: "정상", dot: "#22c55e", color: "#16a34a" },
  { name: "Ollama (qwen2.5:7b)", status: "정상", dot: "#22c55e", color: "#16a34a" },
  { name: "휴대폰 인증 (Vonage)", status: "지연", dot: "#f59e0b", color: "#b45309" },
  { name: "결제 PG", status: "미연동", dot: "#9ca3af", color: "#6b7280" },
];

export const MOCK_RECENT_PAYMENTS = [
  { user: "이도윤", plan: "프리미엄", amount: "₩9,900", date: "2026/10/31 14:22", status: "완료" },
  { user: "박성빈", plan: "프로", amount: "₩19,900", date: "2026/10/30 09:10", status: "완료" },
  { user: "최하린", plan: "프리미엄", amount: "₩9,900", date: "2026/10/29 21:47", status: "실패" },
  { user: "한주현", plan: "프리미엄", amount: "₩9,900", date: "2026/10/28 18:03", status: "완료" },
  { user: "정민재", plan: "프로", amount: "₩19,900", date: "2026/10/25 16:55", status: "환불" },
];

export const MOCK_ADMIN_TODOS = [
  { tag: "결제 실패", text: "최하린 님 결제 실패 (카드 한도 초과)", href: "/admin/payments" },
  { tag: "파싱 실패", text: "AI 리포트 2건 JSON 파싱 실패", href: "/admin/reports" },
  { tag: "인증 미완료", text: "박서연, 최하린 님 휴대폰 인증 미완료", href: "/admin/members" },
];

export const STATUS_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  완료: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  정상: { color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  종료: { color: "#6b7280", bg: "#f1f3f9", border: "#e6ebfb" },
  환불: { color: "#6b7280", bg: "#f1f3f9", border: "#e6ebfb" },
  실패: { color: "#e5484d", bg: "#ffffff", border: "#e5484d" },
  정지: { color: "#e5484d", bg: "#ffffff", border: "#e5484d" },
  경고: { color: "#b45309", bg: "#fef3c7", border: "#fde68a" },
};
