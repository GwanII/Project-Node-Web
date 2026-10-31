# DB 마이그레이션 워크플로우 (2026-11-01 도입)

## 무엇이 바뀌었나

**이전**: 스키마를 바꿀 때마다 Supabase 대시보드 → SQL Editor에 직접 들어가서 SQL을
수동으로 복붙 실행했음. dev랑 운영에 각각 따로 들어가서 똑같은 작업을 두 번 해야 했고,
깜빡하고 한쪽만 실행하면 dev/운영 스키마가 어긋나는 일이 반복됐음
(`handle_new_user` 트리거가 운영엔 있는데 dev엔 없었던 사건이 대표적인 예).

**지금부터**: 스키마 변경 SQL을 `supabase/migrations/` 폴더에 파일로 만들어서
**커밋하고 `dev`/`main`에 push하면, GitHub Actions가 자동으로 해당 환경의
Supabase DB에 그 SQL을 실행**해준다. SQL Editor에 직접 들어가서 수동 실행하는 일은
더 이상 하지 않는다.

---

## 새 스키마 변경이 필요할 때 (앞으로 할 일)

1. 마이그레이션 파일 생성
   ```
   npx supabase migration new <변경_내용을_설명하는_이름>
   ```
   예: `npx supabase migration new add_invite_notification_type`

   → `supabase/migrations/<타임스탬프>_<이름>.sql` 파일이 자동 생성됨

2. 그 파일 안에 원하는 SQL 작성 (`CREATE TABLE`, `ALTER TABLE`, `CREATE TRIGGER` 등)

3. 평소처럼 브랜치 작업 → 커밋 → PR → `dev`에 머지
   - 머지돼서 `dev`에 push되는 순간, GitHub Actions(`Deploy Supabase Migrations`)가
     자동으로 **dev Supabase 프로젝트**에 그 SQL을 실행함
   - Actions 탭에서 실행 결과(성공/실패) 확인 가능

4. dev에서 검증 끝나고 `main`으로 머지되면, 이번엔 **운영 Supabase 프로젝트**에
   자동으로 똑같이 실행됨

**중요**: `supabase/migrations/` 폴더에 변경이 없는 머지(예: 로그인 버튼 수정 같은
DB랑 무관한 코드 변경)는 이 Action이 아예 실행되지 않는다
(`.github/workflows/supabase-migrate.yml`의 `paths` 설정 때문).

---

## 더 이상 하지 않는 것

- ~~Supabase SQL Editor에 들어가서 SQL 직접 실행~~
- ~~저장소 루트에 `supabase_xxx_table.sql` 같은 파일을 따로 만들어서 "이거 대시보드에서
  실행하세요"라고 안내하는 방식~~ (`supabase_mobile_upload_pending_table.sql`,
  `supabase_mobile_upload_table_v2.sql`, `supabase_project_invites_table.sql`이 이 방식이었음.
  내용은 각각 `supabase/migrations/20260929113800_*.sql`,
  `supabase/migrations/20260929113801_*.sql`, `supabase/migrations/20261101033000_*.sql`로
  옮겨졌고, 루트의 원본 파일들은 더 이상 쓰지 않음 — 참고용으로만 남겨두거나 삭제해도 됨)

---

## 로컬에서 직접 DB 만지고 싶을 때

로컬 CLI는 한 번에 dev 또는 운영 중 하나에만 "연결(link)"된 상태다.

```
# 현재 뭐에 연결돼있는지 확인
npx supabase projects list

# dev로 전환
npx supabase link --project-ref vnsfvoomezcswlwjimze

# 운영으로 전환 (조심해서 쓸 것)
npx supabase link --project-ref rruezvmenzjdjyiqbqxy
```

**평소엔 dev에 연결된 상태로 두는 걸 기본으로 한다.** 운영에 연결한 채로 실수로
`supabase db push`나 다른 쓰기 명령을 치면 바로 운영 DB에 반영되니 주의.

마이그레이션 현재 상태(로컬 파일 vs 원격 DB에 적용된 이력) 확인:
```
npx supabase migration list
```

---

## 예외적으로 수동 SQL이 필요한 경우 (급한 핫픽스 등)

정말 급해서 Actions 배포를 기다릴 수 없는 경우에만 SQL Editor에서 직접 실행해도
되지만, **그 즉시 같은 내용을 `supabase/migrations/`에 파일로도 추가해서 커밋**해야
한다. 안 그러면 이번 트리거 사건처럼 다음 CLI 마이그레이션 이력이 실제 DB 상태와
어긋나서, 나중에 `migration repair`로 다시 수동 동기화해야 하는 사태가 반복된다.

---

## 관련 파일

| 파일/폴더 | 역할 |
|---|---|
| `supabase/config.toml` | Supabase CLI 프로젝트 설정 |
| `supabase/migrations/*.sql` | 실제 적용된(될) 스키마 변경 이력 — **이 폴더가 진짜 스키마 소스** |
| `.github/workflows/supabase-migrate.yml` | `dev`/`main` push 시 자동 배포하는 GitHub Actions 워크플로우 |
| `schema.sql` (저장소 루트) | 과거 `pg_dump` 방식으로 떠둔 스냅샷. 지금부터는 `supabase/migrations`가
기준이라 이 파일은 점점 오래된 참고용 스냅샷이 됨 (필요하면 `supabase db dump`로 다시 떠서 갱신 가능) |

### GitHub Actions Secrets (Settings → Secrets and variables → Actions)

| 이름 | 용도 |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase 계정 인증용 (dev+운영 두 프로젝트 모두 Full access) |
| `SUPABASE_DEV_PROJECT_REF` | dev 프로젝트 ref (`vnsfvoomezcswlwjimze`) |
| `SUPABASE_DEV_DB_PASSWORD` | dev DB 비밀번호 |
| `SUPABASE_PROD_PROJECT_REF` | 운영 프로젝트 ref (`rruezvmenzjdjyiqbqxy`) |
| `SUPABASE_PROD_DB_PASSWORD` | 운영 DB 비밀번호 |
