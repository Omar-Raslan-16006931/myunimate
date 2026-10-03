import React from 'react';
import { X, Clock, MapPin, BookOpen, Sparkles, Trash2, Edit2 } from 'lucide-react';
import { ScheduleEvent, EventColorMap } from '../types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_RED    = '#E56A5A';

interface EventDetailsModalProps {
  event: ScheduleEvent | null;
  onClose: () => void;
  onStudyNow: (event: ScheduleEvent) => void;
  onDelete: (id: string) => void;
  onEdit: (event: ScheduleEvent) => void;
  eventColors: EventColorMap;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, onClose, onStudyNow, onDelete, onEdit, eventColors }) => {
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  if (!event) return null;

  const color = eventColors[event.type] || '#8CE3B7';

  const formatTimeDisplay = (time24?: string) => {
    if (!time24) return '--:--';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const infoIconBox: React.CSSProperties = {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: `${color}30`,
    border: `1.5px solid ${INK}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(26,23,48,0.6)',
      }}
    >
      {/* Backdrop */}
      <div style={{position: 'absolute', inset: 0}} onClick={onClose} />

      {/* Modal card */}
      <div style={{
        position: 'relative',
        background: CARD_BG,
        width: '100%',
        maxWidth: '360px',
        borderRadius: '14px',
        border: `1.5px solid ${INK}`,
        boxShadow: `8px 10px 0 ${INK}`,
        overflow: 'hidden',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        
        {/* Colour band header */}
        <div style={{height: '88px', width: '100%', background: color, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {/* Subtle ink overlay at bottom for readability */}
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(26,23,48,0.18) 100%)'}} />

          {/* Watermark icon */}
          <BookOpen size={90} style={{position: 'absolute', bottom: '-6px', left: '-8px', color: 'rgba(26,23,48,0.08)', transform: 'rotate(12deg)'}} />

          {/* Action buttons */}
          <div style={{position: 'absolute', top: '12px', right: '12px', zIndex: 10, display: 'flex', gap: '8px'}}>
              <button 
                 onClick={() => onEdit(event)}
                 style={{background: CARD_BG, border: `1.5px solid ${INK}`, color: INK, padding: '7px', borderRadius: '8px', cursor: 'pointer', display: 'flex', boxShadow: `2px 2px 0 ${INK}`}}
               >
                 <Edit2 size={15} color={INK} />
              </button>
            <button
              onClick={onClose}
              style={{background: CARD_BG, border: `1.5px solid ${INK}`, color: INK, padding: '7px', borderRadius: '8px', cursor: 'pointer', display: 'flex', boxShadow: `2px 2px 0 ${INK}`}}
            >
              <X size={15} color={INK} />
            </button>
          </div>
        </div>

        <div style={{padding: '0 20px 20px 20px', marginTop: '-28px', position: 'relative'}}>
           {/* Title card */}
           <div style={{
             background: CARD_BG,
             border: `1.5px solid ${INK}`,
             borderRadius: '12px',
             padding: '16px',
             boxShadow: `4px 4px 0 ${INK}`,
             marginBottom: '20px',
           }}>
              <span 
                style={{
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.6px', padding: '3px 8px', borderRadius: '4px',
                  marginBottom: '10px', display: 'inline-block',
                  background: color, color: INK, border: `1px solid ${INK}`,
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                }}
              >
                {event.type}
              </span>
              
              <h2 style={{margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 800, color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", lineHeight: 1.2}}>{event.title}</h2>
              <p style={{margin: 0, color: `${INK}80`, fontSize: '0.88rem', fontFamily: "'Instrument Sans', 'Inter', sans-serif", fontWeight: 500}}>{event.code}</p>
           </div>

           {/* Info list */}
           <div style={{display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px'}}>
              <div style={{display: 'flex', gap: '14px', alignItems: 'flex-start'}}>
                 <div style={infoIconBox}>
                    <Clock size={18} color={INK} />
                 </div>
                 <div>
                    <p style={{margin: '0 0 2px 0', fontSize: '0.68rem', fontWeight: 700, color: `${INK}70`, textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>Time</p>
                    <p style={{margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: 700, color: INK, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>
                       {event.isRecurring ? event.dayOfWeek : event.date}
                    </p>
                    <p style={{margin: 0, fontSize: '0.85rem', color: `${INK}90`, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>
                       {formatTimeDisplay(event.startTime)}
                    </p>
                 </div>
              </div>

              <div style={{display: 'flex', gap: '14px', alignItems: 'flex-start'}}>
                 <div style={infoIconBox}>
                    <MapPin size={18} color={INK} />
                 </div>
                 <div style={{flex: 1}}>
                    <p style={{margin: '0 0 2px 0', fontSize: '0.68rem', fontWeight: 700, color: `${INK}70`, textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>Location</p>
                    <p style={{margin: 0, fontSize: '0.9rem', fontWeight: 700, color: INK, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>{event.location || <span style={{color: `${INK}50`, fontWeight: 400, fontStyle: 'italic'}}>Not specified</span>}</p>
                 </div>
              </div>

              <div style={{display: 'flex', gap: '14px', alignItems: 'flex-start'}}>
                 <div style={infoIconBox}>
                    <BookOpen size={18} color={INK} />
                 </div>
                 <div style={{flex: 1}}>
                    <p style={{margin: '0 0 2px 0', fontSize: '0.68rem', fontWeight: 700, color: `${INK}70`, textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>Notes</p>
                    <p style={{margin: 0, fontSize: '0.85rem', color: `${INK}90`, lineHeight: '1.5', fontFamily: "'Instrument Sans', 'Inter', sans-serif", whiteSpace: 'pre-wrap'}}>
                      {event.description || <span style={{color: `${INK}40`, fontStyle: 'italic'}}>No notes.</span>}
                    </p>
                 </div>
              </div>
           </div>

           {/* Action Buttons */}
           <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
              {showConfirmDelete ? (
                <>
                  <button 
                    onClick={() => setShowConfirmDelete(false)}
                    style={{padding: '12px', borderRadius: '10px', background: 'rgba(26,23,48,0.07)', border: `1.5px solid ${INK}`, color: INK, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      onDelete(event.id);
                      onClose();
                    }}
                    style={{padding: '12px', borderRadius: '10px', background: HL_RED, border: `1.5px solid ${INK}`, color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: `3px 3px 0 ${INK}`, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}
                  >
                    Confirm Delete
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setShowConfirmDelete(true)}
                    style={{padding: '12px', borderRadius: '10px', background: 'rgba(26,23,48,0.05)', border: `1.5px solid rgba(26,23,48,0.3)`, color: `${INK}80`, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                  <button 
                    onClick={() => onStudyNow(event)}
                    style={{padding: '12px', borderRadius: '10px', background: INK, border: `1.5px solid ${INK}`, color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: `4px 4px 0 ${HL_YELLOW}`, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif"}}
                  >
                    <Sparkles size={16} /> Study
                  </button>
                </>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default EventDetailsModal;