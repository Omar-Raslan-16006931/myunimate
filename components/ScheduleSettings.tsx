
import React, { useState } from 'react';
import { PeriodDefinition } from '../types';
import { Plus, Trash2, Clock, Eye, Columns, Coffee } from 'lucide-react';
import { theme, styles } from '../theme';

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
        const s = ["th", "st", "nd", "rd"];
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
            let label = "Break";
            if (!p.isBreak) {
                slotCount++;
                label = getOrdinal(slotCount);
            }

            return { ...p, startVal, label };
        });
        setPeriods(calculated);
    };

    // Smart index calculation for display in this component
    const getPeriodLabelDisplay = (currentPeriod: PeriodDefinition, allPeriods: PeriodDefinition[]) => {
        if (currentPeriod.isBreak) return null;
        // Use the label we just calculated if available, otherwise fallback to index logic
        // Actually, let's trust the recalculatePeriods logic which runs on every change.
        // But for the visual 'Slot' suffix which isn't in the saved label:
        return `${currentPeriod.label} Slot`;
    };

    const addPeriod = () => {
        const lastPeriod = periods[periods.length - 1];
        let newStart = "08:30";
        let newEnd = "10:00";
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
            label: "Temp", // Will be fixed by recalculatePeriods
            startTime: newStart,
            endTime: newEnd,
            isBreak
        };
        
        recalculatePeriods([...periods, newPeriod]);
    };

    const updatePeriod = (id: string, field: keyof PeriodDefinition, value: any) => {
        const updated = periods.map(p => {
            if (p.id === id) {
                return { ...p, [field]: value };
            }
            return p;
        });
        recalculatePeriods(updated);
    };

    const deletePeriod = (id: string) => {
        const updated = periods.filter(p => p.id !== id);
        recalculatePeriods(updated);
    };

    const to12h = (time24: string) => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
    };

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
            <p style={{color: theme.textMuted, fontSize: '0.85rem', marginTop: '-10px', marginBottom: '4px'}}>
                Customize your daily timeline. These slots define the columns in your schedule view.
            </p>

            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {periods.map((period, index) => {
                    const slotLabel = getPeriodLabelDisplay(period, periods);
                    return (
                        <div key={period.id} style={{
                            display: 'grid', 
                            // Grid: Label(60px) | Spacer | Times(110px) | Type Toggle(80px) | Trash(30px)
                            gridTemplateColumns: '60px 1fr 110px 80px 30px', 
                            gap: '8px', 
                            alignItems: 'center',
                            backgroundColor: period.isBreak ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.03)',
                            padding: '12px 10px',
                            borderRadius: '16px',
                            border: period.isBreak ? '1px dashed rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                        }}>
                            {/* Left Column: Icon + Index */}
                            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px'}}>
                                {period.isBreak ? (
                                    <div style={{opacity: 0.5}}><Coffee size={18} /></div>
                                ) : (
                                    <>
                                        <div style={{fontSize: '0.9rem', fontWeight: 800, color: '#fff', lineHeight: 1}}>
                                            {slotLabel?.split(' ')[0]}
                                        </div>
                                        <div style={{fontSize: '0.65rem', color: theme.textMuted, fontWeight: 600, textTransform: 'uppercase'}}>
                                            {slotLabel?.split(' ')[1]}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Empty spacer */}
                            <div />

                            {/* Middle Column: Vertical Time Stack */}
                            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '10px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <input 
                                        type="time"
                                        value={period.startTime}
                                        onChange={(e) => updatePeriod(period.id, 'startTime', e.target.value)}
                                        style={{background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 600, outline: 'none', width: 'auto', fontFamily: 'monospace'}}
                                    />
                                    <Clock size={10} color={theme.textMuted} />
                                </div>
                                <div style={{fontSize: '0.55rem', color: theme.textMuted, fontWeight: 800, letterSpacing: '1px'}}>TO</div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <input 
                                        type="time"
                                        value={period.endTime}
                                        onChange={(e) => updatePeriod(period.id, 'endTime', e.target.value)}
                                        style={{background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: 600, outline: 'none', width: 'auto', fontFamily: 'monospace'}}
                                    />
                                    <Clock size={10} color={theme.textMuted} />
                                </div>
                            </div>

                            {/* Right Column: Toggle Button Stack */}
                            <div style={{display: 'flex', flexDirection: 'column', gap: '0', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)'}}>
                                <button
                                    onClick={() => updatePeriod(period.id, 'isBreak', false)}
                                    style={{
                                        padding: '4px',
                                        background: !period.isBreak ? theme.accent : 'transparent',
                                        color: !period.isBreak ? '#fff' : theme.textMuted,
                                        fontSize: '0.65rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        transition: 'all 0.2s',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                    }}
                                >
                                    SLOT
                                </button>
                                <button
                                    onClick={() => updatePeriod(period.id, 'isBreak', true)}
                                    style={{
                                        padding: '4px',
                                        background: period.isBreak ? 'rgba(255,255,255,0.15)' : 'transparent',
                                        color: period.isBreak ? '#fff' : theme.textMuted,
                                        fontSize: '0.65rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        transition: 'all 0.2s'
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
                                    color: theme.danger,
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    opacity: 0.6
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    );
                })}

                <button 
                    onClick={addPeriod}
                    style={{
                        ...styles.secondaryButton,
                        justifyContent: 'center',
                        padding: '12px',
                        borderStyle: 'dashed',
                        marginTop: '8px',
                        fontSize: '0.8rem'
                    }}
                >
                    <Plus size={16} /> Add New Slot
                </button>
            </div>

            {/* Visual Preview */}
            <div style={{marginTop: '10px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px'}}>
                    <Eye size={16} color={theme.textMuted} />
                    <span style={{fontSize: '0.9rem', color: theme.textMuted, fontWeight: 600}}>Preview</span>
                </div>
                
                <div style={{
                    display: 'flex',
                    width: '100%',
                    overflowX: 'auto',
                    padding: '10px 0',
                    gap: '6px',
                    backgroundColor: 'rgba(20,20,30,0.5)',
                    borderRadius: '12px',
                    border: theme.glassBorder,
                    minHeight: '80px',
                    alignItems: 'stretch'
                }}>
                    {periods.map((p, i) => (
                        <div key={p.id} style={{
                            flex: p.isBreak ? '0 0 40px' : '1',
                            minWidth: p.isBreak ? '40px' : '120px',
                            backgroundColor: p.isBreak ? 'transparent' : 'rgba(139, 92, 246, 0.1)',
                            border: p.isBreak ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(139, 92, 246, 0.2)',
                            borderRadius: '8px',
                            padding: '8px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            position: 'relative'
                        }}>
                            {p.isBreak ? (
                                <Coffee size={12} color={theme.textMuted} />
                            ) : (
                                <span style={{fontSize: '0.7rem', fontWeight: 700, color: '#fff'}}>
                                    {p.label}
                                </span>
                            )}
                            
                            <div style={{
                                fontSize: '0.55rem', 
                                color: 'rgba(255,255,255,0.6)', 
                                marginTop: '4px', 
                                textAlign: 'center',
                                lineHeight: '1.2'
                            }}>
                                {to12h(p.startTime)}<br/>
                                <span style={{opacity: 0.5}}>to</span><br/>
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
