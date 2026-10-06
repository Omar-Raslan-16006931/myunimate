-- UniMate: uni portal grades + attendance
-- Run this once in Supabase > SQL Editor.
-- Before running, replace YOUR-PROJECT-REF near the bottom with your project ref
-- (the part before .supabase.co in your project URL).

-- ───────────── tables ─────────────

create table if not exists public.portal_accounts (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     text not null,
  secret_id    uuid not null,          -- points at the encrypted password in Supabase Vault
  last_sync_at timestamptz,
  last_ok_at   timestamptz,
  last_status  text,
  last_error   text,
  updated_at   timestamptz not null default now()
);

create table if not exists public.portal_grades (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('item', 'midterm')),
  course_key    text not null,
  course_name   text not null,
  category      text not null default '',
  element       text not null,
  grade_text    text not null default '',
  score         numeric,
  total         numeric,
  lecturer      text not null default '',
  is_new        boolean not null default false,
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, kind, course_key, element)
);

create table if not exists public.portal_attendance (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  course_key    text not null,
  course_name   text not null,
  row_number    integer not null,
  status        text not null default '',
  session_desc  text not null default '',
  session_date  date,
  session_type  text not null default '',
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, course_key, row_number)
);

create table if not exists public.portal_absence_levels (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code    text not null,
  name    text not null default '',
  level   text not null default '',
  title   text not null default ''
);

create index if not exists portal_grades_user_idx on public.portal_grades (user_id);
create index if not exists portal_attendance_user_idx on public.portal_attendance (user_id);
create index if not exists portal_absence_levels_user_idx on public.portal_absence_levels (user_id);

-- ───────────── who can see what ─────────────
-- The app can only read your own rows. Only the server function writes them.
-- The password itself is never readable from the app.

alter table public.portal_accounts       enable row level security;
alter table public.portal_grades         enable row level security;
alter table public.portal_attendance     enable row level security;
alter table public.portal_absence_levels enable row level security;

revoke all on public.portal_accounts, public.portal_grades, public.portal_attendance, public.portal_absence_levels from anon;
revoke all on public.portal_accounts, public.portal_grades, public.portal_attendance, public.portal_absence_levels from authenticated;
grant select (user_id, username, last_sync_at, last_ok_at, last_status, last_error, updated_at) on public.portal_accounts to authenticated;
grant select on public.portal_grades, public.portal_attendance, public.portal_absence_levels to authenticated;
grant update (is_new) on public.portal_grades to authenticated;

drop policy if exists "own portal account" on public.portal_accounts;
create policy "own portal account" on public.portal_accounts
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "own portal grades" on public.portal_grades;
create policy "own portal grades" on public.portal_grades
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "mark own portal grades seen" on public.portal_grades;
create policy "mark own portal grades seen" on public.portal_grades
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own portal attendance" on public.portal_attendance;
create policy "own portal attendance" on public.portal_attendance
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "own portal absence levels" on public.portal_absence_levels;
create policy "own portal absence levels" on public.portal_absence_levels
  for select to authenticated using ((select auth.uid()) = user_id);

-- ───────────── password storage (Supabase Vault, encrypted) ─────────────

create extension if not exists supabase_vault with schema vault;

create or replace function public.portal_store_password(p_user uuid, p_username text, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_secret uuid;
begin
  select secret_id into v_secret from public.portal_accounts where user_id = p_user;
  if v_secret is null then
    v_secret := vault.create_secret(p_password, 'portal_pw_' || p_user::text, 'UniMate portal password');
    insert into public.portal_accounts (user_id, username, secret_id) values (p_user, p_username, v_secret);
  else
    perform vault.update_secret(v_secret, p_password);
    update public.portal_accounts
       set username = p_username, updated_at = now(), last_status = null, last_error = null
     where user_id = p_user;
  end if;
end $$;

create or replace function public.portal_get_password(p_user uuid)
returns text language sql security definer set search_path = '' as $$
  select s.decrypted_secret
    from public.portal_accounts a
    join vault.decrypted_secrets s on s.id = a.secret_id
   where a.user_id = p_user;
$$;

create or replace function public.portal_delete_account(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_secret uuid;
begin
  select secret_id into v_secret from public.portal_accounts where user_id = p_user;
  delete from public.portal_grades         where user_id = p_user;
  delete from public.portal_attendance     where user_id = p_user;
  delete from public.portal_absence_levels where user_id = p_user;
  delete from public.portal_accounts       where user_id = p_user;
  if v_secret is not null then
    delete from vault.secrets where id = v_secret;
  end if;
end $$;

create or replace function public.portal_cron_secret_ok(p_secret text)
returns boolean language sql security definer set search_path = '' as $$
  select coalesce(p_secret <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'portal_cron_secret' and decrypted_secret = p_secret
  ), false);
$$;

-- only the server function (service role) may call these
revoke all on function public.portal_store_password(uuid, text, text) from public, anon, authenticated;
revoke all on function public.portal_get_password(uuid)               from public, anon, authenticated;
revoke all on function public.portal_delete_account(uuid)             from public, anon, authenticated;
revoke all on function public.portal_cron_secret_ok(text)             from public, anon, authenticated;
grant execute on function public.portal_store_password(uuid, text, text) to service_role;
grant execute on function public.portal_get_password(uuid)               to service_role;
grant execute on function public.portal_delete_account(uuid)             to service_role;
grant execute on function public.portal_cron_secret_ok(text)             to service_role;

-- ───────────── hourly check ─────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'portal_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'portal_cron_secret', 'Lets the hourly timer call the portal-sync function');
  end if;
end $$;

select cron.unschedule(jobid) from cron.job where jobname in ('portal-sync-hourly', 'portal-sync-30min');

select cron.schedule(
  'portal-sync-30min',
  '*/30 * * * *',
  $cron$
  select net.http_post(
    url     := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/portal-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'portal_cron_secret')
    ),
    body    := '{"action":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);
