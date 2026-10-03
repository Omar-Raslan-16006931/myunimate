
import React, { useState } from 'react';
import { styles } from '../theme';
import { CreditCard, Lock, Loader2, ArrowLeft } from 'lucide-react';

interface PaymentPageProps {
  price: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentPage: React.FC<PaymentPageProps> = ({ price, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    setLoading(true);
    // Simulate payment delay
    setTimeout(() => {
        setLoading(false);
        onSuccess();
    }, 2000);
  };

  return (
    <div style={styles.scrollableContent} className="flex flex-col items-center pt-10">
      
      <div className="w-full max-w-md">
          <button 
            onClick={onCancel}
            className="mb-6 text-white/50 hover:text-white flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center mb-10">
              <h1 className="text-3xl font-black text-white mb-2">Secure Checkout</h1>
              <p className="text-white/50 text-sm flex items-center justify-center gap-1.5">
                  <Lock size={12} /> Encrypted via Stripe
              </p>
          </div>

          <div className="bg-[#12141a] border border-white/10 rounded-3xl p-6 shadow-2xl mb-6">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/10">
                  <div>
                      <div className="text-lg font-bold text-white">UniMate Pro</div>
                      <div className="text-xs text-white/50">{price > 50 ? 'Lifetime Access' : 'Monthly Subscription'}</div>
                  </div>
                  <div className="text-2xl font-black text-white">${price}</div>
              </div>

              <div className="space-y-4 mb-8">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Card Number</label>
                      <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                          <input 
                            disabled 
                            type="text" 
                            value="•••• •••• •••• 4242" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm opacity-50 cursor-not-allowed"
                          />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Expiry</label>
                          <input 
                            disabled 
                            type="text" 
                            value="12/28" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm opacity-50 cursor-not-allowed"
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-white/60 uppercase tracking-wider">CVC</label>
                          <input 
                            disabled 
                            type="text" 
                            value="•••" 
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm opacity-50 cursor-not-allowed"
                          />
                      </div>
                  </div>
              </div>

              <button 
                onClick={handlePay}
                disabled={loading}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                        Pay ${price}
                    </>
                )}
              </button>
              
              <div className="mt-4 text-center">
                  <p className="text-[10px] text-white/30">
                      This is a secure placeholder. No actual charge will be made.
                  </p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default PaymentPage;
