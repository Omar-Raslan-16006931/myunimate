
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, Loader2, MessageSquare, CheckCircle2 } from 'lucide-react';
import { styles, theme } from '../theme';

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
      alert("Failed to send feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
      setShowSuccess(false);
      onClose();
  };

  return (
    <div style={styles.modalOverlay} onClick={handleClose}>
      <div style={{...styles.modalContent, width: '90%', maxWidth: '400px'}} onClick={e => e.stopPropagation()}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <div style={{background: 'rgba(139, 92, 246, 0.1)', padding: '8px', borderRadius: '50%', color: theme.accent}}>
              <MessageSquare size={18} />
            </div>
            <h3 style={{margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff'}}>Send Feedback</h3>
          </div>
          <button onClick={handleClose} style={{background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer'}}>
            <X size={20} />
          </button>
        </div>

        {showSuccess ? (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', animation: 'fadeIn 0.3s'}}>
                <div style={{width: '60px', height: '60px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: theme.success}}>
                    <CheckCircle2 size={32} className="animate-in zoom-in duration-300" />
                </div>
                <h3 style={{margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 800, color: '#fff'}}>Report sent successfully</h3>
                <p style={{margin: '0 0 20px 0', fontSize: '0.9rem', color: theme.textMuted, textAlign: 'center'}}>
                    Thanks for your feedback. We'll look into it shortly.
                </p>
                <button 
                    onClick={handleClose}
                    style={{...styles.button, width: '100%', justifyContent: 'center', background: theme.success}}
                >
                    Close
                </button>
            </div>
        ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div>
                <label style={{...styles.label, marginBottom: '6px'}}>Category</label>
                <select 
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={styles.select}
                >
                <option value="Bug">Bug Report</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Other">Other</option>
                </select>
            </div>

            <div>
                <label style={{...styles.label, marginBottom: '6px'}}>Message</label>
                <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                style={{...styles.input, width: '100%', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit'}}
                />
            </div>

            <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
                style={{...styles.button, width: '100%', justifyContent: 'center', marginTop: '8px', opacity: (isSubmitting || !message.trim()) ? 0.6 : 1}}
            >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                <span>Send Feedback</span>
            </button>
            </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default FeedbackModal;
