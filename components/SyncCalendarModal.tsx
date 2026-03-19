import React from 'react';
import { X, Download, Calendar, Mail } from 'lucide-react';
import { theme, styles } from '../theme';
import { ScheduleEvent } from '../types';
import { downloadICS } from '../utils/ics';

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

  return (
    <div style={styles.modalOverlay}>
      <div style={{...styles.modalContent, maxWidth: '500px'}}>
        <div style={styles.modalHeader}>
          <h2 style={{margin: 0, fontSize: '1.25rem', color: theme.text}}>Sync with Calendar</h2>
          <button onClick={onClose} style={{background: 'none', border: 'none', color: theme.text, cursor: 'pointer'}}>
            <X size={20} />
          </button>
        </div>

        <div style={{padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <p style={{margin: 0, color: theme.text, fontSize: '0.95rem', lineHeight: '1.5'}}>
            To sync your schedule with Google Calendar or Outlook, download the ICS file and import it into your preferred calendar application.
          </p>

          <button 
            onClick={handleDownload}
            style={{
              ...styles.button,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              fontSize: '1rem'
            }}
          >
            <Download size={18} />
            Download Schedule (.ics)
          </button>

          <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px'}}>
            <div style={{background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                <Calendar size={18} color="#4285F4" />
                <h3 style={{margin: 0, fontSize: '1rem', color: theme.text}}>Google Calendar</h3>
              </div>
              <ol style={{margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: '1.6'}}>
                <li>Open Google Calendar on your computer.</li>
                <li>In the top right, click Settings (gear icon) &gt; <strong>Settings</strong>.</li>
                <li>On the left menu, click <strong>Import & export</strong>.</li>
                <li>Click <strong>Select file from your computer</strong> and choose the downloaded <code>.ics</code> file.</li>
                <li>Choose which calendar to add the events to.</li>
                <li>Click <strong>Import</strong>.</li>
              </ol>
            </div>

            <div style={{background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
                <Mail size={18} color="#0078D4" />
                <h3 style={{margin: 0, fontSize: '1rem', color: theme.text}}>Outlook Calendar</h3>
              </div>
              <ol style={{margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: '1.6'}}>
                <li>Open Outlook Calendar on your computer.</li>
                <li>Click <strong>Add calendar</strong> in the left pane.</li>
                <li>Select <strong>Upload from file</strong>.</li>
                <li>Click <strong>Browse</strong> and choose the downloaded <code>.ics</code> file.</li>
                <li>Select a calendar to import into and click <strong>Import</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncCalendarModal;
