


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."delete_expired_phone_verification_requests"() RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  delete from public.phone_verification_requests
  where expires_at < now();
$$;


ALTER FUNCTION "public"."delete_expired_phone_verification_requests"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  user_name text;
begin

  -- 이메일 회원가입은 raw_user_meta_data.name 사용
  -- Google OAuth는 full_name이 들어올 수 있으므로 대체값으로 사용
  user_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'full_name',
    ''
  );

  insert into public.profiles (
    id,
    nickname,
    name,
    email,
    phone,
    onboarding_completed
  )
  values (
    -- auth.users의 사용자 고유 ID
    new.id,

    -- 최초 nickname은 name과 동일하게 생성
    -- * 추후 프로필 수정 기능에서 nickname만 변경 가능하게 만들 예정 *
    user_name,

    -- 회원가입 시 입력한 실제 이름
    user_name,

    -- auth.users의 이메일
    new.email,

    -- 휴대폰 인증 전에는 NULL일 수 있음
    new.phone,

    -- 이메일 인증 + 휴대폰 인증을 모두 완료했는지 판단
    (
      new.email_confirmed_at is not null
      and
      new.phone_confirmed_at is not null
    )
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_auth_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin

  update public.profiles
  set
    -- Supabase Auth에서 인증된 휴대폰 번호를 profiles에 반영
    phone = new.phone,

    -- 이메일과 휴대폰 인증이 모두 완료됐는지 다시 판단
    onboarding_completed = (
      new.email_confirmed_at is not null
      and
      new.phone_confirmed_at is not null
    )

  where id = new.id;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_user_auth_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_project_member"("pid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.projectdata p
    where p.id = pid and p.user_id = auth.uid()
  ) or exists (
    select 1 from public.project_members m
    where m.project_id = pid and m.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_project_member"("pid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_phone_verification_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_phone_verification_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$ BEGIN     NEW.updated_at = now();     RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_name" "text" NOT NULL,
    "result" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cal_availabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "date_str" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."cal_availabilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cal_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "start_date" "text" NOT NULL,
    "end_date" "text" NOT NULL,
    "color" "text" NOT NULL,
    "user_id" "uuid",
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."cal_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cal_memos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date_str" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."cal_memos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "strokes" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ydoc_state" "text"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "uploader" "text",
    "size" "text",
    "url" "text",
    "storage_path" "text",
    "folder_id" "uuid",
    "project_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."files" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "project_id" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mobile_upload_pending" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "size" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "mobile_upload_pending_type_check" CHECK (("type" = ANY (ARRAY['image'::"text", 'document'::"text"])))
);


ALTER TABLE "public"."mobile_upload_pending" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mobile_upload_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."mobile_upload_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "message" "text" NOT NULL,
    "link" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_verification_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "vonage_request_id" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "resend_count" integer DEFAULT 0 NOT NULL,
    "last_sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "failed_attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "phone_verification_requests_failed_attempts_check" CHECK (("failed_attempts" >= 0)),
    CONSTRAINT "phone_verification_requests_purpose_check" CHECK (("purpose" = 'account-recovery'::"text")),
    CONSTRAINT "phone_verification_requests_resend_count_check" CHECK (("resend_count" >= 0))
);


ALTER TABLE "public"."phone_verification_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nickname" "text" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    "kakao_notify" boolean DEFAULT true
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "role" "text" DEFAULT '팀원'::"text" NOT NULL,
    "permission" "text" DEFAULT 'write'::"text" NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_members_permission_check" CHECK (("permission" = ANY (ARRAY['read'::"text", 'write'::"text", 'admin'::"text"]))),
    CONSTRAINT "project_members_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100))),
    CONSTRAINT "project_members_role_check" CHECK (("role" = ANY (ARRAY['팀장'::"text", '팀원'::"text"])))
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_sidebar_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sub_type" "text",
    "storage_path" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_sidebar_items_sub_type_check" CHECK (("sub_type" = ANY (ARRAY['png'::"text", 'jpg'::"text", 'url'::"text", 'audio'::"text", 'ppt'::"text", 'file'::"text"]))),
    CONSTRAINT "project_sidebar_items_type_check" CHECK (("type" = ANY (ARRAY['file'::"text", 'calendar'::"text", 'resource'::"text"])))
);


ALTER TABLE "public"."project_sidebar_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projectdata" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "project_name" "text" NOT NULL,
    "description" "text",
    "start_date" "date",
    "end_date" "date",
    "selected_template" "text" NOT NULL,
    "user_id" "uuid",
    "user_name" "text",
    "user_email" "text"
);


ALTER TABLE "public"."projectdata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sheet_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sub_type" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text",
    "project_name" "text",
    CONSTRAINT "sheet_items_section_check" CHECK (("section" = ANY (ARRAY['files'::"text", 'calendars'::"text", 'resources'::"text"])))
);


ALTER TABLE "public"."sheet_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."todos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "text" "text" NOT NULL,
    "due_at" timestamp with time zone NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."todos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vote_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vote_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "image_url" "text",
    "position" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."vote_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vote_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vote_id" "uuid" NOT NULL,
    "option_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vote_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "deadline" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_reports"
    ADD CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cal_availabilities"
    ADD CONSTRAINT "cal_availabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cal_availabilities"
    ADD CONSTRAINT "cal_availabilities_user_id_date_str_key" UNIQUE ("user_id", "date_str");



ALTER TABLE ONLY "public"."cal_events"
    ADD CONSTRAINT "cal_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cal_memos"
    ADD CONSTRAINT "memos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mobile_upload_pending"
    ADD CONSTRAINT "mobile_upload_pending_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mobile_upload_tokens"
    ADD CONSTRAINT "mobile_upload_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mobile_upload_tokens"
    ADD CONSTRAINT "mobile_upload_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_verification_requests"
    ADD CONSTRAINT "phone_verification_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_user_id_key" UNIQUE ("project_id", "user_id");



ALTER TABLE ONLY "public"."project_sidebar_items"
    ADD CONSTRAINT "project_sidebar_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projectdata"
    ADD CONSTRAINT "projectdata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sheet_items"
    ADD CONSTRAINT "sheet_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vote_options"
    ADD CONSTRAINT "vote_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vote_responses"
    ADD CONSTRAINT "vote_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vote_responses"
    ADD CONSTRAINT "vote_responses_vote_id_user_id_key" UNIQUE ("vote_id", "user_id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



CREATE INDEX "ai_reports_user_created_idx" ON "public"."ai_reports" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_phone_verification_requests_phone_purpose_created_at" ON "public"."phone_verification_requests" USING "btree" ("phone", "purpose", "created_at" DESC);



CREATE INDEX "sheet_items_section_idx" ON "public"."sheet_items" USING "btree" ("section", "sort_order");



CREATE OR REPLACE TRIGGER "update_cal_events_updated_at" BEFORE UPDATE ON "public"."cal_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_memos_updated_at" BEFORE UPDATE ON "public"."cal_memos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_phone_verification_requests_updated_at" BEFORE UPDATE ON "public"."phone_verification_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_phone_verification_requests_updated_at"();



ALTER TABLE ONLY "public"."ai_reports"
    ADD CONSTRAINT "ai_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cal_availabilities"
    ADD CONSTRAINT "cal_availabilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cal_events"
    ADD CONSTRAINT "cal_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."files"
    ADD CONSTRAINT "files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cal_memos"
    ADD CONSTRAINT "memos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mobile_upload_tokens"
    ADD CONSTRAINT "mobile_upload_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projectdata"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projectdata"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_sidebar_items"
    ADD CONSTRAINT "project_sidebar_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projectdata"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projectdata"
    ADD CONSTRAINT "projectdata_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projectdata"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."todos"
    ADD CONSTRAINT "todos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_options"
    ADD CONSTRAINT "vote_options_vote_id_fkey" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_responses"
    ADD CONSTRAINT "vote_responses_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."vote_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_responses"
    ADD CONSTRAINT "vote_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_responses"
    ADD CONSTRAINT "vote_responses_vote_id_fkey" FOREIGN KEY ("vote_id") REFERENCES "public"."votes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projectdata"("id") ON DELETE CASCADE;



CREATE POLICY "ALL" ON "public"."cal_availabilities" USING (true) WITH CHECK (true);



CREATE POLICY "ALL" ON "public"."cal_events" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for testing" ON "public"."cal_memos" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for testing" ON "public"."projectdata" USING (true) WITH CHECK (true);



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."ai_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."cal_availabilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cal_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cal_memos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete own reports" ON "public"."ai_reports" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "delete own todos" ON "public"."todos" FOR DELETE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_all" ON "public"."documents" USING (true) WITH CHECK (true);



CREATE POLICY "insert own reports" ON "public"."ai_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "insert own todos" ON "public"."todos" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."mobile_upload_pending" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mobile_upload_pending_delete" ON "public"."mobile_upload_pending" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."mobile_upload_tokens" "t"
  WHERE (("t"."token" = "mobile_upload_pending"."token") AND ("t"."created_by" = "auth"."uid"())))));



CREATE POLICY "mobile_upload_pending_select" ON "public"."mobile_upload_pending" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."mobile_upload_tokens" "t"
  WHERE (("t"."token" = "mobile_upload_pending"."token") AND ("t"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."mobile_upload_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mobile_upload_tokens_insert" ON "public"."mobile_upload_tokens" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "mobile_upload_tokens_select_own" ON "public"."mobile_upload_tokens" FOR SELECT USING (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete_own" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_insert_own" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."phone_verification_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_members_delete" ON "public"."project_members" FOR DELETE USING ("public"."is_project_member"("project_id"));



CREATE POLICY "project_members_insert" ON "public"."project_members" FOR INSERT WITH CHECK ("public"."is_project_member"("project_id"));



CREATE POLICY "project_members_select" ON "public"."project_members" FOR SELECT USING ("public"."is_project_member"("project_id"));



CREATE POLICY "project_members_update" ON "public"."project_members" FOR UPDATE USING ("public"."is_project_member"("project_id"));



ALTER TABLE "public"."project_sidebar_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_sidebar_items_delete" ON "public"."project_sidebar_items" FOR DELETE USING ("public"."is_project_member"("project_id"));



CREATE POLICY "project_sidebar_items_insert" ON "public"."project_sidebar_items" FOR INSERT WITH CHECK ("public"."is_project_member"("project_id"));



CREATE POLICY "project_sidebar_items_select" ON "public"."project_sidebar_items" FOR SELECT USING ("public"."is_project_member"("project_id"));



CREATE POLICY "project_sidebar_items_update" ON "public"."project_sidebar_items" FOR UPDATE USING ("public"."is_project_member"("project_id"));



ALTER TABLE "public"."projectdata" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read own reports" ON "public"."ai_reports" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "read own todos" ON "public"."todos" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."sheet_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sheet_items_all" ON "public"."sheet_items" USING (true) WITH CHECK (true);



ALTER TABLE "public"."todos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "todos_delete_own" ON "public"."todos" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "todos_insert_own" ON "public"."todos" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "todos_select_own" ON "public"."todos" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "todos_update_own" ON "public"."todos" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "update own todos" ON "public"."todos" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."vote_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vote_options_insert" ON "public"."vote_options" FOR INSERT WITH CHECK ("public"."is_project_member"(( SELECT "votes"."project_id"
   FROM "public"."votes"
  WHERE ("votes"."id" = "vote_options"."vote_id"))));



CREATE POLICY "vote_options_select" ON "public"."vote_options" FOR SELECT USING ("public"."is_project_member"(( SELECT "votes"."project_id"
   FROM "public"."votes"
  WHERE ("votes"."id" = "vote_options"."vote_id"))));



ALTER TABLE "public"."vote_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vote_responses_delete" ON "public"."vote_responses" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "vote_responses_insert" ON "public"."vote_responses" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_project_member"(( SELECT "votes"."project_id"
   FROM "public"."votes"
  WHERE ("votes"."id" = "vote_responses"."vote_id")))));



CREATE POLICY "vote_responses_select" ON "public"."vote_responses" FOR SELECT USING ("public"."is_project_member"(( SELECT "votes"."project_id"
   FROM "public"."votes"
  WHERE ("votes"."id" = "vote_responses"."vote_id"))));



CREATE POLICY "vote_responses_update" ON "public"."vote_responses" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votes_delete" ON "public"."votes" FOR DELETE USING ("public"."is_project_member"("project_id"));



CREATE POLICY "votes_insert" ON "public"."votes" FOR INSERT WITH CHECK ("public"."is_project_member"("project_id"));



CREATE POLICY "votes_select" ON "public"."votes" FOR SELECT USING ("public"."is_project_member"("project_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_expired_phone_verification_requests"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_expired_phone_verification_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_expired_phone_verification_requests"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_auth_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_auth_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_auth_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_project_member"("pid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_project_member"("pid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_project_member"("pid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_phone_verification_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_phone_verification_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_phone_verification_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."ai_reports" TO "anon";
GRANT ALL ON TABLE "public"."ai_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_reports" TO "service_role";



GRANT ALL ON TABLE "public"."cal_availabilities" TO "anon";
GRANT ALL ON TABLE "public"."cal_availabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."cal_availabilities" TO "service_role";



GRANT ALL ON TABLE "public"."cal_events" TO "anon";
GRANT ALL ON TABLE "public"."cal_events" TO "authenticated";
GRANT ALL ON TABLE "public"."cal_events" TO "service_role";



GRANT ALL ON TABLE "public"."cal_memos" TO "anon";
GRANT ALL ON TABLE "public"."cal_memos" TO "authenticated";
GRANT ALL ON TABLE "public"."cal_memos" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."files" TO "anon";
GRANT ALL ON TABLE "public"."files" TO "authenticated";
GRANT ALL ON TABLE "public"."files" TO "service_role";



GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."mobile_upload_pending" TO "anon";
GRANT ALL ON TABLE "public"."mobile_upload_pending" TO "authenticated";
GRANT ALL ON TABLE "public"."mobile_upload_pending" TO "service_role";



GRANT ALL ON TABLE "public"."mobile_upload_tokens" TO "anon";
GRANT ALL ON TABLE "public"."mobile_upload_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."mobile_upload_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."phone_verification_requests" TO "anon";
GRANT ALL ON TABLE "public"."phone_verification_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_verification_requests" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."project_sidebar_items" TO "anon";
GRANT ALL ON TABLE "public"."project_sidebar_items" TO "authenticated";
GRANT ALL ON TABLE "public"."project_sidebar_items" TO "service_role";



GRANT ALL ON TABLE "public"."projectdata" TO "anon";
GRANT ALL ON TABLE "public"."projectdata" TO "authenticated";
GRANT ALL ON TABLE "public"."projectdata" TO "service_role";



GRANT ALL ON TABLE "public"."sheet_items" TO "anon";
GRANT ALL ON TABLE "public"."sheet_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sheet_items" TO "service_role";



GRANT ALL ON TABLE "public"."todos" TO "anon";
GRANT ALL ON TABLE "public"."todos" TO "authenticated";
GRANT ALL ON TABLE "public"."todos" TO "service_role";



GRANT ALL ON TABLE "public"."vote_options" TO "anon";
GRANT ALL ON TABLE "public"."vote_options" TO "authenticated";
GRANT ALL ON TABLE "public"."vote_options" TO "service_role";



GRANT ALL ON TABLE "public"."vote_responses" TO "anon";
GRANT ALL ON TABLE "public"."vote_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."vote_responses" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







