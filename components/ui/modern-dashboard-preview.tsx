import React, { useState } from 'react';
import {
  LayoutGrid, Calendar, Folder, Settings,
  Calculator, CheckSquare, Brain, Plus,
  FileText, ChevronLeft, ChevronRight,
  MapPin, Clock, Dumbbell
} from 'lucide-react';

// Home / Dashboard tab
const HomeTab = () => (
  <div className="flex flex-col h-full px-3 pt-3 pb-16 overflow-hidden">
    {/* Header */}
    <div className="flex items-start justify-between mb-3">
      <div>
        <div className="text-white text-2xl font-black leading-none">12:57 AM</div>
        <div className="text-teal-400 text-xs font-bold mt-0.5">Friday, May 15</div>
        <div className="text-white/50 text-[10px] mt-0.5">Good Morning, <span className="text-white font-bold">Admin</span></div>
      </div>
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <FileText size={14} className="text-white/60" />
        </div>
        <div className="w-8 h-8 rounded-full bg-[#0f9d8d] flex items-center justify-center shadow-lg shadow-teal-700/50">
          <Brain size={14} className="text-white" />
        </div>
      </div>
    </div>

    {/* Up Next Card */}
    <div className="rounded-2xl p-3 mb-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #5a6e00, #3d4a00)' }}>
      <div className="text-[9px] font-black text-yellow-300/70 uppercase tracking-widest mb-1">Up Next</div>
      <div className="text-white font-black text-base leading-tight">Media Project</div>
      <div className="mt-1.5 inline-flex bg-black/20 rounded-md px-2 py-0.5 text-[9px] text-white/60">No Code</div>
      <div className="mt-2 flex items-center gap-1.5 bg-black/20 rounded-xl px-2.5 py-1.5 w-fit">
        <Clock size={10} className="text-white/60" />
        <span className="text-[10px] text-white font-bold">Event</span>
        <span className="text-[10px] text-white/50">11:30 PM – 1:00 AM</span>
      </div>
    </div>

    {/* Widget Grid */}
    <div className="grid grid-cols-3 gap-2 mb-3">
      {/* Gym – coming soon */}
      <div className="col-span-1 rounded-xl bg-[#1a1a2e] border border-white/10 p-2.5 relative">
        <div className="absolute top-1.5 right-1.5 bg-white/10 rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white/40 uppercase">Soon</div>
        <Dumbbell size={14} className="text-white/30 mb-4" />
        <div className="text-white/40 text-[10px] font-bold">Gym</div>
        <div className="text-white/20 text-[8px]">Coming Soon</div>
      </div>
      {/* Grades */}
      <div className="col-span-2 rounded-xl p-2.5" style={{ background: 'linear-gradient(135deg, #0f4a4a, #0a3535)' }}>
        <Calculator size={14} className="text-teal-300 mb-3" />
        <div className="text-white font-black text-sm">Grades</div>
        <div className="text-teal-300/70 text-[9px]">GPA Calculator</div>
      </div>
      {/* To-Do */}
      <div className="col-span-1 rounded-xl p-2.5" style={{ background: 'linear-gradient(135deg, #6b1a3a, #3d0f22)' }}>
        <CheckSquare size={14} className="text-pink-300 mb-3" />
        <div className="text-white font-black text-xs">To-Do</div>
        <div className="text-pink-300/60 text-[8px]">Task Manager</div>
      </div>
      {/* Add Event */}
      <div className="col-span-1 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 p-2">
        <Plus size={16} className="text-white/30" />
        <span className="text-[8px] text-white/30 font-medium">Add Event</span>
      </div>
      {/* Smart Import */}
      <div className="col-span-1 rounded-xl bg-[#1a1a2e] border border-white/10 flex flex-col items-center justify-center gap-1 p-2">
        <Brain size={14} className="text-teal-400" />
        <span className="text-[8px] text-teal-300 font-bold text-center leading-tight">Smart Import</span>
      </div>
    </div>

    {/* Upcoming Tests */}
    <div className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
      <FileText size={10} /> Upcoming Tests
    </div>
    <div className="flex flex-col gap-1.5">
      {[
        { type: 'ASSIGNMENT', name: 'Media project', date: 'May 15', time: '11:30 PM', color: '#a3c700', urgent: false },
        { type: 'QUIZ', name: 'Info sec quiz 3', date: 'May 17', time: '8:45 AM', color: '#ef4444', urgent: false },
        { type: 'EXAM', name: 'Cps final', date: 'May 17', time: '12:00 PM', color: '#ef4444', urgent: true },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between bg-[#13102a] rounded-xl px-3 py-2 border-l-2 relative overflow-hidden" style={{ borderLeftColor: item.color }}>
          <div>
            <div className="text-[8px] font-black uppercase tracking-wider" style={{ color: item.color }}>{item.type}</div>
            <div className="text-white text-[10px] font-bold">{item.name}</div>
          </div>
          <div className="text-right">
            <div className="text-white text-[10px] font-bold">{item.date}</div>
            <div className="text-white/40 text-[9px]">{item.time}</div>
            {item.urgent && <div className="text-teal-400 text-[8px] font-bold">3rd</div>}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Schedule tab
const ScheduleTab = () => {
  const days = ['SUN\nMay 10', 'MON\nMay 11', 'TUE\nMay 12', 'WED\nMay 13', 'THU\nMay 14', 'FRI\nMay 15'];
  const periods = ['1ST\n8:30–10:00', '2ND\n10:15–11:45', '3RD\n12:00–1:30'];
  const classes: Record<string, { name: string; room: string; type: string; color: string }> = {
    'SUN-0': { name: 'CPS Quiz', room: 'M.014', type: 'QUIZ', color: '#ef4444' },
    'MON-1': { name: 'Mathematics', room: 'A3.128', type: 'LECT', color: '#374151' },
    'MON-2': { name: 'Media', room: 'INCS409', type: 'LECT', color: '#0e7490' },
    'TUE-0': { name: 'Software En...', room: 'S2.519', type: 'LAB', color: '#0891b2' },
    'TUE-1': { name: 'Software En...', room: 'A3.228', type: 'LECT', color: '#374151' },
    'WED-1': { name: 'Data Science', room: 'A3.328', type: 'LECT', color: '#374151' },
    'WED-2': { name: 'Inform...', room: 'A3.22', type: 'LECT', color: '#374151' },
  };

  return (
    <div className="flex flex-col h-full pb-16 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-white text-xl font-black">Schedule</span>
          <div className="bg-[#2d1f5e] rounded-full px-3 py-1 flex items-center gap-1.5 text-white text-[10px] font-bold">
            Main Schedule <span className="text-white/40">▾</span>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-white/60 text-xs">•••</span>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 mb-2">
        <ChevronLeft size={14} className="text-white/40" />
        <span className="text-white text-xs font-bold">May 9 – May 15</span>
        <ChevronRight size={14} className="text-white/40" />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-2">
        <div className="grid text-[8px]" style={{ gridTemplateColumns: '36px repeat(3, 1fr)' }}>
          {/* Period headers */}
          <div className="bg-[#0d0b1a]" />
          {periods.map((_, i) => (
            <div key={i} className="bg-[#1a1030] border border-white/5 px-1 py-1.5 text-center">
              <div className="text-teal-400 font-black">{['1ST', '2ND', '3RD'][i]}</div>
              <div className="text-white/30">{['8:30–10:00', '10:15–11:45', '12:00–1:30'][i]}</div>
            </div>
          ))}
          {/* Rows */}
          {days.map((day, di) => {
            const [d, date] = day.split('\n');
            const isFriday = di === 5;
            return (
              <React.Fragment key={di}>
                <div className={`border border-white/5 px-1 py-2 flex flex-col items-center justify-center ${isFriday ? 'border-l-2 border-l-teal-500' : ''}`}>
                  <span className={`font-black ${isFriday ? 'text-teal-400' : 'text-white/60'}`}>{d}</span>
                  <span className="text-white/30 text-[7px]">{date}</span>
                </div>
                {[0, 1, 2].map((pi) => {
                  const key = `${d}-${pi}`;
                  const cls = classes[key];
                  return (
                    <div key={pi} className="border border-white/5 p-1 min-h-[44px]">
                      {cls && (
                        <div className="rounded-md p-1 h-full" style={{ background: cls.color }}>
                          <div className="text-white font-bold text-[8px] leading-tight truncate">{cls.name}</div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <MapPin size={6} className="text-white/60" />
                            <span className="text-white/60 text-[7px]">{cls.room}</span>
                          </div>
                          <div className="mt-0.5 bg-black/20 rounded text-[6px] font-bold text-white/70 px-1 py-0.5 w-fit">{cls.type}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Materials tab
const FilesTab = () => (
  <div className="flex flex-col h-full px-3 pt-3 pb-16 overflow-hidden">
    <div className="flex items-center justify-between mb-1">
      <div>
        <div className="flex items-center gap-2">
          <ChevronLeft size={16} className="text-white/40" />
          <span className="text-white text-xl font-black">Materials</span>
        </div>
        <div className="text-white/40 text-[10px] ml-6">Documents & Resources</div>
      </div>
      <div className="bg-[#1a1030] border border-teal-500/30 rounded-full px-2.5 py-1 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Background Sync</span>
      </div>
    </div>
    <div className="bg-[#13102a] rounded-xl px-3 py-2 mb-3 mt-2">
      <span className="text-white/30 text-xs">Search files...</span>
    </div>
    <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Folders</div>
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[['College 4th', '3 items'], ['Math', '2 items'], ['Sem 4 Gradi...', '7 items']].map(([name, count]) => (
        <div key={name} className="bg-[#13102a] rounded-xl p-2.5 border border-white/5">
          <div className="flex justify-end mb-1"><span className="text-white/20 text-xs">⋮</span></div>
          <Folder size={20} className="text-yellow-400 mb-1.5 mx-auto block" />
          <div className="text-white text-[10px] font-bold text-center truncate">{name}</div>
          <div className="text-white/30 text-[8px] text-center">{count}</div>
        </div>
      ))}
    </div>
    <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Files</div>
    <div className="flex flex-col gap-1.5">
      {[
        { icon: '📄', name: 'Summer Semester2026 Fa...', size: '0.15 MB', date: '2026-04-23' },
        { icon: '🖼', name: 'Grading scheme.png', size: '1.87 MB', date: '2026-04-28' },
      ].map((f, i) => (
        <div key={i} className="flex items-center gap-2.5 bg-[#13102a] rounded-xl px-3 py-2.5 border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-[#1e1640] flex items-center justify-center text-base shrink-0">{f.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[10px] font-bold truncate">{f.name}</div>
            <div className="text-white/30 text-[8px]">{f.size} • {f.date}</div>
          </div>
          <span className="text-teal-400 text-[10px]">👁</span>
        </div>
      ))}
    </div>
  </div>
);

// Settings tab
const SettingsTab = () => (
  <div className="flex flex-col h-full px-3 pt-3 pb-16 overflow-hidden">
    <div className="mb-4">
      <h1 className="text-white text-2xl font-black">Settings</h1>
      <p className="text-white/40 text-[10px]">Manage your university operating system</p>
    </div>
    {[
      {
        label: 'Personal & Identity',
        items: [{ icon: '👤', name: 'Account Profile', badge: 'Edit', color: '#3b82f6' }],
      },
      {
        label: 'Academic Engine',
        items: [
          { icon: '📚', name: 'Schedules & Profiles', badge: '2 Profiles', color: '#0f9d8d' },
          { icon: '📊', name: 'Timeline Grid', badge: '', color: '#ec4899' },
          { icon: '🎨', name: 'Theme Colors', badge: '', color: '#f59e0b' },
        ],
      },
    ].map((group) => (
      <div key={group.label} className="bg-[#13102a] rounded-2xl border border-white/5 mb-3 overflow-hidden">
        <div className="px-4 py-2.5 text-[9px] font-black text-white/30 uppercase tracking-widest border-b border-white/5">{group.label}</div>
        {group.items.map((item, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < group.items.length - 1 ? 'border-b border-white/5' : ''}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: `${item.color}22` }}>
              {item.icon}
            </div>
            <span className="text-white font-bold text-sm flex-1">{item.name}</span>
            {item.badge && (
              <span className="bg-white/10 text-white/60 text-[9px] font-bold px-2 py-1 rounded-lg">{item.badge}</span>
            )}
            <span className="text-white/20 text-xs">›</span>
          </div>
        ))}
      </div>
    ))}
  </div>
);

// ── Main export ──────────────────────────────────────────────────────────────
export const ModernDashboardPreview = () => {
  const [tab, setTab] = useState<'home' | 'schedule' | 'files' | 'settings'>('home');

  // Wrap with a click handler on the bottom nav area
  const handleTabClick = (t: typeof tab) => setTab(t);

  return (
    <div className="w-full h-full bg-[#0d0b1a] rounded-2xl overflow-hidden relative select-none">
      {/* Status bar */}
      <div className="h-5 bg-[#0a0818] flex items-center justify-between px-4">
        <span className="text-white/30 text-[8px]">9:41</span>
        <div className="flex gap-1 items-center">
          <span className="text-white/30 text-[8px]">●●●</span>
        </div>
      </div>

      {/* Content area */}
      <div className="relative" style={{ height: 'calc(100% - 20px)' }}>
        {tab === 'home' && <HomeTab />}
        {tab === 'schedule' && <ScheduleTab />}
        {tab === 'files' && <FilesTab />}
        {tab === 'settings' && <SettingsTab />}

        {/* Bottom nav — clickable */}
        <div className="absolute bottom-0 left-0 right-0 mx-3 mb-2" onClick={(e) => e.stopPropagation()}>
          <div className="bg-[#2d1f5e] rounded-[22px] px-2 py-2 flex items-center justify-around">
            {([
              { id: 'home', icon: <LayoutGrid size={16} /> },
              { id: 'schedule', icon: <Calendar size={16} /> },
              { id: 'files', icon: <Folder size={16} /> },
              { id: 'settings', icon: <Settings size={16} /> },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  tab === t.id
                    ? 'bg-[#0f9d8d] text-white shadow-lg shadow-teal-700/40'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};