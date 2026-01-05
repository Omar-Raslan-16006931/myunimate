
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, UserPlus, DollarSign, Copy, CheckCircle2, Wallet, CreditCard, ArrowRight, X, Loader2, Sparkles, Clock, History, AlertCircle, TrendingUp } from 'lucide-react';
import { theme, styles } from '../theme';
import { supabase } from '../lib/supabase';
import { WalletTransaction } from '../types';
import ReferralTermsModal from './ReferralTermsModal';

interface ReferralProgramProps {
  onBack: () => void;
  isLoggedIn: boolean;
  userId?: string;
  username?: string;
  onLogin?: () => void;
  balance?: number;
  subscriptionTier?: number;
  onRefreshProfile?: () => void;
}

const ReferralProgram: React.FC<ReferralProgramProps> = ({ 
    onBack, 
    isLoggedIn, 
    userId,
    username, 
    onLogin,
    balance = 0,
    subscriptionTier = 0,
    onRefreshProfile
}) => {
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [payoutEmail, setPayoutEmail] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isRegisteringCode, setIsRegisteringCode] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Deterministic code generation based on username
  const generatedCode = isLoggedIn && username 
    ? (username.length >= 3 ? username.substring(0, 4).toUpperCase() + "2024" : "JOIN2024")
    : "JOIN2024";

  useEffect(() => {
      if (userId) {
          fetchHistory();
          ensureCodeActive();
      }
  }, [userId, generatedCode]);

  // Ensure the code exists in the DB so friends can actually use it
  const ensureCodeActive = async () => {
      if (!isLoggedIn || !userId || generatedCode === "JOIN2024") return;
      
      try {
          const { data } = await supabase
            .from('referral_codes')
            .select('id')
            .eq('code', generatedCode)
            .maybeSingle();
          
          if (!data) {
              setIsRegisteringCode(true);
              // Create it if missing, linking to this user so we know who to pay later
              await supabase.from('referral_codes').insert({
                  code: generatedCode,
                  user_id: userId, // Critical for attribution
                  is_active: true,
                  usage_count: 0,
                  subscription_tier: 0 
              });
              setIsRegisteringCode(false);
          }
      } catch (err) {
          console.error("Error registering code", err);
      }
  };

  const fetchHistory = async () => {
      if (!userId) return;
      setLoadingHistory(true);
      const { data } = await supabase
          .from('wallet_ledger')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
      
      if (data) {
          setTransactions(data as WalletTransaction[]);
      }
      setLoadingHistory(false);
  };

  const handleRedeemMembership = async () => {
      // Updated Price: $5.99
      if (!userId || balance < 5.99) return;
      if (!confirm("Redeem $5.99 for 1 Month of Pro Membership?")) return;
      
      setIsProcessing(true);
      setErrorMessage(null);

      try {
          const newBalance = balance - 5.99;

          // 1. Update Profile (Optimistic)
          const { error: profileError } = await supabase
              .from('profiles')
              .update({ 
                  wallet_balance: newBalance,
                  subscription_tier: 1 
              })
              .eq('id', userId);

          if (profileError) throw profileError;

          // 2. Add to Ledger
          const { error: ledgerError } = await supabase
              .from('wallet_ledger')
              .insert({
                  user_id: userId,
                  amount: -5.99,
                  balance_after: newBalance,
                  transaction_type: 'membership_purchase',
                  status: 'completed',
                  description: 'Redeemed 1 Month Pro'
              });

          if (ledgerError) throw ledgerError;

          setSuccessMessage("Membership Activated! Enjoy Pro.");
          fetchHistory();
          if (onRefreshProfile) onRefreshProfile();
          setTimeout(() => setSuccessMessage(null), 3000);

      } catch (err: any) {
          console.error(err);
          setErrorMessage(err.message || "Transaction failed");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleCashOutSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(requestAmount);

      if (!userId) return;
      
      if (isNaN(amount) || amount <= 0) {
          setErrorMessage("Please enter a valid amount.");
          return;
      }

      if (amount < 20) {
          setErrorMessage("Minimum cashout is $20.00");
          return;
      }

      if (amount > balance) {
          setErrorMessage("Insufficient balance.");
          return;
      }

      setIsProcessing(true);
      setErrorMessage(null);

      try {
          const newBalance = balance - amount; 

          // 1. Deduct Balance
          const { error: profileError } = await supabase
              .from('profiles')
              .update({ wallet_balance: newBalance })
              .eq('id', userId);

          if (profileError) throw profileError;

          // 2. Create Ledger Entry
          const { error: ledgerError } = await supabase
              .from('wallet_ledger')
              .insert({
                  user_id: userId,
                  amount: -amount,
                  balance_after: newBalance,
                  transaction_type: 'cashout_request',
                  status: 'pending',
                  description: `Payout to ${payoutEmail}`
              });

          if (ledgerError) throw ledgerError;

          setShowCashOutModal(false);
          setSuccessMessage(`Request for $${amount.toFixed(2)} submitted!`);
          setPayoutEmail('');
          setRequestAmount('');
          fetchHistory();
          if (onRefreshProfile) onRefreshProfile();
          setTimeout(() => setSuccessMessage(null), 3000);

      } catch (err: any) {
          console.error(err);
          setErrorMessage(err.message || "Cashout failed");
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div style={styles.container}>
      <div style={styles.scrollableContent}>
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pt-2 relative z-10">
          <button 
            onClick={onBack} 
            className="bg-white/5 hover:bg-white/10 rounded-full p-2 text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-white">Refer & Earn</h1>
        </div>

        {isLoggedIn && (
            <div className="mb-8 animate-in slide-in-from-top-5 duration-500">
                {/* Wallet Card */}
                <div className="relative bg-gradient-to-br from-[#1e1b2e] to-[#0f0f12] border border-white/10 rounded-3xl p-6 overflow-hidden shadow-2xl group">
                    {/* Ambient Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none group-hover:bg-emerald-500/20 transition-colors duration-500" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                            <Wallet size={12} /> Available Funds
                        </div>
                        <div className="text-6xl font-black text-white mb-8 tracking-tighter tabular-nums">
                            <span className="text-3xl text-white/40 align-top mt-2 inline-block mr-1">$</span>
                            {balance.toFixed(2)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button 
                                onClick={handleRedeemMembership}
                                disabled={balance < 5.99 || isProcessing}
                                className={`
                                    flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-[0.98] relative overflow-hidden group/btn
                                    ${balance >= 5.99 
                                        ? 'bg-gradient-to-br from-indigo-600/20 to-violet-600/20 hover:from-indigo-600/30 hover:to-violet-600/30 border-indigo-500/30 cursor-pointer' 
                                        : 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'}
                                `}
                            >
                                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 group-hover/btn:scale-110 transition-transform">
                                    <Sparkles size={18} />
                                </div>
                                <div className="text-sm font-bold text-white">Redeem Pro</div>
                                <div className="text-[10px] text-white/40 mt-0.5">$5.99 / Month</div>
                            </button>

                            <button 
                                onClick={() => setShowCashOutModal(true)}
                                disabled={balance < 20 || isProcessing}
                                className={`
                                    flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-[0.98] group/btn
                                    ${balance >= 20 
                                        ? 'bg-gradient-to-br from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border-emerald-500/30 cursor-pointer' 
                                        : 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'}
                                `}
                            >
                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 group-hover/btn:scale-110 transition-transform">
                                    <CreditCard size={18} />
                                </div>
                                <div className="text-sm font-bold text-white">Cash Out</div>
                                <div className="text-[10px] text-white/40 mt-0.5">Min $20.00</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center gap-3 animate-in zoom-in duration-300">
                <CheckCircle2 className="text-emerald-400" size={20} />
                <span className="text-emerald-100 font-bold text-sm">{successMessage}</span>
            </div>
        )}

        {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center gap-3 animate-in zoom-in duration-300">
                <AlertCircle className="text-red-400" size={20} />
                <span className="text-red-100 font-bold text-sm">{errorMessage}</span>
            </div>
        )}

        {/* Code Section */}
        <div className="bg-[#130f1c] border border-white/10 rounded-2xl p-6 text-center mb-8 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            {isLoggedIn ? (
                <>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
                        Your Referral Code {isRegisteringCode && <Loader2 size={10} className="animate-spin" />}
                    </p>
                    <div 
                        className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/10 transition-colors group relative overflow-hidden"
                        onClick={() => navigator.clipboard.writeText(generatedCode)}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <code className="text-xl md:text-2xl font-mono font-bold text-emerald-400 tracking-widest">{generatedCode}</code>
                        <div className="flex items-center gap-1.5 text-white/40 group-hover:text-white transition-colors text-xs font-bold">
                            <Copy size={14} />
                            <span className="hidden sm:inline">COPY</span>
                        </div>
                    </div>
                    <p className="text-white/30 text-[10px] mt-3">
                        Share this code. Friends get free Pro trials. You get cash.
                    </p>
                </>
            ) : (
                <>
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                        <UserPlus size={24} className="text-white/20" />
                    </div>
                    <h3 className="text-white font-bold mb-2">Ready to start earning?</h3>
                    <p className="text-white/50 text-xs mb-6 max-w-[200px] mx-auto">Create an account to generate your unique referral link.</p>
                    <button 
                        onClick={onLogin}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
                    >
                        Sign In to Get Code
                    </button>
                </>
            )}
        </div>

        {/* Transaction History */}
        {isLoggedIn && (
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <History size={12} /> Recent Activity
                    </h3>
                    <div className="text-[10px] text-white/30">{transactions.length} Records</div>
                </div>
                
                <div className="space-y-2">
                    {loadingHistory ? (
                        <div className="text-center py-8"><Loader2 className="animate-spin text-white/20 mx-auto" size={24} /></div>
                    ) : transactions.length === 0 ? (
                        <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center">
                            <TrendingUp size={24} className="text-white/10 mx-auto mb-2" />
                            <p className="text-white/30 text-xs">No transactions yet. Share your code to earn!</p>
                        </div>
                    ) : (
                        transactions.map(txn => (
                            <div key={txn.id} className="bg-[#130f1c] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                        txn.transaction_type === 'referral_bonus' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                        txn.transaction_type === 'cashout_request' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                        'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                    }`}>
                                        {txn.transaction_type === 'referral_bonus' ? <DollarSign size={14} /> : 
                                         txn.transaction_type === 'cashout_request' ? <CreditCard size={14} /> :
                                         <Sparkles size={14} />}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-xs flex items-center gap-2">
                                            {txn.transaction_type === 'referral_bonus' ? 'Referral Bonus' : 
                                             txn.transaction_type === 'cashout_request' ? 'Cash Out' : 
                                             txn.transaction_type === 'refund' ? 'Refund' : 'Pro Membership'}
                                            
                                            {txn.status === 'pending' && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Pending</span>}
                                        </div>
                                        <div className="text-white/40 text-[10px] flex items-center gap-1 mt-0.5">
                                            {new Date(txn.created_at).toLocaleDateString()} • {new Date(txn.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold text-sm ${txn.amount > 0 ? 'text-emerald-400' : 'text-white/60'}`}>
                                    {txn.amount > 0 ? '+' : ''}{txn.amount.toFixed(2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* Steps */}
        <div className="space-y-4 pb-12">
            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest px-1 mb-2">How it works</h3>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/[0.07] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                    <Share2 size={20} />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm">1. Share your link</h4>
                    <p className="text-white/50 text-xs">Send your unique code to friends.</p>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/[0.07] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-500/20 group-hover:scale-110 transition-transform">
                    <UserPlus size={20} />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm">2. Friend subscribes</h4>
                    <p className="text-white/50 text-xs">You earn when they make their first payment.</p>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/[0.07] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <DollarSign size={20} />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm">3. You get paid</h4>
                    <p className="text-white/50 text-xs">Receive 20% commission per referral.</p>
                </div>
            </div>
        </div>

        {/* Footer Link to ToS */}
        <div className="text-center pb-8">
            <button 
                onClick={() => setShowTerms(true)}
                className="text-[10px] text-white/30 hover:text-white/60 transition underline underline-offset-4"
            >
                Referral Program Terms & Conditions
            </button>
        </div>

      </div>

      {/* Cash Out Modal */}
      {showCashOutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-[#130f1c] border border-white/10 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowCashOutModal(false)} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"><X size={20} /></button>
                  
                  <div className="flex flex-col items-center mb-6">
                      <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-3 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                          <DollarSign size={28} />
                      </div>
                      <h2 className="text-xl font-bold text-white">Cash Out Request</h2>
                      <p className="text-white/50 text-xs mt-1">Available: <span className="text-white font-bold">${balance.toFixed(2)}</span></p>
                  </div>

                  <form onSubmit={handleCashOutSubmit} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">PayPal / Venmo Email</label>
                          <input 
                            required
                            type="email" 
                            placeholder="you@example.com" 
                            value={payoutEmail}
                            onChange={(e) => setPayoutEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Amount ($)</label>
                          <input 
                            required
                            type="number" 
                            min="20"
                            step="0.01"
                            placeholder="20.00" 
                            value={requestAmount}
                            onChange={(e) => setRequestAmount(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-all"
                          />
                          <div className="text-right text-[10px] text-white/30 mt-1">Max: ${balance.toFixed(2)}</div>
                      </div>
                      
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl flex gap-3 items-start">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-emerald-200/70 leading-relaxed font-medium">
                              Your request will be added to the audit queue. Payouts are processed manually within 3-5 business days.
                          </p>
                      </div>

                      <button 
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                      >
                          {isProcessing ? <Loader2 className="animate-spin" size={18} /> : "Submit Request"}
                      </button>
                  </form>
              </div>
          </div>
      )}

      <ReferralTermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
};

export default ReferralProgram;
