-- auth.users에 새 유저가 생성될 때마다 public.profiles에도 행을 자동 생성하는 트리거.
-- handle_new_user() 함수는 이미 schema.sql에 있었지만, 이 함수를 실행시키는
-- 트리거(on_auth_user_created)가 누락되어 신규 가입자의 profiles 행이
-- 생성되지 않는 문제가 있었다 (-> projectdata_user_id_fkey 위반 에러의 원인).

DROP TRIGGER IF EXISTS "on_auth_user_created" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
