-- Passkeys (sign in with Face ID / Touch ID / a security key)
-- Safe to run more than once. Run it in the Supabase SQL editor.
--
-- The app never writes to these tables directly. The "passkey" Edge Function
-- (service role) saves new passkeys and checks sign-ins. A signed-in user can only
-- SEE and DELETE their own passkeys.

create table if not exists public.passkeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,          -- base64url
  public_key    text not null,                 -- base64url (COSE key)
  counter       bigint not null default 0,
  transports    text[] not null default '{}',
  device_name   text not null default 'Passkey',
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists passkeys_user_idx on public.passkeys (user_id);

-- one-time challenges (a challenge works once and expires in 5 minutes)
create table if not exists public.passkey_challenges (
  id         uuid primary key default gen_random_uuid(),
  challenge  text not null,
  user_id    uuid,
  kind       text not null check (kind in ('register', 'login')),
  expires_at timestamptz not null default now() + interval '5 minutes'
);
create index if not exists passkey_challenges_exp_idx on public.passkey_challenges (expires_at);

alter table public.passkeys enable row level security;
alter table public.passkey_challenges enable row level security;

drop policy if exists "own passkeys: read" on public.passkeys;
create policy "own passkeys: read" on public.passkeys
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own passkeys: delete" on public.passkeys;
create policy "own passkeys: delete" on public.passkeys
  for delete to authenticated using (user_id = auth.uid());

-- nothing for anon, no insert/update for anyone but the service role
revoke all on public.passkeys from anon, authenticated;
grant select, delete on public.passkeys to authenticated;
revoke all on public.passkey_challenges from anon, authenticated;
grant all on public.passkeys, public.passkey_challenges to service_role;

-- never expose the public key / counter to the app: only the columns it needs
revoke select on public.passkeys from authenticated;
grant select (id, user_id, device_name, created_at, last_used_at) on public.passkeys to authenticated;

-- tidy up old challenges whenever a new one is made
create or replace function public.passkey_challenges_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.passkey_challenges where expires_at < now();
  return null;
end $$;
revoke all on function public.passkey_challenges_cleanup() from public, anon, authenticated;

drop trigger if exists passkey_challenges_cleanup_trg on public.passkey_challenges;
create trigger passkey_challenges_cleanup_trg after insert on public.passkey_challenges
  for each statement execute function public.passkey_challenges_cleanup();
