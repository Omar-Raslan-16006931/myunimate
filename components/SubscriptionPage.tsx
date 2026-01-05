
import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Zap, Shield, Crown, CreditCard, Loader2, Calendar, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { theme, styles } from '../theme';

interface SubscriptionPageProps {
  subscriptionTier: number;
  nextRenewalDate: string;
  pendingDowngrade: boolean;
  onUpgrade: () => Promise<void>;
  onDowngrade: () => Promise<void>;
  onBack: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ 
    subscriptionTier, 
    nextRenewalDate,
    pendingDowngrade,
    onUpgrade, 
    onDowngrade, 
    onBack 
}) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'upgrade' | 'downgrade') => {
    setLoading(true);
    try {
      if (action === 'upgrade') {
        await onUpgrade();
      } else {
        await onDowngrade();
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isPro = subscriptionTier === 1;
  const formattedRenewal = new Date(nextRenewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={styles.scrollableContent}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack} 
          className="bg-white/5 hover:bg-white/10 rounded-full p-2 text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white">Your Membership</h1>
      </div>

      {/* Main Status Card */}
      <div className="relative w-full mx-auto mb-10">
          <div className={`
            relative overflow-hidden rounded-[32px] p-8 border transition-all duration-500
            ${isPro 
                ? 'bg-gradient-to-br from-[#1e1b2e] to-black border-amber-500/30 shadow-2xl shadow-amber-900/20' 
                : 'bg-[#130f1c] border-white/10 shadow-xl'
            }
          `}>
            {/* Background Effects for Pro */}
            {isPro && (
                <>
                    <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-purple-500/10 rounded-full blur-[80px] -ml-10 -mb-10 pointer-events-none" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                </>
            )}

            <div className="relative z-10 flex flex-col items-center text-center">
                
                {/* Icon/Avatar */}
                <div className={`
                    w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-2xl relative
                    ${isPro ? 'bg-gradient-to-br from-amber-300 to-yellow-600' : 'bg-white/5 border border-white/10'}
                `}>
                    {isPro ? (
                        <>
                            <Crown size={40} className="text-white drop-shadow-md" fill="currentColor" />
                            <div className="absolute -inset-1 bg-amber-400/30 blur-lg rounded-3xl -z-10 animate-pulse-slow"></div>
                        </>
                    ) : (
                        <div className="text-white/50">
                            <Shield size={32} />
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <h2 className={`text-3xl font-black mb-2 tracking-tight ${isPro ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200' : 'text-white'}`}>
                        {isPro ? 'UniMate Pro' : 'Free Plan'}
                    </h2>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
                        isPro 
                            ? (pendingDowngrade ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20') 
                            : 'bg-white/5 text-slate-400 border-white/5'
                    }`}>
                        {isPro ? (pendingDowngrade ? 'Expiring Soon' : 'Active Membership') : 'Basic Access'}
                    </div>
                </div>

                {/* Pro Details or Upsell Text */}
                {isPro ? (
                    <div className="w-full max-w-sm">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 backdrop-blur-md">
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className="text-white/40">Renewal Date</span>
                                <span className="text-white font-mono">{formattedRenewal}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/40">Billing</span>
                                <span className="text-white font-medium">$3.99 / Month</span>
                            </div>
                        </div>

                        {pendingDowngrade ? (
                             <button 
                                onClick={() => handleAction('upgrade')}
                                disabled={loading}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                             >
                                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                                Reactivate Pro
                             </button>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-white/30 mb-4">
                                    Next payment will be automatically charged on {formattedRenewal}.
                                </p>
                                <button 
                                    onClick={() => {
                                        if(confirm("Are you sure you want to cancel? You will lose access to Pro features at the end of your billing period.")) {
                                            handleAction('downgrade');
                                        }
                                    }}
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-xs transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                                    Cancel Membership
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full max-w-sm">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {['Unlimited AI', 'Gym Analytics', 'Cloud Storage', 'Priority Support'].map((feat, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                                    <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                                        <Check size={10} />
                                    </div>
                                    {feat}
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                            className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-2"
                        >
                            View Plans <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
          </div>
      </div>

      {/* Plans Section (Only if not Pro) */}
      {!isPro && (
        <div id="plans" className="animate-in slide-in-from-bottom-10 duration-700">
            <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6 text-center">Available Plans</h3>
            
            {/* Pro Plan */}
            <div className="relative group cursor-pointer mb-6" onClick={() => handleAction('upgrade')}>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[24px] blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative bg-[#130f1c] rounded-[22px] p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">Most Popular</span>
                            <h3 className="text-2xl font-bold text-white mt-2">Scholar Pro</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black text-white">$3.99</span>
                            <span className="text-white/40 text-xs font-medium block">/ month</span>
                        </div>
                    </div>
                    
                    <div className="h-px bg-white/10 my-4" />
                    
                    <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Sparkles size={12} /></div>
                            <span className="text-sm text-white/80">Gemini AI Assistant (Unlimited)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Zap size={12} /></div>
                            <span className="text-sm text-white/80">Advanced Workout Analytics</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Shield size={12} /></div>
                            <span className="text-sm text-white/80">Cloud Backup & Sync</span>
                        </div>
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 group-hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : "Subscribe Now"}
                    </button>
                </div>
            </div>

            {/* Lifetime Plan */}
            <div className="bg-[#130f1c] border border-white/10 rounded-[24px] p-6 relative overflow-hidden cursor-pointer hover:border-white/20 transition-colors" onClick={() => handleAction('upgrade')}>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-white">Lifetime Access</h3>
                    <div className="text-right">
                        <span className="text-xl font-bold text-white">$49</span>
                        <span className="text-white/40 text-[10px] font-medium block">one-time</span>
                    </div>
                </div>
                <p className="text-white/50 text-xs mb-4">Pay once, own it forever. Includes all future Pro updates.</p>
                <button 
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/5 transition-colors"
                >
                    Buy Lifetime
                </button>
            </div>
        </div>
      )}
      
      {/* Footer Text */}
      <div className="mt-12 text-center pb-8">
          <p className="text-[10px] text-white/20">
              Payments are securely processed via Stripe. You can cancel anytime.
          </p>
      </div>
    </div>
  );
};

export default SubscriptionPage;
