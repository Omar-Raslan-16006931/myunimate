-- UniMate: phone alerts (ntfy) for new grades, attendance and exam seats
-- Run this once in Supabase > SQL Editor.

alter table public.portal_accounts add column if not exists notify_topic text;

-- the app may read the topic to show it to you; only the server can change it
grant select (notify_topic) on public.portal_accounts to authenticated;
