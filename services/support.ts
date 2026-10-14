import { supabase } from '../lib/supabase';
import { AppFeedback, FeedbackReply } from '../types';

// Support tickets: a ticket is one row in app_feedback (its first message),
// and the conversation after that lives in feedback_replies.
// The database decides who is support (is_admin) and keeps the ticket status
// up to date, so the app never sets those itself.

export const MAX_MESSAGE = 2000;
export const MIN_TICKET = 10;

export type TicketKind = AppFeedback['category'];

export interface TicketSummary extends AppFeedback {
  lastMessage: string;
  lastAt: string;
  lastFromSupport: boolean;
  replyCount: number;
}

/** Short code people can quote, e.g. #3F9A */
export const ticketCode = (id: string) => '#' + id.replace(/-/g, '').slice(0, 4).toUpperCase();

/** First line of the message, used as the ticket title. */
export const ticketTitle = (message: string) => {
  const line = message.trim().split('\n')[0].trim();
  return line.length > 80 ? line.slice(0, 77).trimEnd() + '…' : line;
};

/** Turns database errors into words people understand. */
export const friendlyError = (err: unknown): string => {
  const msg = String((err as any)?.message || err || '');
  if (msg.includes('TOO_MANY_TICKETS')) return 'You sent a lot of tickets today. Reply in one of your open tickets instead.';
  if (msg.includes('TOO_MANY_MESSAGES')) return 'Slow down a little, then try again in a few minutes.';
  if (msg.includes('ACCOUNT_SUSPENDED')) return 'Your account is suspended, so you can’t send messages right now.';
  if (msg.includes('MESSAGE_LENGTH')) return `Messages can be up to ${MAX_MESSAGE} characters.`;
  if (/fetch|network|Failed to fetch|offline/i.test(msg)) return 'No connection. Check your internet and try again.';
  return 'Something went wrong. Please try again.';
};

const clean = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim().slice(0, MAX_MESSAGE);

export const listTickets = async (userId: string): Promise<TicketSummary[]> => {
  const { data: tickets, error } = await supabase
    .from('app_feedback')
    .select('id, user_id, message, category, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  const rows = (tickets || []) as AppFeedback[];
  if (!rows.length) return [];

  const { data: replies } = await supabase
    .from('feedback_replies')
    .select('id, feedback_id, is_admin, message, created_at')
    .in('feedback_id', rows.map(t => t.id))
    .order('created_at', { ascending: true });

  const byTicket = new Map<string, FeedbackReply[]>();
  for (const r of (replies || []) as FeedbackReply[]) {
    const list = byTicket.get(r.feedback_id) || [];
    list.push(r);
    byTicket.set(r.feedback_id, list);
  }
  return rows
    .map(t => summarize(t, byTicket.get(t.id) || []))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
};

export const summarize = (t: AppFeedback, replies: FeedbackReply[]): TicketSummary => {
  const last = replies[replies.length - 1];
  return {
    ...t,
    lastMessage: last ? last.message : t.message,
    lastAt: last ? last.created_at : t.created_at,
    lastFromSupport: !!last?.is_admin,
    replyCount: replies.length,
  };
};

export const getReplies = async (ticketId: string): Promise<FeedbackReply[]> => {
  const { data, error } = await supabase
    .from('feedback_replies')
    .select('id, feedback_id, sender_id, is_admin, message, created_at')
    .eq('feedback_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as FeedbackReply[];
};

export const createTicket = async (userId: string, category: TicketKind, message: string): Promise<AppFeedback> => {
  const { data, error } = await supabase
    .from('app_feedback')
    .insert({ user_id: userId, category, message: clean(message), status: 'unread' })
    .select('id, user_id, message, category, status, created_at')
    .single();
  if (error) throw error;
  return data as AppFeedback;
};

export const sendReply = async (userId: string, ticketId: string, message: string): Promise<FeedbackReply> => {
  const { data, error } = await supabase
    .from('feedback_replies')
    .insert({ feedback_id: ticketId, sender_id: userId, message: clean(message) })
    .select('id, feedback_id, sender_id, is_admin, message, created_at')
    .single();
  if (error) throw error;
  return data as FeedbackReply;
};

// ── "new reply" dots: when did I last open each ticket (kept on this device) ──
const seenKey = (userId: string) => `support_seen_v1_${userId}`;

export const readSeen = (userId: string): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(seenKey(userId)) || '{}'); } catch { return {}; }
};

export const markSeen = (userId: string, ticketId: string, at = new Date().toISOString()) => {
  try {
    const seen = readSeen(userId);
    if ((seen[ticketId] || '') >= at) return;
    seen[ticketId] = at;
    localStorage.setItem(seenKey(userId), JSON.stringify(seen));
  } catch { /* private mode */ }
};

export const hasNewReply = (t: TicketSummary, seen: Record<string, string>) =>
  t.lastFromSupport && (seen[t.id] || '') < t.lastAt;

// Is the Support sheet on screen right now? (so a reply doesn't also pop up a banner)
let supportOnScreen = false;
export const setSupportOpen = (open: boolean) => { supportOnScreen = open; };
export const isSupportOpen = () => supportOnScreen;
