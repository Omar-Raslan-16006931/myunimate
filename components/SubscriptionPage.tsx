
import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Zap, Shield, Crown, Loader2, XCircle, ChevronRight, Star } from 'lucide-react';
import { styles } from '../theme';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_PINK   = '#eea8f2';
const HL_GREEN  = '#8CE3B7';
const HL_RED    = '#E56A5A';

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
  isOnboarding = false,
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
      console.error(e);
      console.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isPro = subscriptionTier === 1;
  const formattedRenewal = new Date(nextRenewalDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // ── shared button styles ──────────────────────────────────────────────────
  const primaryBtn: React.CSSProperties = {
    background: INK,
    color: '#fff',
    border: `1.5px solid ${INK}`,
    borderRadius: 10,
    fontWeight: 700,
    boxShadow: `4px 4px 0 ${HL_YELLOW}`,
    cursor: 'pointer',
    padding: '12px 18px',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    transition: 'all 0.15s',
  };

  const ghostBtn: React.CSSProperties = {
    background: `rgba(26,23,48,0.07)`,
    color: INK,
    border: `1.5px solid ${INK}`,
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '12px 18px',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    transition: 'all 0.15s',
  };

  const dangerBtn: React.CSSProperties = {
    background: HL_RED,
    color: '#fff',
    border: `1.5px solid ${INK}`,
    borderRadius: 10,
    fontWeight: 700,
    boxShadow: `4px 4px 0 ${INK}`,
    cursor: 'pointer',
    padding: '12px 18px',
    fontFamily: "'Bricolage Grotesque', sans-serif",
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  };

  // ── card style helper ─────────────────────────────────────────────────────
  const stickyCard = (tint: string): React.CSSProperties => ({
    background: tint,
    border: `1.5px solid ${INK}`,
    borderRadius: 10,
    boxShadow: `4px 5px 0 ${INK}`,
    padding: '20px',
    marginBottom: 16,
  });

  return (
    <div style={styles.scrollableContent}>
      {/* Header */}
      {!isOnboarding && (
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            style={{
              background: `rgba(26,23,48,0.07)`,
              border: `1.5px solid ${INK}`,
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              color: INK,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: '1.2rem',
              color: INK,
              margin: 0,
            }}
          >
            Your Membership
          </h1>
        </div>
      )}

      {isOnboarding && (
        <div className="text-center pt-8 mb-10">
          <div
            style={{
              width: 64,
              height: 64,
              background: HL_YELLOW,
              border: `1.5px solid ${INK}`,
              boxShadow: `4px 4px 0 ${INK}`,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Crown size={32} color={INK} />
          </div>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: '1.8rem',
              color: INK,
              marginBottom: 8,
            }}
          >
            Choose Your Path
          </h1>
          <p
            style={{
              fontFamily: "'Instrument Sans', sans-serif",
              color: `rgba(26,23,48,0.6)`,
              fontSize: '0.9rem',
            }}
          >
            Select a plan to unlock the full potential of your student journey.
          </p>
        </div>
      )}

      {/* Main Status Card */}
      {!isOnboarding && (
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              ...stickyCard(isPro ? `${HL_PINK}55` : `${HL_YELLOW}55`),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 18,
                background: isPro ? HL_PINK : HL_YELLOW,
                border: `1.5px solid ${INK}`,
                boxShadow: `3px 3px 0 ${INK}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {isPro ? (
                <Crown size={36} color={INK} fill={INK} />
              ) : (
                <Shield size={32} color={INK} />
              )}
            </div>

            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 800,
                fontSize: '1.6rem',
                color: INK,
                marginBottom: 6,
              }}
            >
              {isPro ? 'UniMate Pro' : 'Free Plan'}
            </h2>

            <span
              style={{
                display: 'inline-block',
                background: isPro
                  ? pendingDowngrade
                    ? `${HL_RED}22`
                    : `${HL_GREEN}55`
                  : `rgba(26,23,48,0.08)`,
                border: `1.5px solid ${isPro ? (pendingDowngrade ? HL_RED : HL_GREEN) : INK}`,
                borderRadius: 20,
                padding: '3px 10px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: isPro ? (pendingDowngrade ? HL_RED : '#1a6e4c') : `rgba(26,23,48,0.6)`,
                fontFamily: "'Instrument Sans', sans-serif",
                marginBottom: 20,
              }}
            >
              {isPro ? (pendingDowngrade ? 'Expiring Soon' : 'Active Membership') : 'Basic Access'}
            </span>

            {isPro ? (
              <div style={{ width: '100%', maxWidth: 320 }}>
                {/* Renewal info */}
                <div
                  style={{
                    background: CARD_BG,
                    border: `1.5px solid ${INK}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ color: `rgba(26,23,48,0.55)`, fontFamily: "'Instrument Sans', sans-serif" }}>
                      Renewal Date
                    </span>
                    <span
                      style={{ fontFamily: "'Space Mono', monospace", color: INK, fontWeight: 700, fontSize: '0.8rem' }}
                    >
                      {formattedRenewal}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: `rgba(26,23,48,0.55)`, fontFamily: "'Instrument Sans', sans-serif" }}>
                      Status
                    </span>
                    <span style={{ fontFamily: "'Instrument Sans', sans-serif", color: INK, fontWeight: 600 }}>
                      Pro
                    </span>
                  </div>
                </div>

                {pendingDowngrade ? (
                  <button
                    onClick={() => handleAction('upgrade', 5.99)}
                    disabled={loading}
                    style={primaryBtn}
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    Reactivate Pro
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: `rgba(26,23,48,0.5)`,
                        fontFamily: "'Instrument Sans', sans-serif",
                        margin: 0,
                      }}
                    >
                      Next payment will be automatically charged on {formattedRenewal}.
                    </p>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            'Are you sure you want to cancel? You will lose access to Pro features at the end of your billing period.'
                          )
                        ) {
                          handleAction('downgrade');
                        }
                      }}
                      disabled={loading}
                      style={dangerBtn}
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                      Cancel Membership
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: 320 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginBottom: 16,
                    textAlign: 'left',
                  }}
                >
                  {['Unlimited AI', 'Gym Analytics', 'Cloud Storage', 'Priority Support'].map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: `${HL_GREEN}88`,
                          border: `1.5px solid ${INK}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={10} color={INK} />
                      </div>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: INK,
                          fontFamily: "'Instrument Sans', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                  style={primaryBtn}
                >
                  View Plans <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans Section */}
      {(!isPro || isOnboarding) && (
        <div id="plans" style={{ paddingBottom: 40 }}>
          {!isOnboarding && (
            <p
              style={{
                fontFamily: "'Instrument Sans', sans-serif",
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.5px',
                fontWeight: 700,
                color: `rgba(26,23,48,0.5)`,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              Select Your Plan
            </p>
          )}

          {/* ── Free Plan card ── */}
          <div style={stickyCard(`${HL_YELLOW}66`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: INK,
                    margin: 0,
                  }}
                >
                  Freshman
                </h3>
                <p
                  style={{
                    fontFamily: "'Instrument Sans', sans-serif",
                    color: `rgba(26,23,48,0.55)`,
                    fontSize: '0.8rem',
                    margin: '2px 0 0',
                  }}
                >
                  Basic Features
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    color: INK,
                  }}
                >
                  $0
                </span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontSize: '0.7rem',
                    color: `rgba(26,23,48,0.5)`,
                  }}
                >
                  Forever
                </span>
              </div>
            </div>
            {isOnboarding && (
              <button
                onClick={() => onDowngrade()}
                disabled={loading}
                style={{ ...ghostBtn, marginTop: 14 }}
              >
                Continue with Free
              </button>
            )}
          </div>

          {/* ── Scholar Pro card ── */}
          <div style={stickyCard(`${HL_PINK}55`)}>
            {/* Billing toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div
                style={{
                  background: CARD_BG,
                  border: `1.5px solid ${INK}`,
                  borderRadius: 30,
                  display: 'flex',
                  padding: 3,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 3,
                    bottom: 3,
                    width: 'calc(50% - 3px)',
                    background: INK,
                    borderRadius: 26,
                    transition: 'left 0.3s',
                    left: billingCycle === 'monthly' ? 3 : 'calc(50%)',
                  }}
                />
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '6px 16px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    color: billingCycle === 'monthly' ? '#fff' : INK,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 24,
                    transition: 'color 0.2s',
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '6px 16px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    color: billingCycle === 'yearly' ? '#fff' : INK,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'color 0.2s',
                  }}
                >
                  Yearly{' '}
                  <span
                    style={{
                      fontSize: '0.6rem',
                      background: HL_GREEN,
                      color: INK,
                      padding: '1px 5px',
                      borderRadius: 4,
                      fontWeight: 800,
                    }}
                  >
                    -30%
                  </span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span
                  style={{
                    background: INK,
                    color: HL_YELLOW,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: "'Instrument Sans', sans-serif",
                  }}
                >
                  Most Popular
                </span>
                <h3
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: '1.3rem',
                    color: INK,
                    margin: '8px 0 0',
                  }}
                >
                  Scholar Pro
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: '2rem',
                    color: INK,
                  }}
                >
                  {billingCycle === 'yearly' ? '$49' : '$5.99'}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontSize: '0.75rem',
                    color: `rgba(26,23,48,0.55)`,
                  }}
                >
                  {billingCycle === 'yearly' ? '/ year' : '/ month'}
                </span>
              </div>
            </div>

            {/* Savings row */}
            <div
              style={{
                background: CARD_BG,
                border: `1.5px solid ${INK}`,
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 14,
                fontSize: '0.8rem',
                fontFamily: "'Instrument Sans', sans-serif",
              }}
            >
              {billingCycle === 'yearly' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: `rgba(26,23,48,0.55)` }}>Monthly Equivalent</span>
                    <span style={{ color: '#1a6e4c', fontWeight: 700 }}>$4.08/mo</span>
                  </div>
                  <div
                    style={{
                      borderTop: `1px solid rgba(26,23,48,0.1)`,
                      paddingTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      color: '#1a6e4c',
                      fontWeight: 700,
                    }}
                  >
                    <Sparkles size={12} /> You save $22.88 per year
                  </div>
                </div>
              ) : (
                <span style={{ color: `rgba(26,23,48,0.55)` }}>Billed monthly. Cancel anytime.</span>
              )}
            </div>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {[
                { icon: <Star size={12} />, label: 'Everything in Free' },
                { icon: <Sparkles size={12} />, label: 'Gemini AI Tutor' },
                { icon: <Zap size={12} />, label: 'Workout Analytics' },
              ].map(({ icon, label }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      background: `${HL_PINK}88`,
                      border: `1.5px solid ${INK}`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: INK,
                    }}
                  >
                    {icon}
                  </div>
                  <span
                    style={{
                      fontFamily: "'Instrument Sans', sans-serif",
                      fontSize: '0.88rem',
                      color: INK,
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleAction('upgrade', billingCycle === 'yearly' ? 49 : 5.99)}
              disabled={loading}
              style={primaryBtn}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : billingCycle === 'yearly' ? (
                'Subscribe Yearly'
              ) : (
                'Subscribe Monthly'
              )}
            </button>
          </div>

          {/* ── Lifetime Plan card ── */}
          <div
            style={{ ...stickyCard(`${HL_YELLOW}44`), cursor: 'pointer' }}
            onClick={() => handleAction('upgrade', 79)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h3
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: INK,
                    margin: 0,
                  }}
                >
                  Lifetime Access
                </h3>
                <span
                  style={{
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#8a6000',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Founders Edition
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: '1.4rem',
                    color: INK,
                  }}
                >
                  $79
                </span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: "'Instrument Sans', sans-serif",
                    fontSize: '0.7rem',
                    color: `rgba(26,23,48,0.5)`,
                  }}
                >
                  one-time
                </span>
              </div>
            </div>

            <p
              style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: '0.82rem',
                color: `rgba(26,23,48,0.65)`,
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              Pay once, own it forever. Compared to monthly, you start saving money after just{' '}
              <strong style={{ color: INK }}>13 months</strong>.
            </p>

            <span
              style={{
                display: 'inline-block',
                background: CARD_BG,
                border: `1.5px solid ${INK}`,
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: '0.7rem',
                color: INK,
                fontFamily: "'Instrument Sans', sans-serif",
                fontWeight: 600,
                marginBottom: 14,
              }}
            >
              Save $200+ over 4 years
            </span>

            <button disabled={loading} style={{ ...ghostBtn, pointerEvents: 'none' }}>
              Buy Lifetime
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center', paddingBottom: 32 }}>
        <p
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: '0.72rem',
            color: `rgba(26,23,48,0.35)`,
          }}
        >
          Payments are securely processed via Stripe. You can cancel anytime.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPage;
