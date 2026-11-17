-- 프로젝트 팀원 초대(수락/거절 필요) 테이블
-- Supabase 대시보드 → SQL Editor에서 그대로 실행하세요.

create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projectdata(id) on delete cascade,
  invited_email text not null,
  invited_user_id uuid references public.profiles(id) on delete set null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null default '팀원' check (role in ('팀장', '팀원')),
  permission text not null default 'write' check (permission in ('read', 'write', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz
);

create index project_invites_project_id_idx on public.project_invites (project_id);
create index project_invites_invited_email_idx on public.project_invites (invited_email);

-- 모든 접근은 서버(API Route, service role)를 통해서만 이뤄지므로
-- RLS는 켜두고 별도 정책은 추가하지 않습니다 (기본적으로 전부 차단).
alter table public.project_invites enable row level security;
