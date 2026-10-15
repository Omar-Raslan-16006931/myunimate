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
  id: '2026-10-15-cms',
  title: "What's new",
  items: [
    { icon: 'portal', title: 'CMS in Materials', text: 'Open your GIU course files right in the app. Same login as the portal, newest season first.' },
    { icon: 'alarm', title: 'New file alerts', text: 'Get a ping when a teacher adds a file. Turn it on in Settings > Portal.' },
    { icon: 'sparkle', title: 'Smoother everything', text: 'Smooth expand and collapse, periods 6 and 7, better event colors.' },
  ],
};
