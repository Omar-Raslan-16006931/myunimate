-- Portal passwords locked with a key that only lives in the portal-sync Edge Function
-- (secret PORTAL_KEY). The database only ever sees scrambled text in password_enc.
-- Old Vault passwords move over automatically the next time each account syncs.

alter table public.portal_accounts add column if not exists password_enc text;
alter table public.portal_accounts alter column secret_id drop not null;
-- (password_enc is NOT granted to authenticated: column grants on this table are explicit)

-- every alert topic is unique
create unique index if not exists portal_accounts_notify_topic_uniq
  on public.portal_accounts (notify_topic) where notify_topic is not null;

-- removes the old Vault copy once the password is stored with PORTAL_KEY
create or replace function public.portal_clear_vault(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_secret uuid;
begin
  select secret_id into v_secret from public.portal_accounts where user_id = p_user;
  if v_secret is not null then
    update public.portal_accounts set secret_id = null where user_id = p_user;
    delete from vault.secrets where id = v_secret;
  end if;
end $$;

-- fallback path (no PORTAL_KEY set): also works when the row already exists without a Vault secret
create or replace function public.portal_store_password(p_user uuid, p_username text, p_password text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_secret uuid;
begin
  select secret_id into v_secret from public.portal_accounts where user_id = p_user;
  if v_secret is null then
    v_secret := vault.create_secret(p_password, 'portal_pw_' || p_user::text || '_' || extract(epoch from now())::bigint, 'UniMate portal password');
    insert into public.portal_accounts (user_id, username, secret_id) values (p_user, p_username, v_secret)
    on conflict (user_id) do update
      set username = excluded.username, secret_id = excluded.secret_id, password_enc = null,
          updated_at = now(), last_status = null, last_error = null;
  else
    perform vault.update_secret(v_secret, p_password);
    update public.portal_accounts
       set username = p_username, password_enc = null, updated_at = now(), last_status = null, last_error = null
     where user_id = p_user;
  end if;
end $$;

revoke all on function public.portal_clear_vault(uuid) from public, anon, authenticated;
grant execute on function public.portal_clear_vault(uuid) to service_role;
