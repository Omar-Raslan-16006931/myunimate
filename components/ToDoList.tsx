
import React, { useState } from 'react';
import { Plus, Trash2, Circle, CheckCircle2, X, ArrowLeft, CheckSquare } from 'lucide-react';
import { ToDoItem } from '../types';
import { theme, styles } from '../theme';

interface ToDoListProps {
  items: ToDoItem[];
  onAdd: (text: string, priority: 'low' | 'medium' | 'high') => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

const INK = '#1A1730';
const CARD_BG = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN = '#8CE3B7';
const HL_BLUE = '#9ECFFF';
const HL_RED = '#E56A5A';
const HL_ORANGE = '#F4BE8A';

const ToDoList: React.FC<ToDoListProps> = ({ items, onAdd, onToggle, onDelete, onBack }) => {
  const [newItemText, setNewItemText] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemText.trim()) {
      onAdd(newItemText, newPriority);
      setNewItemText('');
      setNewPriority('medium');
    }
  };

  const getPriorityColor = (p?: string) => {
    switch (p) {
      case 'high': return HL_RED;
      case 'medium': return HL_ORANGE;
      case 'low': return HL_BLUE;
      default: return `rgba(26,23,48,0.4)`;
    }
  };

  const getPriorityBg = (p?: string) => {
    switch (p) {
      case 'high': return `${HL_RED}22`;
      case 'medium': return `${HL_ORANGE}33`;
      case 'low': return `${HL_BLUE}33`;
      default: return 'transparent';
    }
  };

  const activeItems = items.filter(i => !i.completed).sort((a, b) => {
    const pMap = { high: 3, medium: 2, low: 1, undefined: 0 };
    const pA = pMap[a.priority || 'undefined'];
    const pB = pMap[b.priority || 'undefined'];
    if (pA !== pB) return pB - pA;
    return b.createdAt - a.createdAt;
  });

  const completedItems = items.filter(i => i.completed).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div style={styles.scrollableContent}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingTop: '8px' }}>
        <button
          onClick={onBack}
          style={{
            background: CARD_BG,
            border: `1.5px solid ${INK}`,
            borderRadius: '10px',
            boxShadow: `3px 3px 0 ${INK}`,
            color: INK,
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div
          style={{
            background: `${HL_YELLOW}60`,
            border: `1.5px solid ${INK}`,
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckSquare size={22} color={INK} />
        </div>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: INK, margin: 0 }}>
            Tasks
          </h1>
          <p style={{ fontFamily: "'Instrument Sans', 'Inter', sans-serif", color: `rgba(26,23,48,0.5)`, fontSize: '0.78rem', margin: 0, fontWeight: 500 }}>
            Get things done
          </p>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            style={{
              flex: 1,
              background: 'rgba(26,23,48,0.06)',
              border: `1.5px solid ${INK}`,
              borderRadius: '10px',
              padding: '12px 14px',
              color: INK,
              fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              fontSize: '0.9rem',
              outline: 'none',
            }}
            placeholder="Add a new task..."
            value={newItemText}
            maxLength={150}
            onChange={(e) => setNewItemText(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            style={{
              background: INK,
              color: '#fff',
              border: `1.5px solid ${INK}`,
              borderRadius: '10px',
              fontWeight: 700,
              boxShadow: `4px 4px 0 ${HL_YELLOW}`,
              cursor: 'pointer',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            <Plus size={22} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['low', 'medium', 'high'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setNewPriority(p)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: `1.5px solid ${newPriority === p ? getPriorityColor(p) : `rgba(26,23,48,0.2)`}`,
                background: newPriority === p ? getPriorityBg(p) : 'transparent',
                color: newPriority === p ? getPriorityColor(p) : `rgba(26,23,48,0.5)`,
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize',
                fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </form>

      {/* Active List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {activeItems.map(item => (
          <div
            key={item.id}
            style={{
              background: CARD_BG,
              border: `1.5px solid ${INK}`,
              borderRadius: '10px',
              boxShadow: `4px 5px 0 ${INK}`,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderLeft: `4px solid ${getPriorityColor(item.priority)}`,
              animation: 'fadeIn 0.2s',
            }}
          >
            <button
              onClick={() => onToggle(item.id)}
              style={{ background: 'transparent', border: 'none', color: `rgba(26,23,48,0.35)`, cursor: 'pointer', display: 'flex', padding: 0 }}
            >
              <Circle size={24} strokeWidth={1.5} />
            </button>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: '0.95rem', color: INK, lineHeight: 1.4, display: 'block', fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}>
                {item.text}
              </span>
              {item.priority && (
                <span style={{
                  fontSize: '0.65rem',
                  color: getPriorityColor(item.priority),
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  marginTop: '4px',
                  display: 'inline-block',
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                }}>
                  {item.priority} Priority
                </span>
              )}
            </div>
            <button
              onClick={() => onDelete(item.id)}
              style={{ background: 'transparent', border: 'none', color: HL_RED, cursor: 'pointer', opacity: 0.7, display: 'flex', padding: 0 }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {activeItems.length === 0 && completedItems.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: `rgba(26,23,48,0.45)`,
            padding: '40px 20px',
            background: `rgba(26,23,48,0.04)`,
            borderRadius: '12px',
            border: `1.5px dashed rgba(26,23,48,0.2)`,
            fontFamily: "'Instrument Sans', 'Inter', sans-serif",
          }}>
            <div style={{ marginBottom: '10px', opacity: 0.5 }}>
              <CheckSquare size={32} color={INK} />
            </div>
            <p style={{ color: `rgba(26,23,48,0.5)`, margin: 0 }}>No tasks yet. Add one above!</p>
          </div>
        )}

        {activeItems.length === 0 && completedItems.length > 0 && (
          <div style={{
            textAlign: 'center',
            color: '#1A5C3A',
            padding: '20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            background: `${HL_GREEN}55`,
            border: `1.5px solid ${INK}`,
            borderRadius: '10px',
            fontFamily: "'Instrument Sans', 'Inter', sans-serif",
          }}>
            🎉 All tasks completed! Great job.
          </div>
        )}
      </div>

      {/* Completed List */}
      {completedItems.length > 0 && (
        <>
          <h3 style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: `rgba(26,23,48,0.5)`,
            marginTop: '32px',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: "'Instrument Sans', 'Inter', sans-serif",
          }}>
            Completed
            <span style={{
              background: `rgba(26,23,48,0.1)`,
              border: `1px solid rgba(26,23,48,0.2)`,
              padding: '1px 7px',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: INK,
            }}>
              {completedItems.length}
            </span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {completedItems.map(item => (
              <div
                key={item.id}
                style={{
                  background: `rgba(26,23,48,0.04)`,
                  border: `1.5px solid rgba(26,23,48,0.15)`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <button
                  onClick={() => onToggle(item.id)}
                  style={{ background: 'transparent', border: 'none', color: HL_GREEN, cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  <CheckCircle2 size={24} />
                </button>
                <span style={{
                  flex: 1,
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  color: `rgba(26,23,48,0.45)`,
                  textDecoration: 'line-through',
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                }}>
                  {item.text}
                </span>
                <button
                  onClick={() => onDelete(item.id)}
                  style={{ background: 'transparent', border: 'none', color: `rgba(26,23,48,0.35)`, cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ToDoList;
