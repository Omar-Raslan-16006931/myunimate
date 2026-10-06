-- Migration: Add portal_exam_seats table
-- Run this in Supabase SQL editor if not already run.

create table if not exists public.portal_exam_seats (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  course_key       text not null,
  course_name      text not null,
  exam_day         text not null default '',
  exam_date        date,
  start_time       text not null default '',
  end_time         text not null default '',
  duration_minutes integer not null default 60,
  hall             text not null default '',
  seat             text not null default '',
  exam_type        text not null default '',
  updated_at       timestamptz not null default now()
);

create index if not exists portal_exam_seats_user_idx on public.portal_exam_seats (user_id);

alter table public.portal_exam_seats enable row level security;

revoke all on public.portal_exam_seats from anon;
revoke all on public.portal_exam_seats from authenticated;
grant select on public.portal_exam_seats to authenticated;

drop policy if exists "own portal exam seats" on public.portal_exam_seats;
create policy "own portal exam seats" on public.portal_exam_seats
  for select to authenticated using ((select auth.uid()) = user_id);
