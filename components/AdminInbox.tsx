
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { AppFeedback, FeedbackReply } from '../types';
import { Check, User, Loader2, Inbox, RefreshCw, Trash2, Send, AlertTriangle, Search, ChevronLeft, Sparkles, Copy } from 'lucide-react';

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
        console.error("Admin check failed:", err);
        setIsAuthorized(false);
      }
    };

    checkAdminStatus();
  }, []);

  // Fetch replies when message selected
  useEffect(() => {
      if (selectedMessage) {
          setReplies([]);
          const fetchReplies = async () => {
            const { data } = await supabase.from('feedback_replies')
                .select('*')
                .eq('feedback_id', selectedMessage.id)
                .order('created_at', { ascending: true });
            if (data) setReplies(data);
          };
          fetchReplies();

          const channel = supabase.channel('admin_feedback_chat')
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'feedback_replies', filter: `feedback_id=eq.${selectedMessage.id}` },
              (payload: any) => {
                setReplies(prev => [...prev, payload.new as FeedbackReply]);
              }
            )
            .subscribe();

          return () => { supabase.removeChannel(channel); };
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
    setFeedbackItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus as 'read' | 'unread' } : item
    ));
    if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus as 'read' | 'unread' } : null);
    }

    try {
      await supabase.from('app_feedback').update({ status: newStatus }).eq('id', id);
    } catch (err: any) {
      console.error("Error updating status:", err);
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
      console.error("Error deleting message:", err);
      console.error(`Failed to delete: ${err.message}`);
      fetchFeedback();
    }
  };

  const sendReply = async () => {
      if (!selectedMessage || !replyText.trim()) return;
      setIsSendingReply(true);

      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          // NOTE: is_admin status is now determined server-side via RLS policies
          // The client MUST NOT set is_admin flag - backend verifies admin status
          const { error } = await supabase.from('feedback_replies').insert({
                feedback_id: selectedMessage.id,
                sender_id: session.user.id,
                message: replyText.trim()
                // is_admin flag is set by database trigger or backend function
            });

          if (error) throw error;

          // Mark parent as read when replying
          if (selectedMessage.status === 'unread') {
             markAsRead(selectedMessage.id, 'unread');
          }

          setReplyText('');
      } catch (err: any) {
          console.error("Error sending reply:", err);
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
        className="flex flex-col bg-[#0f172a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative transition-all duration-500 ease-in-out"
        // 450px accommodates roughly 4 items + header (assuming ~85px per item)
        style={{ height: isEmpty ? '220px' : '450px' }}
    >
      
      {/* --- Top Bar --- */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#130f1c]/80 backdrop-blur-md border-b border-white/5 z-20 shrink-0">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${filter === 'unread' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/50'}`}>
                {filter === 'unread' ? <AlertTriangle size={14} /> : <Inbox size={14} />}
            </div>
            <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Inbox</h2>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-white/40 font-medium">Live Support</span>
                </div>
            </div>
        </div>
        
        <div className="flex bg-[#0f172a] p-1 rounded-lg border border-white/5">
            <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
                All
            </button>
            <button 
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${filter === 'unread' ? 'bg-white/10 text-indigo-400' : 'text-white/40 hover:text-white'}`}
            >
                Unread
            </button>
            <button onClick={fetchFeedback} disabled={loading} className="px-2 text-white/30 hover:text-white transition-colors border-l border-white/5 ml-1 pl-2">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* --- Left Sidebar: Ticket List --- */}
        <div className={`
            absolute inset-y-0 left-0 w-full md:relative md:w-[320px] bg-[#0f172a] flex flex-col z-10 transition-transform duration-300 border-r border-white/5
            ${selectedMessage ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        `}>
            {/* Search */}
            <div className="p-3 shrink-0">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-400 transition-colors" size={12} />
                    <input 
                        type="text" 
                        placeholder="Search tickets..." 
                        className="w-full bg-white/5 border border-transparent focus:border-white/10 rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/20"
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 custom-scrollbar">
                {loading && feedbackItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <Loader2 className="animate-spin text-indigo-500" size={24} />
                        <span className="text-xs text-white/30">Syncing...</span>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 pb-10">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-3">
                            <Sparkles size={24} className="opacity-50" />
                        </div>
                        <span className="text-xs font-medium">All caught up!</span>
                    </div>
                ) : (
                    filteredItems.map(item => {
                        const isSelected = selectedMessage?.id === item.id;
                        const isUnread = item.status === 'unread';
                        
                        return (
                            <button 
                                key={item.id}
                                onClick={() => setSelectedMessage(item)}
                                className={`
                                    w-full text-left relative p-3 rounded-xl transition-all duration-200 group border
                                    ${isSelected 
                                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner' 
                                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        {isUnread && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />}
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                            item.category === 'Bug' ? 'text-red-400 border-red-500/20 bg-red-500/5' : 
                                            item.category === 'Feature Request' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 
                                            'text-blue-400 border-blue-500/20 bg-blue-500/5'
                                        }`}>
                                            {item.category}
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-white/30 font-mono">
                                        {new Date(item.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                    </span>
                                </div>
                                
                                <p className={`text-xs line-clamp-2 mb-2 ${isUnread ? 'text-white font-medium' : 'text-white/60'}`}>
                                    {item.message}
                                </p>

                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] text-white/50">
                                        <User size={8} />
                                    </div>
                                    <span className="text-[9px] text-white/20 truncate">
                                        {item.username || `User`}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>

        {/* --- Right Panel: Chat View --- */}
        <div className={`
            absolute inset-y-0 right-0 w-full md:relative flex flex-col bg-[#0f172a] z-20 transition-transform duration-300 md:translate-x-0
            ${selectedMessage ? 'translate-x-0' : 'translate-x-full'}
        `}>
            {selectedMessage ? (
                <>
                    {/* Chat Header */}
                    <div className="h-auto min-h-[60px] px-4 py-3 border-b border-white/5 flex justify-between items-start bg-[#0f172a]/80 backdrop-blur-md shrink-0">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <button 
                                onClick={() => setSelectedMessage(null)} 
                                className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors -ml-1"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-sm font-bold text-white leading-tight">
                                        {selectedMessage.username || 'Unknown User'}
                                    </h1>
                                    {selectedMessage.status === 'unread' && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                                </div>
                                <div className="flex items-center gap-1 group cursor-pointer" onClick={() => navigator.clipboard.writeText(selectedMessage.user_id)}>
                                    <span className="text-[10px] text-white/30 font-mono tracking-wide">
                                        ID: {selectedMessage.user_id}
                                    </span>
                                    <Copy size={10} className="text-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => markAsRead(selectedMessage.id, selectedMessage.status)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                    selectedMessage.status === 'read' 
                                        ? 'text-emerald-400 bg-emerald-500/10' 
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                                title={selectedMessage.status === 'unread' ? "Mark Read" : "Mark Unread"}
                            >
                                <Check size={14} />
                            </button>
                            <button 
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0f172a] to-[#130f1c]/50 custom-scrollbar">
                        {/* Original Ticket */}
                        <div className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5 text-white/40">
                                <User size={14} />
                            </div>
                            <div className="flex flex-col max-w-[85%]">
                                <div className="bg-[#1e293b] border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-white/90 leading-relaxed">
                                    {selectedMessage.message}
                                </div>
                                <span className="text-[9px] text-white/20 mt-1 ml-1">{new Date(selectedMessage.created_at).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Thread */}
                        {replies.map(reply => (
                            <div key={reply.id} className={`flex gap-3 animate-in slide-in-from-bottom-2 ${reply.is_admin ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                                    reply.is_admin 
                                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                                        : 'bg-white/5 border-white/5 text-white/40'
                                }`}>
                                    {reply.is_admin ? <Send size={12} /> : <User size={14} />}
                                </div>
                                <div className={`flex flex-col max-w-[85%] ${reply.is_admin ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                                        reply.is_admin 
                                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-900/20' 
                                            : 'bg-[#1e293b] border border-white/5 text-white/90 rounded-tl-none'
                                    }`}>
                                        {reply.message}
                                    </div>
                                    <span className="text-[9px] text-white/20 mt-1 px-1">
                                        {new Date(reply.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={replyEndRef} />
                    </div>

                    {/* Reply Input */}
                    <div className="p-3 bg-[#0f172a] border-t border-white/5 shrink-0">
                        {isDeleteConfirmOpen ? (
                            <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl animate-in fade-in">
                                <span className="text-red-200 text-xs font-medium px-2">Delete permanently?</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsDeleteConfirmOpen(false)} className="px-3 py-1.5 text-[10px] text-white/60 hover:text-white bg-white/5 rounded-lg transition">Cancel</button>
                                    <button onClick={() => deleteMessage(selectedMessage.id)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-lg transition shadow-lg shadow-red-900/20">Delete</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-end gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 focus-within:border-indigo-500/50 transition-all">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                                    placeholder="Type a reply..."
                                    className="flex-1 bg-transparent border-none text-xs text-white placeholder-white/20 focus:outline-none resize-none max-h-[100px] min-h-[40px] py-2.5 px-3 custom-scrollbar"
                                    rows={1}
                                />
                                <button 
                                    onClick={sendReply}
                                    disabled={!replyText.trim() || isSendingReply}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                                        (!replyText.trim() || isSendingReply)
                                            ? 'bg-white/5 text-white/20'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 active:scale-95'
                                    }`}
                                >
                                    {isSendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className={replyText.trim() ? 'ml-0.5' : ''} />}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/10 p-8 text-center space-y-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full"></div>
                        <Inbox size={48} className="relative opacity-50" />
                    </div>
                    <div>
                        <h3 className="text-white/40 font-bold text-sm mb-1">Select a Message</h3>
                        <p className="text-xs font-medium max-w-[180px] mx-auto leading-relaxed">
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
