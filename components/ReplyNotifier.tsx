import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { LifeBuoy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isSupportOpen } from '../services/support';

/** A small banner inside the app when support answers one of your tickets. Tap it to read. */
const ReplyNotifier: React.FC<{ userId?: string; onOpen: () => void }> = ({ userId, onOpen }) => {
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`reply_notify_${userId}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback_replies' }, async (p: any) => {
        const r = p.new;
        if (!r?.is_admin || isSupportOpen()) return;
        // only replies on your own tickets (an admin account also sees everyone's)
        const { data } = await supabase.from('app_feedback').select('id').eq('id', r.feedback_id).eq('user_id', userId).maybeSingle();
        if (!data) return;
        const text = String(r.message || '').replace(/\s+/g, ' ').trim();
        toast.custom(t => (
          <button
            onClick={() => { toast.dismiss(t.id); onOpen(); }}
            className="flex w-[min(92vw,360px)] items-center gap-3 rounded-2xl border border-white/10 px-3.5 py-3 text-left"
            style={{ background: 'rgba(24,28,36,0.97)', color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.4)', opacity: t.visible ? 1 : 0, transform: t.visible ? 'none' : 'translateY(-10px)', transition: 'all .2s' }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-teal-500/20 text-teal-300"><LifeBuoy size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-extrabold">Support replied</span>
              <span className="block truncate text-[12.5px] text-white/60">{text.length > 70 ? text.slice(0, 67) + '…' : text}</span>
            </span>
          </button>
        ), { id: 'support-reply', duration: 7000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, onOpen]);
  return null;
};

export default ReplyNotifier;
