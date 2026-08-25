# Project NODE

팀 프로젝트 협업을 위한 웹 서비스입니다. 로그인부터 프로젝트 생성, 팀원 관리, 회의록/자료 공유,
투표, 할 일 관리, 미니게임까지 팀 프로젝트 진행에 필요한 기능을 한 곳에서 제공하는 것을 목표로 합니다.

> 현재는 UI/UX 프로토타입 단계로, 대부분의 데이터는 화면 안에 하드코딩된 mock 데이터이며
> 실제 백엔드와 연동된 기능은 로그인/회원가입(Supabase Auth) 정도입니다. 상세 내용은 아래
> "구현 상태" 항목을 참고하세요.

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **언어**: TypeScript
- **UI**: React 19, Tailwind CSS 4
- **아이콘**: lucide-react
- **인증/DB**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인합니다.

Supabase 인증을 사용하는 로그인/회원가입 페이지를 쓰려면 프로젝트 루트에 `.env.local`을
만들고 아래 값을 채워야 합니다.

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 페이지 구성 (`app/`)

| 경로 | 설명 |
|---|---|
| `/login`, `/signup` | 로그인 / 회원가입. Supabase Auth(이메일·구글 로그인) 연동 |
| `/mainpage` | 전체 프로젝트 목록. 프로젝트 카드, 검색/정렬, 알림·할 일 사이드 패널, 플랜 업그레이드/계정 전환 팝업 |
| `/newprojectpage`, `/newtemplatepage` | 새 프로젝트 생성 플로우 (프로젝트 정보 입력 → 템플릿 선택) |
| `/Projectmainpage` | 개별 프로젝트 대시보드. 아래 "대시보드 카드" 참고 |
| `/storage` | 프로젝트 자료 보관함 (파일/URL/문서 목록, 정렬·필터) |
| `/profile` | 사용자 프로필 |
| `/payment` | 플랜 결제 페이지 (`?plan=basic|premium|pro` 쿼리로 플랜 표시, 결제는 mock) |

### `/Projectmainpage` 대시보드 카드

좌측 사이드바(파일/달력/자료 보관함)와 우측 대시보드 카드 영역으로 구성되며,
카드는 드래그로 순서를 서로 바꿀 수 있습니다.

- **팀원 현황**: 팀원 목록, 진행률, 초대/권한 설정
- **최신 작업**: 최근 파일·캘린더 8개 (2행 4열)
- **투표**: 진행중/완료 투표 목록, 새 투표 생성(이미지 첨부 가능)
- **TO DO LIST**: 할 일 목록, 완료 토글
- **자료 보관함**: 최근 사용한 자료 8개 미리보기, `/storage`로 바로가기
- **미니게임**: 제비뽑기(인원 수 지정 가능), 사다리타기(참가자/결과 자유 편집, 본인 경로 애니메이션 확인)

## 폴더 구조

```
app/                # Next.js App Router 페이지
  mainpage/
  Projectmainpage/
  storage/, profile/, payment/, login/, signup/ ...
src/lib/            # Supabase 클라이언트 (브라우저 / 서버)
docs/               # 기능 적용 절차 문서 (예: 이메일 초대 발송 가이드)
public/             # 정적 리소스
```

## 구현 상태 / TODO

- ✅ Supabase 기반 로그인/회원가입
- ⚠️ 프로젝트/팀원/투표/할 일/자료 등 대부분의 데이터는 컴포넌트 내 mock 데이터 (새로고침 시 초기화)
- ⚠️ 결제(`/payment`)는 실제 PG 연동 없는 테스트 화면
- ⚠️ "팀원 초대하기"는 실제 이메일 발송 없이 alert만 표시 — 적용 절차는 `docs/invite-email-setup.md` 참고
- 🚧 향후 실제 DB(Supabase 테이블) 연동 및 각 mock 기능의 실데이터화 필요
