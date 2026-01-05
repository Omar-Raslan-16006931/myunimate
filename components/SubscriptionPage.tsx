
import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Zap, Shield, Crown, CreditCard, Loader2 } from 'lucide-react';
import { theme, styles } from '../theme';

interface SubscriptionPageProps {
  subscriptionTier: number;
  onUpgrade: () => Promise<void>;
  onCancel: () => Promise<void>;
  onBack: () => void;
}

const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ subscriptionTier, onUpgrade, onCancel, onBack }) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'upgrade' | 'cancel') => {
    setLoading(true);
    try {
      if (action === 'upgrade') {
        await onUpgrade();
      } else {
        await onCancel();
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isPro = subscriptionTier === 1;

  return (
    <div style={styles.scrollableContent}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack} 
          className="bg-white/5 hover:bg-white/10 rounded-full p-2 text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-white">Membership</h1>
      </div>

      {/* Current Status Card */}
      <div className={`p-6 rounded-3xl border mb-8 relative overflow-hidden ${
        isPro 
          ? 'bg-gradient-to-br from-indigo-900/50 to-violet-900/50 border-indigo-500/30' 
          : 'bg-[#130f1c] border-white/10'
      }`}>
        {isPro && (
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" />
        )}
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Current Plan</p>
              <h2 className="text-3xl font-black text-white flex items-center gap-2">
                {isPro ? 'Pro Scholar' : 'Freshman'}
                {isPro && <Crown size={24} className="text-yellow-400 fill-yellow-400" />}
              </h2>
            </div>
            {isPro && (
              <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Active
              </div>
            )}
          </div>

          <p className="text-white/60 text-sm mb-6 leading-relaxed max-w-sm">
            {isPro 
              ? "You have full access to all premium features. Thank you for supporting the development!" 
              : "Upgrade to unlock the full potential of your student operating system."}
          </p>

          {isPro ? (
            <button 
              onClick={() => {
                  if(confirm("Are you sure you want to cancel? You will lose access to AI features immediately.")) {
                      handleAction('cancel');
                  }
              }}
              disabled={loading}
              className="bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/50 text-xs font-bold py-2 px-4 rounded-xl transition-colors border border-white/5"
            >
              {loading ? "Processing..." : "Cancel Subscription"}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <Zap size={14} />
              <span>Unlock AI & Unlimited Storage</span>
            </div>
          )}
        </div>
      </div>

      {!isPro && (
        <>
          <div className="grid gap-4 mb-8">
            <h3 className="text-white font-bold text-lg px-1">Choose Your Plan</h3>
            
            {/* Monthly Plan */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-indigo-500/50 transition-all cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="text-white font-bold text-base">Monthly Pro</h4>
                        <p className="text-white/40 text-xs">Billed monthly</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-white">$3.99</span>
                        <span className="text-white/40 text-xs">/mo</span>
                    </div>
                </div>
                <ul className="space-y-2 mb-6">
                    {['Unlimited AI Chat', 'Advanced Gym Analytics', 'Unlimited File Storage', 'Priority Support'].map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                            <Check size={12} className="text-indigo-400" /> {feat}
                        </li>
                    ))}
                </ul>
                <button 
                    onClick={() => handleAction('upgrade')}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    Subscribe Now
                </button>
            </div>

            {/* Lifetime Plan */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-indigo-500/50 transition-all cursor-pointer opacity-80 hover:opacity-100">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h4 className="text-white font-bold text-base">Lifetime</h4>
                        <p className="text-white/40 text-xs">One-time payment</p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-white">$49</span>
                        <span className="text-white/40 text-xs">/once</span>
                    </div>
                </div>
                <button 
                    onClick={() => handleAction('upgrade')}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
                >
                    Buy Lifetime
                </button>
            </div>
          </div>

          {/* Support Message */}
          <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-6 text-center">
             <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-400">
                <Sparkles size={20} />
             </div>
             <h3 className="text-white font-bold text-sm mb-2">Support The Mission</h3>
             <p className="text-white/50 text-xs leading-relaxed max-w-xs mx-auto mb-4">
                Your subscription directly funds our server costs and helps us develop the official iOS & Android apps.
             </p>
             <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionPage;
