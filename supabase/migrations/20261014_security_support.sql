-- ════════════════════════════════════════════════════════════════════════════
-- UniMate security lock-down + support tickets
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- What it does, in plain words:
--   1. Nobody can make themselves admin, unban themselves, give themselves Pro
--      or change wallet money from the app. Only you (SQL editor / server) can.
--   2. People can only see their OWN profile. Admins can see everyone.
--      (Usernames are checked with a small function instead.)
--   3. Support tickets: you only see your own tickets and replies. Only real
--      admins can post as "Support". Messages have a length limit and a speed
--      limit, and suspended accounts can't post.
--   4. Referral codes are switched off for everyone except admins.
--   5. Every public table must have Row Level Security on (list printed at the end).
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── who is calling ──────────────────────────────────────────────────────────
-- the role inside the caller's login token: 'authenticated', 'anon', 'service_role',
-- or '' when the change comes from the SQL editor / Supabase itself
create or replace function public.request_role() returns text
language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '')
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

create or replace function public.is_suspended(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_banned and (p.banned_until is null or p.banned_until > now())
                   from public.profiles p where p.id = p_user), false)
$$;
revoke all on function public.is_suspended(uuid) from public, anon, authenticated;
grant execute on function public.is_suspended(uuid) to service_role;

-- ── 1. profiles: lock the fields only you may change ─────────────────────────
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  locked text[] := array['is_admin','is_banned','banned_until','subscription_tier','wallet_balance','referred_by','email'];
  k text;
  src jsonb;
  patch jsonb := '{}'::jsonb;
  caller text := public.request_role();
begin
  if tg_op = 'INSERT' then
    -- a new profile always starts as a normal free account, whatever the sign-up form sent
    if caller = 'service_role' then return new; end if;
    src := to_jsonb(new);
    if src ? 'is_admin'          then patch := patch || '{"is_admin": false}'; end if;
    if src ? 'is_banned'         then patch := patch || '{"is_banned": false}'; end if;
    if src ? 'banned_until'      then patch := patch || '{"banned_until": null}'; end if;
    if src ? 'subscription_tier' then patch := patch || '{"subscription_tier": 0}'; end if;
    if src ? 'wallet_balance'    then patch := patch || '{"wallet_balance": 0}'; end if;
    if src ? 'referred_by'       then patch := patch || '{"referred_by": null}'; end if;
    if src ? 'email' then
      patch := patch || jsonb_build_object('email', (select u.email from auth.users u where u.id = new.id));
    end if;
    return jsonb_populate_record(new, patch);
  end if;

  -- UPDATE: only signed-in app users are limited; SQL editor, server code and admins are not
  if caller <> 'authenticated' or public.is_admin() then return new; end if;
  src := to_jsonb(old);
  foreach k in array locked loop
    if src ? k then patch := patch || jsonb_build_object(k, src -> k); end if;
  end loop;
  new := jsonb_populate_record(new, patch);
  new.id := old.id;
  return new;
end $$;

drop trigger if exists protect_profile on public.profiles;
create trigger protect_profile before insert or update on public.profiles
  for each row execute function public.protect_profile();

-- usernames are checked here, so other people's profiles never need to be readable
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select char_length(trim(p_username)) between 4 and 30
     and not exists (
       select 1 from public.profiles p
       where lower(p.username) = lower(trim(p_username))
         and p.id is distinct from auth.uid()
     )
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ── fresh, simple rules for the sensitive tables ─────────────────────────────
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','app_feedback','feedback_replies','referral_codes','wallet_ledger')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "profiles: read own (admins read all)" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: create own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles: update own (admins update all)" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "profiles: only admins delete" on public.profiles
  for delete to authenticated using (public.is_admin());

-- ── 3. support tickets ───────────────────────────────────────────────────────
alter table public.app_feedback enable row level security;
alter table public.feedback_replies enable row level security;

alter table public.app_feedback alter column created_at set default now();
alter table public.feedback_replies alter column created_at set default now();

-- length limits (old rows are left as they are)
alter table public.app_feedback drop constraint if exists app_feedback_message_len;
alter table public.app_feedback add constraint app_feedback_message_len
  check (char_length(btrim(message)) between 1 and 2000) not valid;
alter table public.feedback_replies drop constraint if exists feedback_replies_message_len;
alter table public.feedback_replies add constraint feedback_replies_message_len
  check (char_length(btrim(message)) between 1 and 2000) not valid;

create index if not exists app_feedback_user_created_idx on public.app_feedback (user_id, created_at desc);
create index if not exists feedback_replies_ticket_created_idx on public.feedback_replies (feedback_id, created_at);

create policy "tickets: read own (admins read all)" on public.app_feedback
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "tickets: create own" on public.app_feedback
  for insert to authenticated with check (user_id = auth.uid());
create policy "tickets: admins update" on public.app_feedback
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "tickets: admins delete" on public.app_feedback
  for delete to authenticated using (public.is_admin());

create policy "replies: read on own tickets (admins read all)" on public.feedback_replies
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.app_feedback f where f.id = feedback_id and f.user_id = auth.uid())
  );
create policy "replies: write on own tickets (admins on any)" on public.feedback_replies
  for insert to authenticated with check (
    sender_id = auth.uid()
    and (public.is_admin()
         or exists (select 1 from public.app_feedback f where f.id = feedback_id and f.user_id = auth.uid()))
  );
create policy "replies: admins update" on public.feedback_replies
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "replies: admins delete" on public.feedback_replies
  for delete to authenticated using (public.is_admin());

-- new ticket: the server fills in who/when/status, checks limits
create or replace function public.ticket_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  src jsonb;
  patch jsonb;
begin
  if public.request_role() <> 'authenticated' then return new; end if;
  if public.is_suspended(auth.uid()) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = 'P0001';
  end if;
  if not public.is_admin() and (
    select count(*) from public.app_feedback f
    where f.user_id = auth.uid() and f.created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'TOO_MANY_TICKETS' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(new.message, ''))) not between 1 and 2000 then
    raise exception 'MESSAGE_LENGTH' using errcode = 'P0001';
  end if;

  src := to_jsonb(new);
  patch := jsonb_build_object('user_id', auth.uid(), 'status', 'unread', 'created_at', now(), 'message', btrim(new.message));
  if src ? 'category' and coalesce(new.category, '') not in ('Bug', 'Feature Request', 'Other') then
    patch := patch || '{"category": "Other"}';
  end if;
  if src ? 'admin_reply'    then patch := patch || '{"admin_reply": null}'; end if;
  if src ? 'admin_reply_at' then patch := patch || '{"admin_reply_at": null}'; end if;
  if src ? 'username' then
    patch := patch || jsonb_build_object('username', (select p.username from public.profiles p where p.id = auth.uid()));
  end if;
  return jsonb_populate_record(new, patch);
end $$;

drop trigger if exists ticket_before_insert on public.app_feedback;
create trigger ticket_before_insert before insert on public.app_feedback
  for each row execute function public.ticket_before_insert();

-- new reply: the server decides if it is Support, checks limits
create or replace function public.reply_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare admin boolean;
begin
  if public.request_role() <> 'authenticated' then return new; end if;
  admin := public.is_admin();
  if not admin and public.is_suspended(auth.uid()) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = 'P0001';
  end if;
  if not admin and (
    select count(*) from public.feedback_replies r
    where r.sender_id = auth.uid() and r.created_at > now() - interval '10 minutes'
  ) >= 20 then
    raise exception 'TOO_MANY_MESSAGES' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(new.message, ''))) not between 1 and 2000 then
    raise exception 'MESSAGE_LENGTH' using errcode = 'P0001';
  end if;
  new.sender_id := auth.uid();
  new.is_admin := admin;
  new.message := btrim(new.message);
  new.created_at := now();
  return new;
end $$;

drop trigger if exists reply_before_insert on public.feedback_replies;
create trigger reply_before_insert before insert on public.feedback_replies
  for each row execute function public.reply_before_insert();

-- after a reply: the ticket goes to "unread" for you when the student writes,
-- and to "read" when Support answers
create or replace function public.reply_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.app_feedback
     set status = case when new.is_admin then 'read' else 'unread' end
   where id = new.feedback_id;
  return null;
end $$;

drop trigger if exists reply_after_insert on public.feedback_replies;
create trigger reply_after_insert after insert on public.feedback_replies
  for each row execute function public.reply_after_insert();

-- live updates for tickets and replies
do $$
begin
  begin alter publication supabase_realtime add table public.app_feedback; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.feedback_replies; exception when duplicate_object then null; when undefined_object then null; end;
end $$;

-- ── 4. referrals off; wallet is read-only ────────────────────────────────────
do $$
begin
  if to_regclass('public.referral_codes') is not null then
    execute 'alter table public.referral_codes enable row level security';
    execute 'create policy "referral codes: admins only" on public.referral_codes for all to authenticated using (public.is_admin()) with check (public.is_admin())';
  end if;
  if to_regclass('public.wallet_ledger') is not null then
    execute 'alter table public.wallet_ledger enable row level security';
    execute 'create policy "wallet: read own" on public.wallet_ledger for select to authenticated using (user_id = auth.uid())';
  end if;
end $$;

do $$
declare f record;
begin
  -- the old referral counter could be called by anyone
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'increment_referral_usage'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- the helpers above are for the database only
revoke all on function public.protect_profile() from public, anon, authenticated;
revoke all on function public.ticket_before_insert() from public, anon, authenticated;
revoke all on function public.reply_before_insert() from public, anon, authenticated;
revoke all on function public.reply_after_insert() from public, anon, authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════════════
-- CHECK: anything listed here is NOT protected. Send me the result if it's not empty.
-- ════════════════════════════════════════════════════════════════════════════
select 'table without RLS' as problem, c.relname as name
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
union all
select 'RLS on but no rules (app cannot use it)', c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
  and c.relname not like 'portal\_%'
union all
select 'anyone can call this server function', p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and has_function_privilege('anon', p.oid, 'execute')
  and p.proname not in ('username_available')
order by 1, 2;
