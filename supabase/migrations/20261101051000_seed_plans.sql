-- app/payment/page.tsx 에 하드코딩되어 있던 PLAN_INFO를 plans 테이블로 이전
INSERT INTO public.plans (key, name, price, price_label, project_limit, member_limit, features, is_active, sort_order)
VALUES
  ('basic', '기본 플랜', 0, '', '최대 8개', '최대 5명',
   ARRAY['프로젝트 최대 8개 생성', '팀원 최대 5명 초대', '기본 통계 제공'], true, 1),
  ('premium', '프리미엄 플랜', 9900, '/ 월', '무제한', '무제한',
   ARRAY['프로젝트 무제한 생성', '팀원 무제한 초대', '고급 통계 및 리포트', '우선 고객 지원'], true, 2),
  ('pro', '프로 플랜', 19900, '/ 월', '무제한', '무제한',
   ARRAY['프리미엄 기능 모두 포함', '전담 매니저 배정', 'API 연동 지원', '맞춤형 보안 설정'], true, 3)
ON CONFLICT (key) DO NOTHING;
