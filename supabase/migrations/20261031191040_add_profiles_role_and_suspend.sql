-- profiles.role 기반 관리자 권한 + 회원 정지 플래그
alter table public.profiles
  add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin', 'super_admin'));
  end if;
end $$;

alter table public.profiles
  add column if not exists is_suspended boolean not null default false;
