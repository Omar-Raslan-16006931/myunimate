-- Ban reason: admins can write why an account was suspended, and the person sees it.
-- Safe to run more than once. Run it in the Supabase SQL editor (after 20261014).

alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_at timestamptz;

-- the reason can't be longer than 500 characters
alter table public.profiles drop constraint if exists profiles_ban_reason_len;
alter table public.profiles add constraint profiles_ban_reason_len check (ban_reason is null or char_length(ban_reason) <= 500);

-- same protection as before, now also covering the two new columns:
-- only admins (or the SQL editor) can change them, never the person themselves
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  locked text[] := array['is_admin','is_banned','banned_until','subscription_tier','wallet_balance','referred_by','email','ban_reason','banned_at'];
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
    if src ? 'ban_reason'        then patch := patch || '{"ban_reason": null}'; end if;
    if src ? 'banned_at'         then patch := patch || '{"banned_at": null}'; end if;
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
