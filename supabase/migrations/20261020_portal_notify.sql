-- UniMate: separate switch for grade / absence / exam-seat alerts
-- Run this once in Supabase > SQL Editor.
-- Phone alerts now have three switches (grades, class reminders, new CMS files);
-- the ntfy channel is only used when at least one of them is on.

alter table public.portal_accounts add column if not exists portal_notify boolean not null default true;
grant select (portal_notify) on public.portal_accounts to authenticated;
