
import React, { useState } from 'react';
import { User, GraduationCap, Calendar, Building, Users, Sparkles, Loader2, LogOut, ArrowRight } from 'lucide-react';
import { styles } from '../theme';

interface CompleteProfileProps {
  onComplete: (data: { username: string; gender: string; major: string; year: string; college: string }) => Promise<void>;
  loading: boolean;
  onSignOut?: () => void;
}

const INK = '#1A1730';
const CARD_BG = '#FAFAF6';
const PAPER_BG = '#C7B2DB';
const HL_YELLOW = '#F6DF63';
const HL_RED = '#E56A5A';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(26,23,48,0.07)',
  border: `1.5px solid ${INK}`,
  borderRadius: '8px',
  padding: '9px 12px 9px 32px',
  color: INK,
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  fontSize: '0.82rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 700,
  color: `rgba(26,23,48,0.55)`,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '3px',
  display: 'block',
  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
};

const CompleteProfile: React.FC<CompleteProfileProps> = ({ onComplete, loading, onSignOut }) => {
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [college, setCollege] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    try {
      await onComplete({ username, gender, major, year, college });
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    }
  };

  const isFormValid = username.trim().length > 0;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 3000,
      background: PAPER_BG,
      backgroundImage: `
        linear-gradient(rgba(26,23,48,0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(26,23,48,0.08) 1px, transparent 1px)
      `,
      backgroundSize: '28px 28px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '300px',
        margin: '0 16px',
        background: CARD_BG,
        border: `1.5px solid ${INK}`,
        borderRadius: '14px',
        boxShadow: `8px 10px 0 ${INK}`,
        position: 'relative',
        zIndex: 10,
        maxHeight: '92vh',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{
              margin: '0 auto 10px',
              width: '40px',
              height: '40px',
              background: `${HL_YELLOW}`,
              border: `1.5px solid ${INK}`,
              borderRadius: '12px',
              boxShadow: `3px 3px 0 ${INK}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={18} color={INK} />
            </div>
            <h1 style={{
              fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
              fontWeight: 800,
              fontSize: '1.1rem',
              color: INK,
              margin: '0 0 3px',
            }}>
              Almost There!
            </h1>
            <p style={{
              fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              color: `rgba(26,23,48,0.55)`,
              fontSize: '0.72rem',
              margin: 0,
            }}>
              Finish setting up your profile.
            </p>
            {onSignOut && (
              <button
                onClick={onSignOut}
                title="Sign Out"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'transparent',
                  border: 'none',
                  color: `rgba(26,23,48,0.35)`,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                }}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Username */}
            <div>
              <label style={labelStyle}>
                Username <span style={{ color: HL_RED }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={13}
                  color={`rgba(26,23,48,0.45)`}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={inputStyle}
                  placeholder="Display name"
                  autoFocus
                />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: `rgba(26,23,48,0.1)` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: `rgba(26,23,48,0.35)`,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              }}>
                Optional
              </span>
              <div style={{ flex: 1, height: '1px', background: `rgba(26,23,48,0.1)` }} />
            </div>

            {/* Gender & Year row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Gender</label>
                <div style={{ position: 'relative' }}>
                  <Users
                    size={11}
                    color={`rgba(26,23,48,0.45)`}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', paddingRight: '8px' }}
                  >
                    <option value="" disabled>Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Year</label>
                <div style={{ position: 'relative' }}>
                  <Calendar
                    size={11}
                    color={`rgba(26,23,48,0.45)`}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', paddingRight: '8px' }}
                  >
                    <option value="" disabled>Select...</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                    <option value="5">Year 5+</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Major */}
            <div>
              <label style={labelStyle}>Major</label>
              <div style={{ position: 'relative' }}>
                <GraduationCap
                  size={13}
                  color={`rgba(26,23,48,0.45)`}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. CS"
                />
              </div>
            </div>

            {/* College */}
            <div>
              <label style={labelStyle}>College</label>
              <div style={{ position: 'relative' }}>
                <Building
                  size={13}
                  color={`rgba(26,23,48,0.45)`}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  style={inputStyle}
                  placeholder="University Name"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: `${HL_RED}22`,
                border: `1.5px solid ${HL_RED}`,
                color: HL_RED,
                fontSize: '0.72rem',
                fontWeight: 600,
                textAlign: 'center',
                fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{
                background: INK,
                color: '#fff',
                border: `1.5px solid ${INK}`,
                borderRadius: '10px',
                fontWeight: 800,
                fontFamily: "'Bricolage Grotesque', sans-serif",
                boxShadow: isFormValid ? `4px 4px 0 ${HL_YELLOW}` : 'none',
                cursor: isFormValid ? 'pointer' : 'not-allowed',
                padding: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                opacity: isFormValid ? 1 : 0.5,
                marginTop: '4px',
                transition: 'all 0.15s',
              }}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  Done <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
