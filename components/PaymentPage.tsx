
import React, { useState } from 'react';
import { styles } from '../theme';
import { CreditCard, Lock, Loader2, ArrowLeft } from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN  = '#8CE3B7';

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

        {/* Back button */}
        <button
          onClick={onCancel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: `rgba(26,23,48,0.55)`,
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: 24,
            padding: 0,
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: '1.8rem',
              color: INK,
              marginBottom: 6,
            }}
          >
            Secure Checkout
          </h1>
          <p
            style={{
              fontFamily: "'Instrument Sans', sans-serif",
              color: `rgba(26,23,48,0.55)`,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            <Lock size={12} /> Encrypted via Stripe
          </p>
        </div>

        {/* Card panel */}
        <div
          style={{
            background: CARD_BG,
            border: `1.5px solid ${INK}`,
            borderRadius: 14,
            boxShadow: `8px 10px 0 ${INK}`,
            padding: 24,
            marginBottom: 20,
          }}
        >
          {/* Order summary */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 16,
              marginBottom: 16,
              borderBottom: `1.5px solid ${INK}`,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: INK,
                }}
              >
                UniMate Pro
              </div>
              <div
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: '0.78rem',
                  color: `rgba(26,23,48,0.55)`,
                }}
              >
                {price > 50 ? 'Lifetime Access' : 'Monthly Subscription'}
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 800,
                fontSize: '1.5rem',
                color: INK,
              }}
            >
              ${price}
            </div>
          </div>

          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>

            {/* Card Number */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: `rgba(26,23,48,0.6)`,
                }}
              >
                Card Number
              </label>
              <div style={{ position: 'relative' }}>
                <CreditCard
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: `rgba(26,23,48,0.35)` }}
                  size={16}
                />
                <input
                  disabled
                  type="text"
                  value="•••• •••• •••• 4242"
                  style={{
                    width: '100%',
                    background: `rgba(26,23,48,0.06)`,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 8,
                    padding: '12px 14px 12px 38px',
                    color: INK,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.9rem',
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Expiry + CVC */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: `rgba(26,23,48,0.6)`,
                  }}
                >
                  Expiry
                </label>
                <input
                  disabled
                  type="text"
                  value="12/28"
                  style={{
                    width: '100%',
                    background: `rgba(26,23,48,0.06)`,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: INK,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.9rem',
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: `rgba(26,23,48,0.6)`,
                  }}
                >
                  CVC
                </label>
                <input
                  disabled
                  type="text"
                  value="•••"
                  style={{
                    width: '100%',
                    background: `rgba(26,23,48,0.06)`,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: INK,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: '0.9rem',
                    opacity: 0.5,
                    cursor: 'not-allowed',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? `rgba(26,23,48,0.4)` : INK,
              color: '#fff',
              border: `1.5px solid ${INK}`,
              borderRadius: 10,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: '1rem',
              boxShadow: loading ? 'none' : `4px 4px 0 ${HL_GREEN}`,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s',
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Pay ${price}</>}
          </button>

          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <p
              style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: '0.72rem',
                color: `rgba(26,23,48,0.35)`,
              }}
            >
              This is a secure placeholder. No actual charge will be made.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
