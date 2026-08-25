# 팀원 초대 이메일 실제 발송 적용 가이드

> 이 문서는 **적용 방법과 절차만 정리한 문서**입니다. 코드는 아직 수정하지 않았습니다.
> 실제 적용은 아래 절차를 검토한 뒤 별도로 진행합니다.

## 1. 현재 상태

`app/Projectmainpage/page.tsx`의 "팀원 초대하기" 모달(`handleInviteMember`, 약 349번째 줄)은
이메일을 입력하고 제출하면 실제 발송 없이 아래처럼 `alert`만 띄우는 mock 상태입니다.

```tsx
const handleInviteMember = (e: React.FormEvent) => {
  e.preventDefault();
  if (!inviteEmail.trim()) return;

  alert(`${inviteEmail} 님에게 초대 메일을 발송했습니다.`);
  setInviteEmail("");
  setIsInviteModalOpen(false);
};
```

실제로 메일이 발송되게 하려면 **① 이메일 발송 서비스**, **② 서버 측 발송 로직(API Route)**,
**③ 초대 링크/토큰 저장소**, **④ 클라이언트 연동**이 필요합니다.

프로젝트가 이미 Supabase(`@supabase/ssr`, `@supabase/supabase-js`)를 인증에 쓰고 있으므로,
이 문서도 Supabase를 초대 데이터 저장소로 활용하는 방향을 기준으로 설명합니다.

---

## 2. 전체 흐름 (아키텍처)

```
[클라이언트: 초대 모달]
   │  이메일 주소 입력 후 제출
   ▼
[Next.js Route Handler:  app/api/invite/route.ts]
   │  1) 이메일 형식/중복 검증
   │  2) 초대 토큰 생성 + DB(Supabase) 저장
   │  3) 이메일 발송 서비스 API 호출
   ▼
[이메일 발송 서비스: Resend / SendGrid / SES 등]
   │  실제 메일 전송
   ▼
[수신자 메일함 → 초대 링크 클릭]
   ▼
[app/invite/[token]/page.tsx (신규)]
   │  토큰 검증 → 프로젝트에 팀원으로 추가 / 회원가입 유도
```

핵심은 **이메일 발송 API 키를 클라이언트에 절대 노출하지 않는 것**이므로,
발송 로직은 반드시 서버(Route Handler)에서만 실행해야 합니다.

---

## 3. 이메일 발송 서비스 선택지

| 서비스 | 장점 | 단점 | 무료 티어 |
|---|---|---|---|
| **Resend** (추천) | Next.js/React 생태계와 궁합이 좋음, React Email로 템플릿 작성 가능, SDK가 매우 단순 | 비교적 신생 서비스 | 월 3,000통 |
| SendGrid | 오래되고 안정적, 기능 많음 | 설정이 다소 복잡, 대시보드가 무거움 | 월 100통 |
| AWS SES | 매우 저렴, 대량 발송에 강함 | 초기 설정(도메인 인증, 샌드박스 해제)이 번거로움 | 매우 저렴하지만 프리티어 제한적 |
| Nodemailer + 자체 SMTP(Gmail 등) | 별도 가입 불필요 | 스팸 처리되기 쉬움, 발송량 제한, 실서비스에 비권장 | - |
| Supabase Auth `inviteUserByEmail` | 이미 쓰는 Supabase만으로 처리 가능 | "팀 초대" 용도가 아니라 "계정 초대(가입)" 전용이라 커스텀 문구/링크 제어가 제한적 | Supabase 요금제에 포함 |

**추천: Resend.** 이유:
- Next.js 공식 예제/문서에서 가장 많이 쓰이는 조합이라 레퍼런스가 많음
- `resend` npm 패키지 하나로 끝남 (SMTP 설정 불필요)
- React Email(`@react-email/components`)로 초대 메일 디자인을 컴포넌트처럼 작성 가능

---

## 4. 적용 절차 (단계별)

### 4.1 이메일 발송 서비스 준비
1. [Resend](https://resend.com) 가입 후 API Key 발급
2. (선택, 실서비스 시 필수) 발신 도메인 등록 후 DNS에 SPF/DKIM 레코드 추가
   - 도메인 인증 전에는 Resend가 제공하는 테스트 발신 주소(`onboarding@resend.dev`)로만 발송 가능
3. 발급받은 API Key를 안전하게 보관 (git에 커밋 금지)

### 4.2 패키지 설치
```bash
npm install resend
# (선택) 이메일 템플릿을 React 컴포넌트로 만들고 싶다면
npm install @react-email/components
```

### 4.3 환경 변수 설정
`.env.local` (git-ignore 대상, 이미 `.env*`가 무시되는지 `.gitignore` 확인 필요)
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
INVITE_EMAIL_FROM="프로젝트 NODE <invite@your-domain.com>"
NEXT_PUBLIC_APP_URL=https://your-domain.com
```
- `RESEND_API_KEY`는 **서버에서만** 접근해야 하므로 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.
- 로컬 개발/Vercel 배포 환경 각각에 동일한 키를 등록해야 합니다.

### 4.4 초대 데이터 저장 테이블 설계 (Supabase)
초대 이력을 추적하고, 링크에 담을 토큰의 유효성을 검증하려면 테이블이 필요합니다.

```sql
create table project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id),
  token text not null unique,
  status text not null default 'pending', -- pending | accepted | expired
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
```
> `projects` 테이블이 아직 없다면(현재 프로젝트 데이터는 mock), 이 단계 전에 프로젝트/팀원을
> 실제 DB 테이블로 마이그레이션하는 작업이 선행되어야 합니다.

### 4.5 서버 API Route 작성 (`app/api/invite/route.ts`)
개략적인 처리 순서만 정리합니다 (실제 코드는 적용 시 작성):
1. 요청 바디에서 `email`, `projectId` 받기
2. 이메일 형식 검증 (`zod` 등으로 서버에서도 재검증 — 클라이언트 검증은 우회 가능하므로 필수)
3. 이미 초대된 이메일인지 `project_invites`에서 중복 확인
4. `crypto.randomUUID()` 등으로 초대 토큰 생성 후 DB에 저장
5. Resend SDK로 이메일 발송
   - 발송 실패 시 DB에 저장된 초대 레코드 롤백(삭제) 또는 상태를 `failed`로 표시
6. 클라이언트에 성공/실패 JSON 응답

### 4.6 이메일 템플릿
- 최소 구성: 초대한 사람 이름, 프로젝트 이름, "참여하기" 버튼(초대 링크 포함), 만료 기한 안내
- 링크 형태 예: `${NEXT_PUBLIC_APP_URL}/invite/${token}`

### 4.7 클라이언트 코드 수정 (`app/Projectmainpage/page.tsx`)
- `handleInviteMember`를 `fetch("/api/invite", { method: "POST", body: ... })` 호출로 교체
- 로딩 상태(`isSendingInvite`) 추가해 버튼 중복 클릭 방지
- 성공/실패에 따라 `alert` 문구 분기 (지금 구조와 유사하게 유지 가능)

### 4.8 초대 수락 페이지 (`app/invite/[token]/page.tsx`, 신규)
1. URL의 `token`으로 `project_invites` 조회
2. `expires_at` 만료 여부, `status`가 `pending`인지 확인
3. 로그인되어 있지 않다면 회원가입/로그인 유도 후 다시 이 페이지로 리다이렉트
4. 로그인 상태면 해당 프로젝트의 팀원 테이블에 사용자 추가, `status`를 `accepted`로 갱신

### 4.9 테스트
1. 로컬에서 본인 이메일로 초대 → 실제 수신 확인 (도메인 인증 전이면 `onboarding@resend.dev` 발신으로 테스트)
2. 만료된 토큰/이미 사용된 토큰으로 접속 시 에러 처리 확인
3. 잘못된 이메일 형식 입력 시 서버 응답 확인
4. 같은 이메일로 중복 초대 시도 시 처리 확인 (재발송 허용할지, 막을지 정책 결정 필요)

### 4.10 배포 시 체크리스트
- [ ] Vercel(또는 배포 환경)에 `RESEND_API_KEY`, `INVITE_EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` 환경 변수 등록
- [ ] 발신 도메인 DNS 인증 완료 (스팸함으로 분류되는 것 방지)
- [ ] API Route에 Rate Limit 적용 (동일 IP/유저의 과도한 초대 발송 방지 — 예: `@upstash/ratelimit`)
- [ ] 초대 토큰 만료 정책 확정 (예: 7일)
- [ ] 개인정보(이메일) 저장에 대한 최소한의 접근 제어(RLS) 설정 확인

---

## 5. 보안 관련 주의사항
- API Key는 서버 환경 변수로만 사용하고, 절대 클라이언트 번들에 포함되지 않도록 `NEXT_PUBLIC_` 접두어를 붙이지 않습니다.
- 이메일 발송 API Route는 인증된 사용자(현재 프로젝트 팀장/관리자)만 호출할 수 있도록 세션 검증이 필요합니다.
- 초대 토큰은 추측 불가능한 값(UUID v4 이상)을 사용하고, 사용 후 즉시 무효화합니다.
- 대량 초대 스팸 방지를 위해 Rate Limit을 반드시 적용합니다.

---

## 6. 예상 작업 범위 요약

| 영역 | 작업 |
|---|---|
| 패키지 | `resend` (+선택 `@react-email/components`) 설치 |
| 환경 변수 | `RESEND_API_KEY`, `INVITE_EMAIL_FROM`, `NEXT_PUBLIC_APP_URL` |
| DB | `project_invites` 테이블 신규 생성 (Supabase) |
| 신규 파일 | `app/api/invite/route.ts`, `app/invite/[token]/page.tsx` |
| 수정 파일 | `app/Projectmainpage/page.tsx` (`handleInviteMember`) |
| 외부 서비스 | Resend 가입, 발신 도메인 DNS 인증 |

이 문서에 동의하시면 이어서 실제 코드 적용을 진행하겠습니다.
