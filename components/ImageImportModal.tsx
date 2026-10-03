import React, { useState } from 'react';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { ExtractedScheduleItem } from '../types';
import { parseScheduleImage } from '../services/geminiService';

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
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#06262a] w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl p-6 text-center animate-scale-in overflow-y-auto max-h-[90vh] custom-scrollbar">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X size={24} />
        </button>

        <div className="w-16 h-16 bg-teal-600/20 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-400">
           <Upload size={32} />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Import Schedule</h2>
        <p className="text-sm text-white/60 mb-6">Upload a screenshot of your timetable. Our AI will extract the classes automatically.</p>

        {selectedImage ? (
           <div className="mb-6 relative rounded-xl overflow-hidden border border-white/10 max-h-48 mx-auto">
             <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
             <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white"><X size={14}/></button>
           </div>
        ) : (
          <label className="block w-full border-2 border-dashed border-white/10 rounded-xl p-8 mb-6 cursor-pointer hover:bg-white/5 transition-colors">
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <div className="flex flex-col items-center gap-2 text-white/40">
              <ImageIcon size={24} />
              <span className="text-xs">Tap to upload</span>
            </div>
          </label>
        )}

        {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

        <button 
          onClick={handleProcess}
          disabled={!selectedImage || isProcessing}
          className="w-full bg-teal-600 disabled:bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-teal-500 transition-colors flex justify-center items-center gap-2"
        >
          {isProcessing ? (
             <><Loader2 size={18} className="animate-spin" /> Processing...</>
          ) : (
             'Analyze & Import'
          )}
        </button>
      </div>
    </div>
  );
};

export default ImageImportModal;