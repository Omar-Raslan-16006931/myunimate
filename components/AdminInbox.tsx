

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppFeedback } from '../types';
import { Check, Clock, User, Loader2, Inbox, RefreshCw, Trash2, X, Copy, MessageSquare, Send, Reply } from 'lucide-react';
import { theme, styles } from '../theme';

const AdminInbox: React.FC = () => {
  const [feedbackItems, setFeedbackItems] = useState<AppFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<AppFeedback | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackItems(data || []);
    } catch (err) {
      console.error("Error fetching feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const markAsRead = async (id: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'read' ? 'unread' : 'read';
    
    // 1. Optimistic Update
    setFeedbackItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus as 'read' | 'unread' } : item
    ));
    
    if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus as 'read' | 'unread' } : null);
    }

    try {
      const { error } = await supabase
        .from('app_feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

    } catch (err: any) {
      console.error("Error updating status:", err);
      // Revert optimistic update
      setFeedbackItems(prev => prev.map(item => 
        item.id === id ? { ...item, status: currentStatus as 'read' | 'unread' } : item
      ));
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const deleteMessage = async (id: string) => {
    setFeedbackItems(prev => prev.filter(item => item.id !== id));
    setDeleteConfirmId(null);
    if (selectedMessage?.id === id) setSelectedMessage(null);

    try {
      const { error, count } = await supabase
        .from('app_feedback')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw error;
      
      if (count === 0) {
          throw new Error("No rows deleted. Check permissions.");
      }

    } catch (err: any) {
      console.error("Error deleting message:", err);
      alert(`Failed to delete: ${err.message}. Check SQL Permissions.`);
      fetchFeedback();
    }
  };

  const sendReply = async () => {
      if (!selectedMessage || !replyText.trim()) return;
      setIsSendingReply(true);

      try {
          const now = new Date().toISOString();
          const { error } = await supabase
            .from('app_feedback')
            .update({ 
                admin_reply: replyText.trim(),
                admin_reply_at: now,
                status: 'read' 
            })
            .eq('id', selectedMessage.id);

          if (error) throw error;

          // Update local state
          const updated = { 
              ...selectedMessage, 
              admin_reply: replyText.trim(),
              admin_reply_at: now,
              status: 'read' as const
          };
          setSelectedMessage(updated);
          setFeedbackItems(prev => prev.map(m => m.id === updated.id ? updated : m));
          setReplyText('');

      } catch (err: any) {
          console.error("Error sending reply:", err);
          alert(`Failed to send reply: ${err.message}`);
      } finally {
          setIsSendingReply(false);
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'Bug': return theme.danger;
      case 'Feature Request': return theme.success;
      default: return theme.accent;
    }
  };

  return (
    <div style={{marginTop: '20px'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
        <h3 style={{margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Inbox size={18} /> Admin Inbox
        </h3>
        <button 
            onClick={fetchFeedback} 
            disabled={loading}
            style={{background: 'transparent', border: 'none', color: theme.accent, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'}}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && feedbackItems.length === 0 ? (
        <div style={{display: 'flex', justifyContent: 'center', padding: '20px'}}>
          <Loader2 className="animate-spin" color={theme.textMuted} />
        </div>
      ) : feedbackItems.length === 0 ? (
        <div style={{textAlign: 'center', padding: '20px', color: theme.textMuted, fontSize: '0.8rem', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '12px'}}>
          No feedback found.
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto'}}>
          {feedbackItems.map(item => (
            <div 
                key={item.id} 
                onClick={() => setSelectedMessage(item)}
                style={{
                  background: item.status === 'unread' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  border: item.status === 'unread' ? `1px solid ${theme.accent}44` : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '12px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                className="hover:bg-white/5"
            >
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px'}}>
                <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                  <span style={{
                    fontSize: '0.65rem', 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    background: `${getCategoryColor(item.category)}22`, 
                    color: getCategoryColor(item.category)
                  }}>
                    {item.category}
                  </span>
                  {item.status === 'unread' && (
                    <span style={{width: '6px', height: '6px', borderRadius: '50%', background: theme.accent}}></span>
                  )}
                  {item.admin_reply && (
                      <div title="Replied" style={{background: 'rgba(139, 92, 246, 0.2)', padding: '2px', borderRadius: '4px', color: theme.accent, display: 'flex'}}>
                          <Reply size={10} />
                      </div>
                  )}
                </div>
                <span style={{fontSize: '0.65rem', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <Clock size={10} /> {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>

              <p style={{margin: '0 0 10px 0', fontSize: '0.85rem', color: '#fff', lineHeight: '1.4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {item.message}
              </p>

              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px'}}>
                <div style={{fontSize: '0.7rem', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace'}}>
                  <User size={10} /> {item.user_id ? item.user_id.substring(0, 8) + '...' : 'Unknown'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedMessage && (
          <div style={styles.modalOverlay} onClick={() => setSelectedMessage(null)}>
              <div style={{...styles.modalContent, width: '90%', maxWidth: '500px'}} onClick={e => e.stopPropagation()}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px'}}>
                      <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                          <div style={{background: `${getCategoryColor(selectedMessage.category)}22`, padding: '8px', borderRadius: '50%', color: getCategoryColor(selectedMessage.category)}}>
                              <MessageSquare size={20} />
                          </div>
                          <div>
                              <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff'}}>{selectedMessage.category}</h3>
                              <div style={{fontSize: '0.75rem', color: theme.textMuted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                  <Clock size={12} /> {new Date(selectedMessage.created_at).toLocaleString()}
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setSelectedMessage(null)} style={{background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer'}}>
                          <X size={24} />
                      </button>
                  </div>

                  <div style={{background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                      <label style={{fontSize: '0.65rem', textTransform: 'uppercase', color: theme.textMuted, fontWeight: 700, display: 'block', marginBottom: '4px'}}>User ID</label>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', color: '#fff', fontSize: '0.85rem', wordBreak: 'break-all'}}>
                          {selectedMessage.user_id || 'Anonymous'}
                          {selectedMessage.user_id && (
                              <button 
                                onClick={() => copyToClipboard(selectedMessage.user_id)}
                                style={{background: 'transparent', border: 'none', color: theme.accent, cursor: 'pointer', padding: '4px'}}
                                title="Copy User ID"
                              >
                                  <Copy size={14} />
                              </button>
                          )}
                      </div>
                  </div>

                  <div style={{background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)', maxHeight: '200px', overflowY: 'auto'}}>
                      <p style={{margin: 0, fontSize: '0.9rem', color: '#fff', lineHeight: '1.6', whiteSpace: 'pre-wrap'}}>
                          {selectedMessage.message}
                      </p>
                  </div>

                  {/* Admin Reply Section */}
                  <div style={{borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '16px', marginBottom: '16px'}}>
                      {selectedMessage.admin_reply ? (
                          <div style={{background: 'rgba(139, 92, 246, 0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.2)'}}>
                              <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.7rem', color: theme.accent, fontWeight: 700}}>
                                  <Reply size={12} /> Admin Reply
                                  <span style={{fontWeight: 400, color: theme.textMuted}}>• {new Date(selectedMessage.admin_reply_at!).toLocaleString()}</span>
                              </div>
                              <p style={{margin: 0, fontSize: '0.85rem', color: '#fff', lineHeight: '1.5'}}>
                                  {selectedMessage.admin_reply}
                              </p>
                          </div>
                      ) : (
                          <div>
                              <label style={{fontSize: '0.7rem', color: theme.textMuted, fontWeight: 700, marginBottom: '6px', display: 'block'}}>Reply to User</label>
                              <textarea 
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="Type your response..."
                                  style={{width: '100%', minHeight: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', color: '#fff', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box'}}
                              />
                              <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '8px'}}>
                                  <button 
                                      onClick={sendReply}
                                      disabled={!replyText.trim() || isSendingReply}
                                      style={{background: theme.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: (!replyText.trim() || isSendingReply) ? 0.6 : 1}}
                                  >
                                      {isSendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Reply
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>

                  <div style={{display: 'flex', gap: '10px', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px'}}>
                      <button 
                          onClick={() => deleteMessage(selectedMessage.id)}
                          style={{
                              padding: '10px',
                              background: 'transparent',
                              color: theme.danger,
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                          }}
                      >
                          <Trash2 size={16} /> Delete Ticket
                      </button>
                      
                      <button 
                          onClick={() => markAsRead(selectedMessage.id, selectedMessage.status)}
                          style={{
                              padding: '10px 16px',
                              background: selectedMessage.status === 'unread' ? 'rgba(255,255,255,0.1)' : 'transparent',
                              color: theme.textMuted,
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                          }}
                      >
                          {selectedMessage.status === 'unread' ? <Check size={16} /> : <X size={16} />}
                          {selectedMessage.status === 'unread' ? 'Mark as Read' : 'Mark as Unread'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminInbox;