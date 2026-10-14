-- Passkey handoff: lets the sideloaded iPhone app use passkeys through an
-- in-app Safari sheet (iOS blocks passkeys inside a sideloaded app itself).
-- Safe to run more than once. Run it in the Supabase SQL editor.
--
-- A handoff is one short-lived, one-time row. Only the "passkey" Edge Function
-- (service role) can touch it. The app never reads or writes it directly.

create table if not exists public.passkey_handoffs (
  id            uuid primary key default gen_random_uuid(),   -- random, goes in the Safari link
  kind          text not null check (kind in ('login', 'register')),
  user_id       uuid references auth.users(id) on delete cascade,  -- register: who is adding the passkey
  claim_hash    text,                                          -- login: sha256 of a secret only the app knows
  code          text not null,                                 -- 3 digits shown in both places, to compare
  access_token  text,                                          -- login: filled in once Face ID succeeds
  refresh_token text,
  expires_at    timestamptz not null default now() + interval '5 minutes'
);
create index if not exists passkey_handoffs_exp_idx on public.passkey_handoffs (expires_at);

alter table public.passkey_handoffs enable row level security;
revoke all on public.passkey_handoffs from anon, authenticated;
grant all on public.passkey_handoffs to service_role;

-- tidy up old rows (and any unclaimed tokens) whenever a new one is made
create or replace function public.passkey_handoffs_cleanup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.passkey_handoffs where expires_at < now();
  return null;
end $$;
revoke all on function public.passkey_handoffs_cleanup() from public, anon, authenticated;

drop trigger if exists passkey_handoffs_cleanup_trg on public.passkey_handoffs;
create trigger passkey_handoffs_cleanup_trg after insert on public.passkey_handoffs
  for each statement execute function public.passkey_handoffs_cleanup();
