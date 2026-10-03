
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AppFeedback, FeedbackReply } from '../types';
import {
  Check, User, Loader2, Inbox, RefreshCw, Trash2, Send,
  AlertTriangle, Search, ChevronLeft, Sparkles, Copy,
} from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN  = '#8CE3B7';
const HL_BLUE   = '#9ECFFF';
const HL_RED    = '#E56A5A';
const HL_ORANGE = '#F4BE8A';

/** Category pill colours */
const categoryStyle = (cat: string): React.CSSProperties => {
  if (cat === 'Bug') return { color: HL_RED, background: `${HL_RED}22`, border: `1px solid ${HL_RED}` };
  if (cat === 'Feature Request') return { color: '#1a6e4c', background: `${HL_GREEN}55`, border: `1px solid ${HL_GREEN}` };
  return { color: '#174a6e', background: `${HL_BLUE}55`, border: `1px solid ${HL_BLUE}` };
};

const AdminInbox: React.FC = () => {
  const [feedbackItems, setFeedbackItems] = useState<AppFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AppFeedback | null>(null);
  const [replies, setReplies] = useState<FeedbackReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const replyEndRef = useRef<HTMLDivElement>(null);

  // Check if user is admin before showing admin panel
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsAuthorized(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();

        setIsAuthorized(!!profile?.is_admin);
      } catch (err) {
        console.error('Admin check failed:', err);
        setIsAuthorized(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Fetch feedback only if authorized
  const fetchFeedback = async () => {
    if (!isAuthorized) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackItems(data || []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchFeedback();
    }
  }, [isAuthorized]);

  // Fetch replies when message selected
  useEffect(() => {
    if (selectedMessage) {
      setReplies([]);
      const fetchReplies = async () => {
        const { data } = await supabase
          .from('feedback_replies')
          .select('*')
          .eq('feedback_id', selectedMessage.id)
          .order('created_at', { ascending: true });
        if (data) setReplies(data);
      };
      fetchReplies();

      const channel = supabase
        .channel('admin_feedback_chat')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'feedback_replies',
            filter: `feedback_id=eq.${selectedMessage.id}`,
          },
          (payload: any) => {
            setReplies(prev => [...prev, payload.new as FeedbackReply]);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedMessage]);

  useEffect(() => {
    if (selectedMessage) {
      setTimeout(() => {
        replyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [replies, selectedMessage]);

  const markAsRead = async (id: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'read' ? 'unread' : 'read';

    // Optimistic Update
    setFeedbackItems(prev =>
      prev.map(item => (item.id === id ? { ...item, status: newStatus as 'read' | 'unread' } : item)),
    );
    if (selectedMessage?.id === id) {
      setSelectedMessage(prev => (prev ? { ...prev, status: newStatus as 'read' | 'unread' } : null));
    }

    try {
      await supabase.from('app_feedback').update({ status: newStatus }).eq('id', id);
    } catch (err: any) {
      console.error('Error updating status:', err);
      fetchFeedback(); // Revert on error
    }
  };

  const deleteMessage = async (id: string) => {
    setFeedbackItems(prev => prev.filter(item => item.id !== id));
    setIsDeleteConfirmOpen(false);
    if (selectedMessage?.id === id) setSelectedMessage(null);

    try {
      const { error } = await supabase.from('app_feedback').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting message:', err);
      console.error(`Failed to delete: ${err.message}`);
      fetchFeedback();
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setIsSendingReply(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // NOTE: is_admin status is now determined server-side via RLS policies
      // The client MUST NOT set is_admin flag - backend verifies admin status
      const { error } = await supabase.from('feedback_replies').insert({
        feedback_id: selectedMessage.id,
        sender_id: session.user.id,
        message: replyText.trim(),
        // is_admin flag is set by database trigger or backend function
      });

      if (error) throw error;

      // Mark parent as read when replying
      if (selectedMessage.status === 'unread') {
        markAsRead(selectedMessage.id, 'unread');
      }

      setReplyText('');
    } catch (err: any) {
      console.error('Error sending reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const filteredItems = feedbackItems.filter(item => {
    if (filter === 'unread') return item.status === 'unread';
    return true;
  });

  const isEmpty = feedbackItems.length === 0 && !loading;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: CARD_BG,
        border: `1.5px solid ${INK}`,
        borderRadius: 14,
        boxShadow: `4px 5px 0 ${INK}`,
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.5s ease-in-out',
        height: isEmpty ? 220 : 450,
      }}
    >
      {/* ─── Top Bar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: CARD_BG,
          borderBottom: `1.5px solid ${INK}`,
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        {/* Left: icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: filter === 'unread' ? INK : `rgba(26,23,48,0.07)`,
              border: `1.5px solid ${INK}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: filter === 'unread' ? HL_YELLOW : INK,
              transition: 'all 0.2s',
            }}
          >
            {filter === 'unread' ? <AlertTriangle size={14} /> : <Inbox size={14} />}
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 700,
                fontSize: '0.88rem',
                color: INK,
                margin: 0,
              }}
            >
              Inbox
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: HL_GREEN,
                  display: 'inline-block',
                  border: `1px solid ${INK}`,
                }}
              />
              <span
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: '0.65rem',
                  color: `rgba(26,23,48,0.5)`,
                  fontWeight: 600,
                }}
              >
                Live Support
              </span>
            </div>
          </div>
        </div>

        {/* Right: filter pills + refresh */}
        <div
          style={{
            display: 'flex',
            background: `rgba(26,23,48,0.06)`,
            border: `1.5px solid ${INK}`,
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: "'Instrument Sans', sans-serif",
              background: filter === 'all' ? INK : 'transparent',
              color: filter === 'all' ? '#fff' : `rgba(26,23,48,0.5)`,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: "'Instrument Sans', sans-serif",
              background: filter === 'unread' ? INK : 'transparent',
              color: filter === 'unread' ? HL_YELLOW : `rgba(26,23,48,0.5)`,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Unread
          </button>
          <button
            onClick={fetchFeedback}
            disabled={loading}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: 'none',
              borderLeft: `1.5px solid ${INK}`,
              cursor: 'pointer',
              color: `rgba(26,23,48,0.45)`,
              display: 'flex',
              alignItems: 'center',
              marginLeft: 2,
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Body ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── Left sidebar: ticket list ───────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '100%',
            background: CARD_BG,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            borderRight: `1.5px solid ${INK}`,
            transform: selectedMessage ? 'translateX(-100%)' : 'translateX(0)',
            transition: 'transform 0.3s ease',
          }}
          className="md:relative md:w-80 md:translate-x-0"
        >
          {/* Search */}
          <div style={{ padding: '10px 10px 6px' }}>
            <div style={{ position: 'relative' }}>
              <Search
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `rgba(26,23,48,0.3)` }}
                size={12}
              />
              <input
                type="text"
                placeholder="Search tickets..."
                style={{
                  width: '100%',
                  background: `rgba(26,23,48,0.06)`,
                  border: `1.5px solid ${INK}`,
                  borderRadius: 8,
                  padding: '8px 10px 8px 30px',
                  fontSize: '0.78rem',
                  color: INK,
                  fontFamily: "'Instrument Sans', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* List */}
          <div
            style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}
            className="custom-scrollbar"
          >
            {loading && feedbackItems.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10 }}>
                <Loader2 style={{ color: INK }} size={24} className="animate-spin" />
                <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.78rem', color: `rgba(26,23,48,0.4)` }}>
                  Syncing...
                </span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingBottom: 40 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    background: `rgba(26,23,48,0.06)`,
                    border: `1.5px solid ${INK}`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Sparkles size={22} color={`rgba(26,23,48,0.35)`} />
                </div>
                <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.78rem', color: `rgba(26,23,48,0.4)`, fontWeight: 600 }}>
                  All caught up!
                </span>
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedMessage?.id === item.id;
                const isUnread = item.status === 'unread';

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedMessage(item)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 10px',
                      borderRadius: 8,
                      border: 'none',
                      borderBottom: `1.5px solid ${INK}`,
                      background: isSelected ? `${HL_YELLOW}55` : CARD_BG,
                      cursor: 'pointer',
                      marginBottom: 2,
                      transition: 'background 0.15s',
                      display: 'block',
                    }}
                  >
                    {/* Row 1: category + date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isUnread && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: INK,
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            ...categoryStyle(item.category),
                            fontFamily: "'Instrument Sans', sans-serif",
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: `rgba(26,23,48,0.4)` }}>
                        {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {/* Row 2: message preview */}
                    <p
                      style={{
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: '0.78rem',
                        color: isUnread ? INK : `rgba(26,23,48,0.6)`,
                        fontWeight: isUnread ? 600 : 400,
                        margin: '0 0 6px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.message}
                    </p>

                    {/* Row 3: user */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: `rgba(26,23,48,0.1)`,
                          border: `1px solid ${INK}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <User size={8} color={INK} />
                      </div>
                      <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.65rem', color: `rgba(26,23,48,0.4)` }}>
                        {item.username || 'User'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel: chat view ──────────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            background: CARD_BG,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 20,
            transform: selectedMessage ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease',
          }}
          className="md:relative md:translate-x-0"
        >
          {selectedMessage ? (
            <>
              {/* Chat header */}
              <div
                style={{
                  minHeight: 60,
                  padding: '10px 14px',
                  borderBottom: `1.5px solid ${INK}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  background: CARD_BG,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  {/* Back (mobile) */}
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="md:hidden"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `rgba(26,23,48,0.07)`,
                      border: `1.5px solid ${INK}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: INK,
                      flexShrink: 0,
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h1
                        style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: INK,
                          margin: 0,
                        }}
                      >
                        {selectedMessage.username || 'Unknown User'}
                      </h1>
                      {selectedMessage.status === 'unread' && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: INK,
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                      onClick={() => navigator.clipboard.writeText(selectedMessage.user_id)}
                    >
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', color: `rgba(26,23,48,0.4)` }}>
                        ID: {selectedMessage.user_id}
                      </span>
                      <Copy size={9} color={`rgba(26,23,48,0.3)`} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => markAsRead(selectedMessage.id, selectedMessage.status)}
                    title={selectedMessage.status === 'unread' ? 'Mark Read' : 'Mark Unread'}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: `1.5px solid ${INK}`,
                      background: selectedMessage.status === 'read' ? `${HL_GREEN}66` : `rgba(26,23,48,0.07)`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: INK,
                    }}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: `1.5px solid ${INK}`,
                      background: `rgba(26,23,48,0.07)`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: HL_RED,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                style={{ flex: 1, overflowY: 'auto', padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}
                className="custom-scrollbar"
              >
                {/* Original ticket bubble */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: `rgba(26,23,48,0.07)`,
                      border: `1.5px solid ${INK}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User size={13} color={INK} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '85%' }}>
                    <div
                      style={{
                        background: `${HL_BLUE}44`,
                        border: `1.5px solid ${INK}`,
                        borderRadius: '0 10px 10px 10px',
                        padding: '10px 12px',
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: '0.82rem',
                        color: INK,
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedMessage.message}
                    </div>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: `rgba(26,23,48,0.35)`, marginTop: 4, paddingLeft: 2 }}>
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Thread replies */}
                {replies.map(reply => (
                  <div
                    key={reply.id}
                    style={{ display: 'flex', gap: 10, flexDirection: reply.is_admin ? 'row-reverse' : 'row' }}
                    className="animate-in slide-in-from-bottom-2"
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        border: `1.5px solid ${INK}`,
                        background: reply.is_admin ? INK : `rgba(26,23,48,0.07)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {reply.is_admin ? <Send size={11} color={HL_YELLOW} /> : <User size={13} color={INK} />}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        maxWidth: '85%',
                        alignItems: reply.is_admin ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: reply.is_admin ? '10px 0 10px 10px' : '0 10px 10px 10px',
                          border: `1.5px solid ${INK}`,
                          background: reply.is_admin ? INK : `${HL_YELLOW}55`,
                          fontFamily: "'Instrument Sans', sans-serif",
                          fontSize: '0.82rem',
                          color: reply.is_admin ? '#fff' : INK,
                          lineHeight: 1.5,
                        }}
                      >
                        {reply.message}
                      </div>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: `rgba(26,23,48,0.35)`, marginTop: 4, paddingLeft: 2 }}>
                        {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={replyEndRef} />
              </div>

              {/* Reply input */}
              <div
                style={{
                  padding: '10px 10px',
                  borderTop: `1.5px solid ${INK}`,
                  background: CARD_BG,
                  flexShrink: 0,
                }}
              >
                {isDeleteConfirmOpen ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: `${HL_RED}22`,
                      border: `1.5px solid ${HL_RED}`,
                      padding: '8px 10px',
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '0.82rem', color: INK, fontWeight: 600, paddingLeft: 4 }}>
                      Delete permanently?
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setIsDeleteConfirmOpen(false)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.72rem',
                          fontFamily: "'Instrument Sans', sans-serif",
                          fontWeight: 600,
                          color: INK,
                          background: `rgba(26,23,48,0.07)`,
                          border: `1.5px solid ${INK}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => deleteMessage(selectedMessage.id)}
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.72rem',
                          fontFamily: "'Instrument Sans', sans-serif",
                          fontWeight: 700,
                          color: '#fff',
                          background: HL_RED,
                          border: `1.5px solid ${INK}`,
                          borderRadius: 8,
                          boxShadow: `2px 2px 0 ${INK}`,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 8,
                      background: `rgba(26,23,48,0.06)`,
                      border: `1.5px solid ${INK}`,
                      borderRadius: 12,
                      padding: 6,
                    }}
                  >
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Type a reply..."
                      rows={1}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        maxHeight: 100,
                        minHeight: 40,
                        padding: '10px 6px',
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: '0.82rem',
                        color: INK,
                      }}
                      className="placeholder-gray-400 custom-scrollbar"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim() || isSendingReply}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        border: `1.5px solid ${INK}`,
                        background: !replyText.trim() || isSendingReply ? `rgba(26,23,48,0.1)` : INK,
                        color: !replyText.trim() || isSendingReply ? `rgba(26,23,48,0.3)` : '#fff',
                        cursor: !replyText.trim() || isSendingReply ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: replyText.trim() && !isSendingReply ? `2px 2px 0 ${HL_YELLOW}` : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {isSendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                textAlign: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: `rgba(26,23,48,0.07)`,
                  border: `1.5px solid ${INK}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Inbox size={26} color={`rgba(26,23,48,0.35)`} />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: `rgba(26,23,48,0.5)`,
                    marginBottom: 4,
                  }}
                >
                  Select a Message
                </h3>
                <p
                  style={{
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontSize: '0.78rem',
                    color: `rgba(26,23,48,0.35)`,
                    maxWidth: 180,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Select a feedback item from the list to view the conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInbox;
