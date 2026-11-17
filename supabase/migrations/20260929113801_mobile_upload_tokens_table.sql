-- mobile_upload_tokens를 프로젝트 종속에서 전체 자료 보관함(storage) 전용으로 변경

drop table if exists public.mobile_upload_tokens;

create table public.mobile_upload_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.mobile_upload_tokens enable row level security;

create policy "mobile_upload_tokens_insert"
  on public.mobile_upload_tokens for insert
  with check (created_by = auth.uid());

create policy "mobile_upload_tokens_select_own"
  on public.mobile_upload_tokens for select
  using (created_by = auth.uid());
