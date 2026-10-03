
import React from 'react';
import { PeriodDefinition } from '../types';
import { Plus, Trash2, Clock, Eye, Coffee } from 'lucide-react';
import { styles } from '../theme';

// ─── Design tokens ────────────────────────────────────────────────────────────
const INK       = '#1A1730';
const CARD_BG   = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_PINK   = '#eea8f2';
const HL_GREEN  = '#8CE3B7';

interface ScheduleSettingsProps {
    periods: PeriodDefinition[];
    setPeriods: (periods: PeriodDefinition[]) => void;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({ periods, setPeriods }) => {

    // Helper to calculate minutes from "HH:MM"
    const getMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper to format minutes back to "HH:MM"
    const formatTime = (totalMinutes: number) => {
        const h = Math.floor(totalMinutes / 60) % 24;
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const getOrdinal = (n: number) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Recalculate labels and startVals for all periods to ensure consistency
    const recalculatePeriods = (newPeriods: PeriodDefinition[]) => {
        let slotCount = 0;
        const calculated = newPeriods.map(p => {
            // Update startVal
            const [h, m] = p.startTime.split(':').map(Number);
            const startVal = h + m / 60;

            // Update Label based on type and sequence
            let label = 'Break';
            if (!p.isBreak) {
                slotCount++;
                label = getOrdinal(slotCount);
            }

            return { ...p, startVal, label };
        });
        setPeriods(calculated);
    };

    // Smart index calculation for display in this component
    const getPeriodLabelDisplay = (currentPeriod: PeriodDefinition) => {
        if (currentPeriod.isBreak) return null;
        // Use the label we just calculated if available, otherwise fallback to index logic
        // Actually, let's trust the recalculatePeriods logic which runs on every change.
        // But for the visual 'Slot' suffix which isn't in the saved label:
        return `${currentPeriod.label} Slot`;
    };

    const addPeriod = () => {
        const lastPeriod = periods[periods.length - 1];
        let newStart = '08:30';
        let newEnd = '10:00';
        let isBreak = false;

        if (lastPeriod) {
            // Suggest next slot
            const lastEndMins = getMinutes(lastPeriod.endTime);

            // If previous was a class, maybe suggest a break?
            if (!lastPeriod.isBreak) {
                // Add 15 min break
                newStart = formatTime(lastEndMins);
                newEnd = formatTime(lastEndMins + 15);
                isBreak = true;
            } else {
                // If previous was break, suggest a class
                newStart = formatTime(lastEndMins);
                newEnd = formatTime(lastEndMins + 90);
                isBreak = false;
            }
        }

        const newPeriod: PeriodDefinition = {
            id: Math.random().toString(36).substr(2, 9),
            label: 'Temp', // Will be fixed by recalculatePeriods
            startTime: newStart,
            endTime: newEnd,
            isBreak,
        };

        recalculatePeriods([...periods, newPeriod]);
    };

    const updatePeriod = (id: string, field: keyof PeriodDefinition, value: any) => {
        const updated = periods.map(p => {
            if (p.id === id) {
                const newP = { ...p, [field]: value };
                // Update startVal if time changes
                if (field === 'startTime') {
                    const [h, m] = String(value).split(':').map(Number);
                    newP.startVal = h + m / 60;
                }
                return newP;
            }
            return p;
        });

        // Only recalculate all (labels etc) if isBreak changes
        if (field === 'isBreak') {
            recalculatePeriods(updated);
        } else {
            setPeriods(updated);
        }
    };

    const deletePeriod = (id: string) => {
        const updated = periods.filter(p => p.id !== id);
        recalculatePeriods(updated);
    };

    const autoFillGaps = () => {
        // Sort periods by start time first
        const sorted = [...periods].sort((a, b) => getMinutes(a.startTime) - getMinutes(b.startTime));
        const newPeriods: PeriodDefinition[] = [];

        for (let i = 0; i < sorted.length; i++) {
            newPeriods.push(sorted[i]);
            if (i < sorted.length - 1) {
                const currentEnd = getMinutes(sorted[i].endTime);
                const nextStart = getMinutes(sorted[i + 1].startTime);

                if (nextStart > currentEnd) {
                    // There is a gap, insert a break
                    newPeriods.push({
                        id: Math.random().toString(36).substr(2, 9),
                        label: 'Break',
                        startTime: formatTime(currentEnd),
                        endTime: formatTime(nextStart),
                        isBreak: true,
                        startVal: currentEnd / 60,
                    });
                }
            }
        }

        recalculatePeriods(newPeriods);
    };

    const to12h = (time24: string) => {
        if (!time24) return '';
        const [h, m] = time24.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
    };

    // Shared button styles
    const addBtn: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 12,
        background: CARD_BG,
        border: `1.5px dashed ${INK}`,
        borderRadius: 10,
        fontFamily: "'Instrument Sans', sans-serif",
        fontWeight: 600,
        fontSize: '0.82rem',
        color: INK,
        cursor: 'pointer',
        transition: 'all 0.15s',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p
                style={{
                    fontFamily: "'Instrument Sans', sans-serif",
                    color: `rgba(26,23,48,0.55)`,
                    fontSize: '0.85rem',
                    marginTop: -10,
                    marginBottom: 4,
                }}
            >
                Customize your daily timeline. These slots define the columns in your schedule view.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {periods.map((period, _index) => {
                    const slotLabel = getPeriodLabelDisplay(period);
                    return (
                        <div
                            key={period.id}
                            style={{
                                display: 'grid',
                                // Grid: Label(60px) | Spacer | Times(110px) | Type Toggle(80px) | Trash(30px)
                                gridTemplateColumns: '60px 1fr 110px 80px 30px',
                                gap: 8,
                                alignItems: 'center',
                                backgroundColor: period.isBreak ? `${HL_YELLOW}33` : CARD_BG,
                                padding: '12px 10px',
                                borderRadius: 10,
                                border: period.isBreak
                                    ? `1.5px dashed ${INK}`
                                    : `1.5px solid ${INK}`,
                                boxShadow: period.isBreak ? 'none' : `3px 4px 0 ${INK}`,
                                transition: 'all 0.2s ease',
                                position: 'relative',
                            }}
                        >
                            {/* Left Column: Icon + Index */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                {period.isBreak ? (
                                    <div style={{ opacity: 0.55 }}>
                                        <Coffee size={18} color={INK} />
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 800,
                                                color: INK,
                                                lineHeight: 1,
                                                fontFamily: "'Bricolage Grotesque', sans-serif",
                                            }}
                                        >
                                            {slotLabel?.split(' ')[0]}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: '0.6rem',
                                                color: `rgba(26,23,48,0.5)`,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                fontFamily: "'Instrument Sans', sans-serif",
                                                letterSpacing: '0.3px',
                                            }}
                                        >
                                            {slotLabel?.split(' ')[1]}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Empty spacer */}
                            <div />

                            {/* Middle Column: Vertical Time Stack */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    backgroundColor: `rgba(26,23,48,0.06)`,
                                    padding: 6,
                                    borderRadius: 8,
                                    border: `1px solid rgba(26,23,48,0.15)`,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                        type="time"
                                        value={period.startTime}
                                        onChange={e => updatePeriod(period.id, 'startTime', e.target.value)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: INK,
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            outline: 'none',
                                            width: 'auto',
                                            fontFamily: "'Space Mono', monospace",
                                        }}
                                    />
                                    <Clock size={10} color={`rgba(26,23,48,0.4)`} />
                                </div>
                                <div
                                    style={{
                                        fontSize: '0.5rem',
                                        color: `rgba(26,23,48,0.4)`,
                                        fontWeight: 800,
                                        letterSpacing: '1px',
                                        fontFamily: "'Space Mono', monospace",
                                    }}
                                >
                                    TO
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                        type="time"
                                        value={period.endTime}
                                        onChange={e => updatePeriod(period.id, 'endTime', e.target.value)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: INK,
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            outline: 'none',
                                            width: 'auto',
                                            fontFamily: "'Space Mono', monospace",
                                        }}
                                    />
                                    <Clock size={10} color={`rgba(26,23,48,0.4)`} />
                                </div>
                            </div>

                            {/* Right Column: Toggle Button Stack */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0,
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    border: `1.5px solid ${INK}`,
                                }}
                            >
                                <button
                                    onClick={() => updatePeriod(period.id, 'isBreak', false)}
                                    style={{
                                        padding: '5px 4px',
                                        background: !period.isBreak ? INK : 'transparent',
                                        color: !period.isBreak ? HL_YELLOW : `rgba(26,23,48,0.45)`,
                                        fontSize: '0.6rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        transition: 'all 0.2s',
                                        borderBottom: `1px solid ${INK}`,
                                        letterSpacing: '0.3px',
                                    }}
                                >
                                    SLOT
                                </button>
                                <button
                                    onClick={() => updatePeriod(period.id, 'isBreak', true)}
                                    style={{
                                        padding: '5px 4px',
                                        background: period.isBreak ? `${HL_YELLOW}99` : 'transparent',
                                        color: period.isBreak ? INK : `rgba(26,23,48,0.45)`,
                                        fontSize: '0.6rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        fontFamily: "'Instrument Sans', sans-serif",
                                        transition: 'all 0.2s',
                                        letterSpacing: '0.3px',
                                    }}
                                >
                                    BREAK
                                </button>
                            </div>

                            {/* Far Right: Delete */}
                            <button
                                onClick={() => deletePeriod(period.id)}
                                style={{
                                    background: 'transparent',
                                    color: '#E56A5A',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    opacity: 0.75,
                                    padding: 4,
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    );
                })}

                {/* Add / Auto-fill buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={addPeriod} style={addBtn}>
                        <Plus size={16} /> Add New Slot
                    </button>
                    <button
                        onClick={autoFillGaps}
                        style={{
                            ...addBtn,
                            color: '#1a6e4c',
                            borderColor: HL_GREEN,
                        }}
                    >
                        <Coffee size={16} /> Auto-Fill Gaps
                    </button>
                </div>
            </div>

            {/* ── Visual Preview ─────────────────────────────────────────────── */}
            <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Eye size={16} color={`rgba(26,23,48,0.5)`} />
                    <span
                        style={{
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                            fontSize: '0.9rem',
                            color: `rgba(26,23,48,0.6)`,
                            fontWeight: 700,
                        }}
                    >
                        Preview
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        width: '100%',
                        overflowX: 'auto',
                        padding: '10px 8px',
                        gap: 6,
                        backgroundColor: CARD_BG,
                        borderRadius: 10,
                        border: `1.5px solid ${INK}`,
                        boxShadow: `3px 4px 0 ${INK}`,
                        minHeight: 80,
                        alignItems: 'stretch',
                    }}
                >
                    {periods.map((p, _i) => (
                        <div
                            key={p.id}
                            style={{
                                flex: p.isBreak ? '0 0 40px' : '1',
                                minWidth: p.isBreak ? 40 : 120,
                                backgroundColor: p.isBreak ? `${HL_YELLOW}33` : `${HL_PINK}55`,
                                border: p.isBreak ? `1.5px dashed ${INK}` : `1.5px solid ${INK}`,
                                borderRadius: 8,
                                padding: '8px 4px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                position: 'relative',
                            }}
                        >
                            {p.isBreak ? (
                                <Coffee size={12} color={`rgba(26,23,48,0.45)`} />
                            ) : (
                                <span
                                    style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        color: INK,
                                        fontFamily: "'Bricolage Grotesque', sans-serif",
                                    }}
                                >
                                    {p.label}
                                </span>
                            )}

                            <div
                                style={{
                                    fontSize: '0.52rem',
                                    color: `rgba(26,23,48,0.55)`,
                                    marginTop: 4,
                                    textAlign: 'center',
                                    lineHeight: 1.3,
                                    fontFamily: "'Space Mono', monospace",
                                }}
                            >
                                {to12h(p.startTime)}
                                <br />
                                <span style={{ opacity: 0.5 }}>to</span>
                                <br />
                                {to12h(p.endTime)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ScheduleSettings;
