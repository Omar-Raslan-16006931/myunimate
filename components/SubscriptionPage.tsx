
import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Zap, Shield, Crown, CreditCard, Loader2, Calendar, AlertTriangle, XCircle, ChevronRight, Star } from 'lucide-react';
import { theme, styles } from '../theme';
import { logger } from '../utils/logger';

interface SubscriptionPageProps {
  subscriptionTier: number;
  nextRenewalDate: string;
  pendingDowngrade: boolean;
  onUpgrade: (price: number) => Promise<void>;
  onDowngrade: () => Promise<void>;
  onBack: () => void;
  isOnboarding?: boolean;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ 
    subscriptionTier, 
    nextRenewalDate,
    pendingDowngrade,
    onUpgrade, 
    onDowngrade, 
    onBack,
    isOnboarding = false
}) => {
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const handleAction = async (action: 'upgrade' | 'downgrade', price?: number) => {
    setLoading(true);
    try {
      if (action === 'upgrade' && price) {
        await onUpgrade(price);
      } else {
        await onDowngrade();
      }
    } catch (e) {
      logger.error('Error checking referral:', e);
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
      {!isOnboarding && (
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={onBack} 
              className="bg-white/5 hover:bg-white/10 rounded-full p-2 text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-white">Your Membership</h1>
          </div>
      )}

      {isOnboarding && (
          <div className="text-center pt-8 mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20 animate-pulse-slow">
                  <Crown size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Choose Your Path</h1>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">Select a plan to unlock the full potential of your student journey.</p>
          </div>
      )}

      {/* Main Status Card - Hide during onboarding unless checking status */}
      {!isOnboarding && (
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
                                    <span className="text-white/40">Status</span>
                                    <span className="text-white font-medium">Pro</span>
                                </div>
                            </div>

                            {pendingDowngrade ? (
                                <button 
                                    onClick={() => handleAction('upgrade', 5.99)}
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
      )}

      {/* Plans Section (Only if not Pro or Onboarding) */}
      {(!isPro || isOnboarding) && (
        <div id="plans" className="animate-in slide-in-from-bottom-10 duration-700 pb-10">
            {!isOnboarding && <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6 text-center">Select Your Plan</h3>}
            
            {/* Free Plan */}
            <div className="relative group cursor-default mb-4">
                <div className="bg-[#130f1c] border border-white/5 rounded-[22px] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <h3 className="text-lg font-bold text-white">Freshman</h3>
                            <p className="text-white/40 text-xs">Basic Features</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-bold text-white">$0</span>
                            <span className="text-white/40 text-[10px] block">Forever</span>
                        </div>
                    </div>
                    {isOnboarding && (
                        <button 
                            onClick={() => onDowngrade()} 
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2 group-hover:border-white/20"
                        >
                            Continue with Free
                        </button>
                    )}
                </div>
            </div>

            {/* Pro Plan - SWITCHABLE */}
            <div className="relative group cursor-pointer mb-6">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[24px] blur opacity-75 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative bg-[#130f1c] rounded-[22px] p-6 flex flex-col h-full">
                    
                    {/* Toggle Switch */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-white/5 p-1 rounded-xl flex items-center border border-white/5 relative">
                            <div 
                                className={`absolute top-1 bottom-1 w-[50%] bg-indigo-600 rounded-lg transition-all duration-300 ${billingCycle === 'yearly' ? 'left-[48%]' : 'left-1'}`}
                            ></div>
                            <button 
                                onClick={() => setBillingCycle('monthly')}
                                className={`relative z-10 px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                Monthly
                            </button>
                            <button 
                                onClick={() => setBillingCycle('yearly')}
                                className={`relative z-10 px-4 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${billingCycle === 'yearly' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                Yearly <span className="text-[9px] bg-white/20 px-1.5 rounded text-white ml-1">-30%</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide shadow-lg shadow-indigo-500/40">Most Popular</span>
                            <h3 className="text-2xl font-bold text-white mt-2">Scholar Pro</h3>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-black text-white">
                                {billingCycle === 'yearly' ? '$49' : '$5.99'}
                            </span>
                            <span className="text-white/40 text-xs font-medium block">
                                {billingCycle === 'yearly' ? '/ year' : '/ month'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Savings Display for Yearly */}
                    {billingCycle === 'yearly' ? (
                        <div className="bg-white/5 rounded-xl p-3 mb-4 border border-white/5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-white/60">Monthly Equivalent</span>
                                <span className="text-emerald-400 font-bold">$4.08/mo</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/5 text-center">
                                <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                                    <Sparkles size={12} /> You save $22.88 per year
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-xl p-3 mb-4 border border-white/5">
                            <div className="flex items-center justify-between text-xs text-white/40">
                                <span>Billed monthly. Cancel anytime.</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Star size={12} /></div>
                            <span className="text-sm text-white/80">Everything in Free</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Sparkles size={12} /></div>
                            <span className="text-sm text-white/80">Gemini AI Tutor</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400"><Zap size={12} /></div>
                            <span className="text-sm text-white/80">Workout Analytics</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => handleAction('upgrade', billingCycle === 'yearly' ? 49 : 5.99)}
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 group-hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (billingCycle === 'yearly' ? "Subscribe Yearly" : "Subscribe Monthly")}
                    </button>
                </div>
            </div>

            {/* Lifetime Plan */}
            <div className="bg-[#130f1c] border border-white/10 rounded-[24px] p-6 relative overflow-hidden cursor-pointer hover:border-white/20 transition-colors group" onClick={() => handleAction('upgrade', 79)}>
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h3 className="text-lg font-bold text-white">Lifetime Access</h3>
                        <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-1">Founders Edition</div>
                    </div>
                    <div className="text-right">
                        <span className="text-xl font-bold text-white">$79</span>
                        <span className="text-white/40 text-[10px] font-medium block">one-time</span>
                    </div>
                </div>
                
                <p className="text-white/50 text-xs mb-4 leading-relaxed">
                    Pay once, own it forever. Compared to monthly, you start saving money after just <span className="text-white font-bold">13 months</span>.
                </p>

                <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-white/60">Save $200+ over 4 years</span>
                </div>

                <button 
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/5 transition-colors group-hover:bg-white/10"
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
