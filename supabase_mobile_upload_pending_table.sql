-- 핸드폰에서 올린 사진의 "임시 대기" 테이블
-- PC에서 확정 업로드를 눌러야 실제 files 테이블로 옮겨간다.
-- Supabase 대시보드 → SQL Editor에서 그대로 실행하세요.

create table if not exists public.mobile_upload_pending (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  name text not null,
  type text not null check (type in ('image', 'document')),
  size text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.mobile_upload_pending enable row level security;

create policy "mobile_upload_pending_select"
  on public.mobile_upload_pending for select
  using (
    exists (
      select 1 from public.mobile_upload_tokens t
      where t.token = mobile_upload_pending.token and t.created_by = auth.uid()
    )
  );

create policy "mobile_upload_pending_delete"
  on public.mobile_upload_pending for delete
  using (
    exists (
      select 1 from public.mobile_upload_tokens t
      where t.token = mobile_upload_pending.token and t.created_by = auth.uid()
    )
  );
