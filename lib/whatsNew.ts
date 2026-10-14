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

export const WHATS_NEW: { id: string; title: string; items: WhatsNewItem[] } = {
  id: '2026-10-14',
  title: "What's new",
  items: [
    { icon: 'passkey', title: 'Sign in with Face ID', text: 'Add a passkey in Settings > Account and skip the password.' },
    { icon: 'alarm', title: 'Class reminders on your phone', text: 'Get a ping 15 minutes before each class. Turn it on in Uni Portal.' },
    { icon: 'portal', title: 'Cleaner Uni Portal card', text: 'Check now, phone alerts and reminders, all in one box.' },
  ],
};
