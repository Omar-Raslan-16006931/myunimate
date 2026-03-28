
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Send, Loader2, MessageSquare, CheckCircle2, ChevronDown, Bug, Lightbulb, HelpCircle, AlertTriangle } from 'lucide-react';
import { theme } from '../theme';

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

  const getCategoryIcon = (cat: string) => {
      switch(cat) {
          case 'Bug': return <Bug size={16} className="text-red-400" />;
          case 'Feature Request': return <Lightbulb size={16} className="text-yellow-400" />;
          default: return <HelpCircle size={16} className="text-blue-400" />;
      }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={handleClose}>
      <div 
        className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#130f1c]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <MessageSquare size={20} />
            </div>
            <h3 className="text-lg font-bold text-white">Send Feedback</h3>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
            {showSuccess ? (
                <div className="flex flex-col items-center py-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.2)]">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Feedback Sent!</h3>
                    <p className="text-white/60 text-sm mb-8 px-4">
                        Thanks for helping us improve. We'll review your report shortly.
                    </p>
                    <button 
                        onClick={handleClose}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 active:scale-[0.98]"
                    >
                        Done
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    
                    {/* Category Selector */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Category</label>
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                {getCategoryIcon(category)}
                            </div>
                            <select 
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm text-white appearance-none focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer hover:bg-white/10"
                            >
                                <option value="Bug">Bug Report</option>
                                <option value="Feature Request">Feature Request</option>
                                <option value="Other">Other</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={16} />
                        </div>
                    </div>

                    {/* Message Input */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={category === 'Bug' ? "Describe what happened..." : "Tell us your idea..."}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-colors min-h-[140px] resize-none"
                        />
                    </div>

                    <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl">
                        <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-orange-200/70 leading-relaxed font-medium">
                            Please avoid submitting duplicate or spam messages. Misuse of the feedback system will result in an account suspension.
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || !message.trim()}
                        className={`
                            w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg
                            ${(isSubmitting || !message.trim()) 
                                ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 active:scale-[0.98]'}
                        `}
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        <span>{isSubmitting ? 'Sending...' : 'Send Feedback'}</span>
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
