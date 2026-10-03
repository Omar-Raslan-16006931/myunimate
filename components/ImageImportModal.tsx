import React, { useState } from 'react';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { ExtractedScheduleItem } from '../types';
import { parseScheduleImage } from '../services/geminiService';

// ── Design tokens ─────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_RED    = '#E56A5A';

interface ImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (events: ExtractedScheduleItem[]) => void;
}

const ImageImportModal: React.FC<ImageImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setError('');

    try {
      // Extract base64 part
      const base64Data = selectedImage.split(',')[1];
      const events = await parseScheduleImage(base64Data);
      
      if (events.length > 0) {
        onImport(events);
        onClose();
      } else {
        setError('No events could be found in the image. Try a clearer screenshot.');
      }
    } catch (err) {
      setError('Failed to process image.');
    } finally {
      setIsProcessing(false);
    }
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
        padding: '24px',
        textAlign: 'center',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            background: 'rgba(26,23,48,0.07)', border: `1.5px solid ${INK}`,
            borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex',
          }}
        >
          <X size={17} color={INK} />
        </button>

        {/* Upload icon */}
        <div style={{
          width: '60px', height: '60px',
          background: `${HL_YELLOW}60`,
          border: `1.5px solid ${INK}`,
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: `3px 3px 0 ${INK}`,
        }}>
           <Upload size={28} color={INK} />
        </div>

        <h2 style={{
          margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 800,
          color: INK, fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
        }}>Import Schedule</h2>
        <p style={{
          margin: '0 0 20px 0', fontSize: '0.88rem', color: `${INK}80`,
          fontFamily: "'Instrument Sans', 'Inter', sans-serif", lineHeight: 1.5,
        }}>
          Upload a screenshot of your timetable. Our AI will extract the classes automatically.
        </p>

        {selectedImage ? (
           <div style={{
             marginBottom: '20px', position: 'relative',
             borderRadius: '10px', overflow: 'hidden',
             border: `1.5px solid ${INK}`, maxHeight: '180px',
           }}>
             <img src={selectedImage} alt="Preview" style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
             <button
               onClick={() => setSelectedImage(null)}
               style={{
                 position: 'absolute', top: '8px', right: '8px',
                 background: CARD_BG, border: `1.5px solid ${INK}`,
                 borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex',
               }}
             >
               <X size={13} color={INK} />
             </button>
           </div>
        ) : (
          <label style={{
            display: 'block', width: '100%',
            border: `2px dashed rgba(26,23,48,0.3)`,
            borderRadius: '12px', padding: '32px 16px',
            marginBottom: '20px', cursor: 'pointer',
            background: 'rgba(26,23,48,0.03)',
            boxSizing: 'border-box',
            transition: 'background 0.15s',
          }}>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{display: 'none'}} />
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: `${INK}60`}}>
              <ImageIcon size={24} color={`${INK}60`} />
              <span style={{fontSize: '0.8rem', fontWeight: 600, fontFamily: "'Instrument Sans', 'Inter', sans-serif"}}>Tap to upload</span>
            </div>
          </label>
        )}

        {error && (
          <p style={{
            color: HL_RED, fontSize: '0.8rem', marginBottom: '12px',
            background: `${HL_RED}15`, padding: '8px 12px', borderRadius: '8px',
            border: `1px solid ${HL_RED}50`, textAlign: 'left',
            fontFamily: "'Instrument Sans', 'Inter', sans-serif",
          }}>
            {error}
          </p>
        )}

        <button 
          onClick={handleProcess}
          disabled={!selectedImage || isProcessing}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.95rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
            cursor: (!selectedImage || isProcessing) ? 'not-allowed' : 'pointer',
            ...( (!selectedImage || isProcessing)
              ? {
                  background: 'rgba(26,23,48,0.07)',
                  color: `${INK}40`,
                  border: `1.5px solid rgba(26,23,48,0.2)`,
                  boxShadow: 'none',
                }
              : {
                  background: INK,
                  color: '#fff',
                  border: `1.5px solid ${INK}`,
                  boxShadow: `4px 4px 0 ${HL_YELLOW}`,
                }),
          }}
        >
          {isProcessing ? (
             <><Loader2 size={17} style={{animation: 'spin 1s linear infinite'}} /> Processing...</>
          ) : (
             'Analyze & Import'
          )}
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ImageImportModal;