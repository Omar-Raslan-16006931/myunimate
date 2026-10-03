
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, Loader2, MessageSquare, CheckCircle2, ChevronDown, Bug, Lightbulb, HelpCircle, AlertTriangle } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN  = '#8CE3B7';
const HL_ORANGE = '#F4BE8A';

const inputStyle: React.CSSProperties = {
  background: 'rgba(26,23,48,0.06)',
  border: `1.5px solid ${INK}`,
  borderRadius: '8px',
  padding: '12px 14px',
  color: INK,
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  fontSize: '0.9rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: `${INK}90`,
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  marginBottom: '8px',
};

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, userId }) => {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'Bug' | 'Feature Request' | 'Other'>('Bug');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('app_feedback')
        .insert({
          user_id: userId,
          message: message.trim(),
          category: category,
          status: 'unread'
        });

      if (error) throw error;
      
      setShowSuccess(true);
      setMessage('');
      setCategory('Bug');
    } catch (err) {
      console.error("Error sending feedback:", err);
      console.error("Failed to send feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
      setShowSuccess(false);
      onClose();
  };

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'Bug': return <Bug size={15} color="#E56A5A" />;
          case 'Feature Request': return <Lightbulb size={15} color="#F4BE8A" />;
          default: return <HelpCircle size={15} color="#9ECFFF" />;
      }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(26,23,48,0.6)',
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          background: CARD_BG,
          border: `1.5px solid ${INK}`,
          borderRadius: '14px',
          boxShadow: `8px 10px 0 ${INK}`,
          width: '100%',
          maxWidth: '400px',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1.5px solid rgba(26,23,48,0.12)`,
          background: `${HL_YELLOW}40`,
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <div style={{padding: '7px', background: INK, borderRadius: '9px', display: 'flex', border: `1.5px solid ${INK}`}}>
              <MessageSquare size={18} color="#fff" />
            </div>
            <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}>Send Feedback</h3>
          </div>
          <button 
            onClick={handleClose} 
            style={{padding: '6px', background: 'rgba(26,23,48,0.07)', border: `1.5px solid ${INK}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', color: INK}}
          >
            <X size={17} color={INK} />
          </button>
        </div>

        <div style={{padding: '20px'}}>
            {showSuccess ? (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', textAlign: 'center'}}>
                    <div style={{
                      width: '64px', height: '64px',
                      background: `${HL_GREEN}40`,
                      border: `1.5px solid ${INK}`,
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '16px',
                      boxShadow: `3px 3px 0 ${INK}`,
                    }}>
                        <CheckCircle2 size={30} color={INK} />
                    </div>
                    <h3 style={{margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}>Feedback Sent!</h3>
                    <p style={{margin: '0 0 24px 0', color: `${INK}70`, fontSize: '0.88rem', fontFamily: "'Instrument Sans', 'Inter', sans-serif", lineHeight: 1.5}}>
                        Thanks for helping us improve. We'll review your report shortly.
                    </p>
                    <button 
                        onClick={handleClose}
                        style={{
                          width: '100%',
                          padding: '13px',
                          borderRadius: '10px',
                          background: INK,
                          border: `1.5px solid ${INK}`,
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          boxShadow: `4px 4px 0 ${HL_GREEN}`,
                          fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                        }}
                    >
                        Done
                    </button>
                </div>
            ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '18px'}}>
                    
                    {/* Category Selector */}
                    <div>
                        <label style={labelStyle}>Category</label>
                        <div style={{position: 'relative'}}>
                            <div style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex'}}>
                                {getCategoryIcon(category)}
                            </div>
                            <select 
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                style={{...inputStyle, paddingLeft: '36px', paddingRight: '36px', appearance: 'none', cursor: 'pointer'}}
                            >
                                <option value="Bug">Bug Report</option>
                                <option value="Feature Request">Feature Request</option>
                                <option value="Other">Other</option>
                            </select>
                            <ChevronDown style={{position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none'}} size={15} color={`${INK}60`} />
                        </div>
                    </div>

                    {/* Message Input */}
                    <div>
                        <label style={labelStyle}>Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={category === 'Bug' ? "Describe what happened..." : "Tell us your idea..."}
                            style={{...inputStyle, minHeight: '130px', resize: 'none', lineHeight: 1.6}}
                        />
                    </div>

                    {/* Warning notice */}
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                      background: `${HL_ORANGE}40`,
                      border: `1.5px solid ${HL_ORANGE}`,
                      padding: '10px 12px',
                      borderRadius: '10px',
                    }}>
                        <AlertTriangle size={13} color={INK} style={{flexShrink: 0, marginTop: '2px'}} />
                        <p style={{margin: 0, fontSize: '0.72rem', color: `${INK}90`, lineHeight: 1.5, fontFamily: "'Instrument Sans', 'Inter', sans-serif", fontWeight: 500}}>
                            Please avoid submitting duplicate or spam messages. Misuse of the feedback system will result in an account suspension.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || !message.trim()}
                        style={{
                          width: '100%',
                          padding: '13px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: (isSubmitting || !message.trim()) ? 'not-allowed' : 'pointer',
                          fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                          ...(isSubmitting || !message.trim()
                            ? {
                                background: 'rgba(26,23,48,0.06)',
                                color: `${INK}40`,
                                border: `1.5px solid rgba(26,23,48,0.2)`,
                                boxShadow: 'none',
                              }
                            : {
                                background: INK,
                                color: '#fff',
                                border: `1.5px solid ${INK}`,
                                boxShadow: `4px 4px 0 ${HL_YELLOW}`,
                              }),
                        }}
                    >
                        {isSubmitting ? <Loader2 size={17} style={{animation: 'spin 1s linear infinite'}} /> : <Send size={17} />}
                        <span>{isSubmitting ? 'Sending...' : 'Send Feedback'}</span>
                    </button>
                </div>
            )}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default FeedbackModal;
