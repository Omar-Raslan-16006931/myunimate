import { supabase } from '../lib/supabase';

// Admin actions on accounts. The database only lets real admins do these (RLS + trigger).

export type BanDuration = '1d' | '3d' | '1w' | '1m' | 'perm';
export const BAN_OPTIONS: { key: BanDuration; label: string }[] = [
  { key: '1d', label: '1 day' }, { key: '3d', label: '3 days' }, { key: '1w', label: '1 week' },
  { key: '1m', label: '1 month' }, { key: 'perm', label: 'Forever' },
];
export const MAX_REASON = 500;
export const MIN_REASON = 3;

export interface AdminUser {
  id: string; username: string | null; email: string | null;
  created_at: string | null; updated_at: string | null; college: string | null; is_admin?: boolean;
  is_banned: boolean; banned_until: string | null; ban_reason: string | null; banned_at: string | null;
}

export const USER_COLUMNS = 'id, username, email, created_at, updated_at, college, is_admin, is_banned, banned_until, ban_reason, banned_at';

/** True while the suspension is still running (a permanent ban has no end date). */
export const banActive = (u: Pick<AdminUser, 'is_banned' | 'banned_until'>) =>
  !!u.is_banned && (!u.banned_until || new Date(u.banned_until) > new Date());

export const banUntil = (d: BanDuration): string | null => {
  if (d === 'perm') return null;
  const t = new Date();
  if (d === '1d') t.setDate(t.getDate() + 1);
  if (d === '3d') t.setDate(t.getDate() + 3);
  if (d === '1w') t.setDate(t.getDate() + 7);
  if (d === '1m') t.setMonth(t.getMonth() + 1);
  return t.toISOString();
};

export const banUser = async (id: string, d: BanDuration, reason: string) => {
  const patch = { is_banned: true, banned_until: banUntil(d), ban_reason: reason.trim().slice(0, MAX_REASON), banned_at: new Date().toISOString() };
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  return error ? null : patch;
};

export const unbanUser = async (id: string) => {
  const patch = { is_banned: false, banned_until: null, ban_reason: null, banned_at: null };
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  return error ? null : patch;
};

export const deleteUserRow = async (id: string) => {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  return !error;
};

export const niceDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
