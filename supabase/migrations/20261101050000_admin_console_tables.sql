-- 관리자 콘솔 신규 테이블 모음
-- (자소서 프롬프트 버전관리 / 결제 / 플랜 / 공지 / 관리자 활동로그)
-- 및 공통 권한 체크 함수 public.is_admin()

-- 0. 공통: role이 admin 이상인지 확인하는 헬퍼 함수 (RLS에서 재사용)
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER SET "search_path" TO 'public'
    AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      );
    $$;

ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";

-- 1. 자소서 프롬프트 버전 관리
CREATE TABLE IF NOT EXISTS "public"."prompt_versions" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "key" text NOT NULL DEFAULT 'cover_letter',
    "version" integer NOT NULL,
    "content" text NOT NULL,
    "memo" text,
    "model" text NOT NULL DEFAULT 'qwen2.5:7b',
    "temperature" numeric NOT NULL DEFAULT 0.3,
    "fallback_enabled" boolean NOT NULL DEFAULT true,
    "is_live" boolean NOT NULL DEFAULT false,
    "created_by" uuid REFERENCES public.profiles(id),
    "created_at" timestamptz NOT NULL DEFAULT now()
);

-- key당 is_live = true 인 행은 1개만 허용
CREATE UNIQUE INDEX IF NOT EXISTS "prompt_versions_one_live_per_key"
    ON "public"."prompt_versions" ("key")
    WHERE "is_live" = true;

ALTER TABLE "public"."prompt_versions" OWNER TO "postgres";
ALTER TABLE "public"."prompt_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompt_versions_admin_all" ON "public"."prompt_versions"
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 2. AI 리포트 로그 컬럼 추가
ALTER TABLE "public"."ai_reports"
    ADD COLUMN IF NOT EXISTS "prompt_version" integer,
    ADD COLUMN IF NOT EXISTS "duration_ms" integer,
    ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'success';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_reports_status_check'
  ) THEN
    ALTER TABLE "public"."ai_reports"
      ADD CONSTRAINT "ai_reports_status_check"
      CHECK ("status" IN ('success', 'parse_error', 'timeout', 'fallback'));
  END IF;
END $$;

-- 3. 결제 내역
CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" text PRIMARY KEY, -- 'ND-xxxxxx'
    "user_id" uuid NOT NULL REFERENCES public.profiles(id),
    "plan" text NOT NULL,
    "amount" integer NOT NULL,
    "method" text,
    "card_holder" text,
    "status" text NOT NULL DEFAULT '완료',
    "paid_at" timestamptz NOT NULL DEFAULT now(),
    "refunded_at" timestamptz,
    "refunded_by" uuid REFERENCES public.profiles(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE "public"."payments"
      ADD CONSTRAINT "payments_status_check"
      CHECK ("status" IN ('완료', '환불', '실패'));
  END IF;
END $$;

ALTER TABLE "public"."payments" OWNER TO "postgres";
ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_admin_all" ON "public"."payments"
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "payments_select_own" ON "public"."payments"
    FOR SELECT USING (auth.uid() = user_id);

-- 4. 플랜 관리
CREATE TABLE IF NOT EXISTS "public"."plans" (
    "key" text PRIMARY KEY,
    "name" text NOT NULL,
    "price" integer NOT NULL,
    "price_label" text NOT NULL DEFAULT '/ 월',
    "project_limit" text NOT NULL,
    "member_limit" text NOT NULL,
    "features" text[] NOT NULL DEFAULT '{}',
    "is_active" boolean NOT NULL DEFAULT true,
    "sort_order" integer NOT NULL DEFAULT 0
);

ALTER TABLE "public"."plans" OWNER TO "postgres";
ALTER TABLE "public"."plans" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_admin_write" ON "public"."plans"
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "plans_select_all" ON "public"."plans"
    FOR SELECT USING (true);

-- 5. 공지 / 알림 발송 기록
CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "target" text NOT NULL,
    "title" text NOT NULL,
    "body" text NOT NULL,
    "sent_count" integer NOT NULL DEFAULT 0,
    "created_by" uuid REFERENCES public.profiles(id),
    "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."announcements" OWNER TO "postgres";
ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_admin_all" ON "public"."announcements"
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. 관리자 활동 로그
CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "admin_id" uuid NOT NULL REFERENCES public.profiles(id),
    "action" text NOT NULL,
    "target" text,
    "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";
ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_logs_admin_all" ON "public"."admin_audit_logs"
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 로그인한 모든 사용자가 "배포 중" 버전은 읽을 수 있어야 /profile 의
-- 자소서 리포트 생성 기능이 동작한다 (관리자 전용 정책과 별개로 추가).
CREATE POLICY "prompt_versions_select_live" ON "public"."prompt_versions"
    FOR SELECT USING (is_live = true);
