/**
 * The "What's new" popup. Shown once per phone, the first time someone opens
 * the app after `id` changes.
 *
 * To announce a new version: change `id` (any new string, a date works),
 * then edit `items`. Keep it to 2-4 short lines.
 * `icon` is one of the names in components/WhatsNew.tsx.
 */
export interface WhatsNewItem {
  icon: 'passkey' | 'alarm' | 'portal' | 'sparkle';
  title: string;
  text: string;
}

/** false: shows once per version (the id below). true: shows on every app open. */
export const WHATS_NEW_ALWAYS = false;

export const WHATS_NEW: { id: string; title: string; items: WhatsNewItem[] } = {
  id: '2026-10-15',
  title: "What's new",
  items: [
    { icon: 'sparkle', title: 'Smoother setup', text: 'Sign-up is one question per screen, with a tick after every step and roomier layouts.' },
    { icon: 'sparkle', title: 'New look', text: 'New default event colors, white text on your schedule, and soft fade-ins between pages.' },
    { icon: 'passkey', title: 'Sign in with Face ID', text: 'Add a passkey in Settings > Account and skip the password.' },
  ],
};
