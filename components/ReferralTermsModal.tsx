
import React from 'react';
import { X, FileText } from 'lucide-react';
import { styles } from '../theme';

interface ReferralTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReferralTermsModal: React.FC<ReferralTermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div 
        style={{...styles.modalContent, maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden'}} 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1e1b2e]">
            <div className="flex items-center gap-2">
                <FileText size={18} className="text-white/60" />
                <h2 className="text-lg font-bold text-white">Referral Program Terms</h2>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white">
                <X size={20} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 text-sm text-white/70 leading-relaxed custom-scrollbar">
            <p className="mb-4 text-xs text-white/40">Last Updated: January 5, 2026</p>
            <p className="mb-4">By participating in the UniMate Referral Program ("Program"), you agree to the following terms and conditions.</p>

            <h3 className="text-white font-bold mb-2 mt-4">1. Eligibility</h3>
            <p className="mb-2">1.1. <strong>Participants:</strong> This Program is open to all registered users of UniMate with a verified account.</p>
            <p className="mb-4">1.2. <strong>Unique Code:</strong> Each user is assigned one (1) unique referral code. You may not create multiple accounts to generate additional codes.</p>

            <h3 className="text-white font-bold mb-2 mt-4">2. Earning Commissions</h3>
            <p className="mb-2">2.1. <strong>Commission Rate:</strong> You will earn a commission equal to 20% of the transaction value paid by a referred user ("Referee") for their first subscription or lifetime membership purchase.</p>
            <p className="mb-2">2.2. <strong>One-Time Commission:</strong> Commission is paid once per unique Referee. You will not receive recurring commissions on subsequent monthly renewals from the same Referee.</p>
            <p className="mb-2">2.3. <strong>Qualifying Purchase:</strong> A commission is only generated if the Referee:</p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
                <li>Creates a new, unique UniMate account.</li>
                <li>Uses your specific referral code during sign-up or checkout.</li>
                <li>Successfully completes a payment for a paid plan (Monthly or Lifetime).</li>
                <li><strong>Exclusion:</strong> Sign-ups for Free Trials, free tier accounts, or discounted access where the transaction value is $0.00 do not generate a commission. Commission is only credited if and when the Free Trial converts into a paid subscription.</li>
                <li>Does not request a refund within 7 days of purchase.</li>
            </ul>

            <h3 className="text-white font-bold mb-2 mt-4">3. Wallet & Redemption</h3>
            <p className="mb-2">3.1. <strong>Wallet Balance:</strong> Commissions are credited to your internal UniMate Wallet. This balance has no cash value outside of the specific redemption options listed below.</p>
            <p className="mb-2">3.2. <strong>Usage Options:</strong> You may use your Wallet balance to:</p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
                <li><strong>Purchase Membership:</strong> Use funds to upgrade your own UniMate account to Pro.</li>
                <li><strong>Request Cashout:</strong> Withdraw funds to your PayPal account.</li>
            </ul>

            <h3 className="text-white font-bold mb-2 mt-4">4. Cashout Policy (PayPal Only)</h3>
            <p className="mb-2">4.1. <strong>Minimum Threshold:</strong> You must have a minimum balance of $20.00 USD to request a cashout.</p>
            <p className="mb-2">4.2. <strong>Payment Method:</strong> Cashouts are processed exclusively via PayPal. You must provide a valid PayPal email address matching your user profile or verified identity.</p>
            <p className="mb-2">4.3. <strong>Processing Time:</strong> Cashout requests are reviewed and processed manually. Please allow up to 14 days (2 weeks) for funds to appear in your PayPal account.</p>
            <p className="mb-4">4.4. <strong>Fees:</strong> UniMate is not responsible for any transaction fees deducted by PayPal during the transfer.</p>

            <h3 className="text-white font-bold mb-2 mt-4">5. Prohibited Activities (Anti-Fraud)</h3>
            <p className="mb-2">To ensure the integrity of the Program, the following activities result in immediate disqualification and forfeiture of all wallet funds:</p>
            <p className="mb-2">5.1. <strong>Self-Referrals:</strong> You may not use your own referral code to create additional accounts for yourself. We use device fingerprinting and IP tracking to detect this.</p>
            <p className="mb-2">5.2. <strong>Fake Accounts:</strong> Creating bot accounts or using temporary emails to simulate referrals is strictly prohibited.</p>
            <p className="mb-2">5.3. <strong>Spamming:</strong> You may not distribute your code via bulk email (SPAM), automated bots, or by posting on UniMate's official social media channels.</p>
            <p className="mb-4">5.4. <strong>Chargebacks:</strong> If a Referee requests a refund or issues a chargeback on their payment, the commission earned from that transaction will be deducted from your Wallet balance immediately.</p>

            <h3 className="text-white font-bold mb-2 mt-4">6. Rights & Termination</h3>
            <p className="mb-2">6.1. <strong>Right to Review:</strong> UniMate reserves the right to review and investigate all referral activities and to suspend accounts or modify referrals in our sole discretion as deemed fair and appropriate.</p>
            <p className="mb-4">6.2. <strong>Program Changes:</strong> UniMate reserves the right to modify the commission rate, minimum cashout amount, or terminate the Program at any time without prior notice. Unclaimed wallet balances at the time of termination may be forfeited if not claimed within a grace period.</p>
        </div>
        <div className="p-4 border-t border-white/10 bg-[#1e1b2e]">
            <button onClick={onClose} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ReferralTermsModal;
    