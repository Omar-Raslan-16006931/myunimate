import React from 'react';
import { X, Download, Calendar, Mail } from 'lucide-react';
import { ScheduleEvent } from '../types';
import { downloadICS } from '../utils/ics';

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_BLUE   = '#9ECFFF';
const HL_GREEN  = '#8CE3B7';

interface SyncCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ScheduleEvent[];
}

const SyncCalendarModal: React.FC<SyncCalendarModalProps> = ({ isOpen, onClose, events }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    downloadICS(events, 'unimate_schedule.ics');
  };

  const instructionCard = (
    accent: string,
    icon: React.ReactNode,
    title: string,
    steps: React.ReactNode[]
  ) => (
    <div style={{
      background: `${accent}30`,
      border: `1.5px solid ${INK}`,
      borderRadius: '12px',
      padding: '16px',
      boxShadow: `3px 3px 0 ${INK}`,
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
        {icon}
        <h3 style={{margin: 0, fontSize: '0.95rem', fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}>{title}</h3>
      </div>
      <ol style={{
        margin: 0, paddingLeft: '18px',
        color: `${INK}85`, fontSize: '0.85rem', lineHeight: '1.7',
        fontFamily: "'Instrument Sans', 'Inter', sans-serif",
      }}>
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(26,23,48,0.6)',
      }}
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        style={{
          background: CARD_BG,
          border: `1.5px solid ${INK}`,
          borderRadius: '14px',
          boxShadow: `8px 10px 0 ${INK}`,
          width: '100%',
          maxWidth: '480px',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1.5px solid rgba(26,23,48,0.12)`,
          background: `${HL_YELLOW}40`,
          flexShrink: 0,
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <div style={{padding: '7px', background: INK, borderRadius: '9px', display: 'flex', border: `1.5px solid ${INK}`}}>
              <Calendar size={18} color="#fff" />
            </div>
            <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}>Sync with Calendar</h2>
          </div>
          <button
            onClick={onClose}
            style={{background: 'rgba(26,23,48,0.07)', border: `1.5px solid ${INK}`, borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex'}}
          >
            <X size={17} color={INK} />
          </button>
        </div>

        {/* Body */}
        <div style={{padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px'}}>
          <p style={{margin: 0, color: `${INK}85`, fontSize: '0.9rem', lineHeight: '1.6', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>
            To sync your schedule with Google Calendar or Outlook, download the ICS file and import it into your preferred calendar application.
          </p>

          {/* Download button */}
          <button 
            onClick={handleDownload}
            style={{
              background: INK,
              color: '#fff',
              border: `1.5px solid ${INK}`,
              borderRadius: '10px',
              fontWeight: 700,
              boxShadow: `4px 4px 0 ${HL_YELLOW}`,
              cursor: 'pointer',
              padding: '13px 18px',
              fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.95rem',
              width: '100%',
            }}
          >
            <Download size={18} />
            Download Schedule (.ics)
          </button>

          {/* Instruction cards */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
            {instructionCard(
              HL_BLUE,
              <Calendar size={18} color="#4285F4" />,
              'Google Calendar',
              [
                'Open Google Calendar on your computer.',
                <>In the top right, click Settings (gear icon) &gt; <strong>Settings</strong>.</>,
                <>On the left menu, click <strong>Import &amp; export</strong>.</>,
                <>Click <strong>Select file from your computer</strong> and choose the downloaded <code style={{fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', background: 'rgba(26,23,48,0.08)', padding: '1px 4px', borderRadius: '3px'}}>.ics</code> file.</>,
                'Choose which calendar to add the events to.',
                <>Click <strong>Import</strong>.</>,
              ]
            )}

            {instructionCard(
              HL_GREEN,
              <Mail size={18} color="#0078D4" />,
              'Outlook Calendar',
              [
                'Open Outlook Calendar on your computer.',
                <><strong>Add calendar</strong> in the left pane.</>,
                <>Select <strong>Upload from file</strong>.</>,
                <>Click <strong>Browse</strong> and choose the downloaded <code style={{fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', background: 'rgba(26,23,48,0.08)', padding: '1px 4px', borderRadius: '3px'}}>.ics</code> file.</>,
                <>Select a calendar to import into and click <strong>Import</strong>.</>,
              ]
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncCalendarModal;
