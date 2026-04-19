import React from 'react';
import { X, Clock, MapPin, BookOpen, Sparkles, Trash2, Edit2 } from 'lucide-react';
import { ScheduleEvent, EventColorMap } from '../types';

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

  const color = eventColors[event.type] || '#64748b';

  const formatTimeDisplay = (time24?: string) => {
    if (!time24) return '--:--';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" onClick={onClose} />
      <div className="relative bg-[#1e1b2e] w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-y-auto overflow-x-hidden max-h-[90vh] animate-scale-in custom-scrollbar">
        
        {/* Header Band */}
        <div className="h-24 w-full flex items-center justify-center relative" style={{ backgroundColor: color }}>
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
           
           <div className="absolute top-4 right-4 z-20 flex gap-2">
               <button 
                  onClick={() => onEdit(event)}
                  className="bg-black/30 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/50 transition-colors"
                >
                  <Edit2 size={16} />
               </button>
             <button onClick={onClose} className="bg-black/30 text-white p-2 rounded-full backdrop-blur-md hover:bg-black/50 transition-colors">
              <X size={16} />
             </button>
           </div>
           
           {/* Icon Watermark */}
           <BookOpen size={100} className="absolute -bottom-4 -left-4 text-white/10 rotate-12" />
        </div>

        <div className="px-6 pb-6 relative z-10 -mt-8">
           {/* Title Card */}
           <div className="bg-[#130f1c] border border-white/10 rounded-2xl p-5 shadow-lg mb-6">
              <span 
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded mb-3 inline-block text-white shadow-sm"
                style={{ backgroundColor: color }}
              >
                {event.type}
              </span>
              
              <h2 className="text-2xl font-bold text-white leading-tight mb-1">{event.title}</h2>
              <p className="text-white/50 text-sm font-medium">{event.code}</p>
           </div>

           {/* Info List */}
           <div className="space-y-5 mb-8">
              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-violet-400 shrink-0">
                    <Clock size={20} />
                 </div>
                 <div>
                    <p className="text-xs text-white/40 font-medium mb-0.5">Time</p>
                    <p className="text-sm font-bold text-white">
                       {event.isRecurring ? event.dayOfWeek : event.date}
                    </p>
                    <p className="text-sm text-white/70">
                       {formatTimeDisplay(event.startTime)}
                    </p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-violet-400 shrink-0">
                    <MapPin size={20} />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs text-white/40 font-medium mb-0.5">Location</p>
                    <p className="text-sm font-bold text-white">{event.location}</p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-violet-400 shrink-0">
                    <BookOpen size={20} />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs text-white/40 font-medium mb-0.5">Notes</p>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                      {event.description || <span className="text-white/20 italic">No notes.</span>}
                    </p>
                 </div>
              </div>
           </div>

           {/* Action Buttons */}
           <div className="grid grid-cols-2 gap-3">
              {showConfirmDelete ? (
                <>
                  <button 
                    onClick={() => setShowConfirmDelete(false)}
                    className="py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      onDelete(event.id);
                      onClose();
                    }}
                    className="py-3 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-900/20"
                  >
                    Confirm Delete
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setShowConfirmDelete(true)}
                    className="py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> Delete
                  </button>
                  <button 
                    onClick={() => onStudyNow(event)}
                    className="py-3 rounded-xl bg-white text-black hover:bg-gray-200 transition-colors text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-white/10"
                  >
                    <Sparkles size={18} className="text-violet-600" /> Study
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