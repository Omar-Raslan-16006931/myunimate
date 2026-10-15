-- UniMate: GIU CMS (course files)
-- Run this once in Supabase > SQL Editor.
-- The server function fills these tables; the app can only read your own rows.

create table if not exists public.cms_courses (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   integer not null,          -- the id in the CMS link (?id=2620)
  season_id   integer not null,          -- the sid in the CMS link (?sid=70)
  season_title text not null default '',
  is_current  boolean not null default false,
  code        text not null default '',
  name        text not null default '',
  updated_at  timestamptz not null default now(),
  unique (user_id, course_id, season_id)
);

create table if not exists public.cms_files (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  course_id     integer not null,
  season_id     integer not null,
  content_id    integer not null,
  week_date     date,
  week_desc     text not null default '',
  position      integer not null default 0,
  title         text not null,
  file_type     text not null default '',
  path          text not null,
  is_new        boolean not null default true,   -- not opened in UniMate yet
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, content_id)
);

create index if not exists cms_courses_user_idx on public.cms_courses (user_id);
create index if not exists cms_files_user_course_idx on public.cms_files (user_id, course_id);

-- alerts for new CMS files are a separate switch from the grade alerts
alter table public.portal_accounts add column if not exists cms_notify boolean not null default false;
grant select (cms_notify) on public.portal_accounts to authenticated;

alter table public.cms_courses enable row level security;
alter table public.cms_files   enable row level security;

revoke all on public.cms_courses, public.cms_files from anon;
revoke all on public.cms_courses, public.cms_files from authenticated;
grant select on public.cms_courses, public.cms_files to authenticated;
grant update (is_new) on public.cms_files to authenticated;

drop policy if exists "own cms courses" on public.cms_courses;
create policy "own cms courses" on public.cms_courses for select to authenticated using (user_id = auth.uid());

drop policy if exists "own cms files" on public.cms_files;
create policy "own cms files" on public.cms_files for select to authenticated using (user_id = auth.uid());

drop policy if exists "mark own cms files seen" on public.cms_files;
create policy "mark own cms files seen" on public.cms_files for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
