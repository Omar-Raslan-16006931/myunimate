
import React, { useState } from 'react';
import { Plus, Trash2, Circle, CheckCircle2, X, ArrowLeft, CheckSquare, AlertCircle } from 'lucide-react';
import { ToDoItem } from '../types';
import { theme, styles } from '../theme';

interface ToDoListProps {
  items: ToDoItem[];
  onAdd: (text: string, priority: 'low' | 'medium' | 'high') => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

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
      switch(p) {
          case 'high': return '#ef4444';
          case 'medium': return '#f59e0b';
          case 'low': return '#3b82f6';
          default: return theme.textMuted;
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
      <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingTop: '8px'}}>
         <button onClick={onBack} style={{background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0}}>
             <ArrowLeft size={24} />
         </button>
         <div style={{background: 'rgba(236, 72, 153, 0.1)', padding: '10px', borderRadius: '16px'}}>
            <CheckSquare size={24} color="#f472b6" />
         </div>
         <div>
            <h1 style={styles.title}>Tasks</h1>
            <p style={styles.subtitle}>Get things done</p>
         </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
        <div style={{display: 'flex', gap: '10px'}}>
            <input
              style={{...styles.input, width: '100%', borderRadius: '16px'}}
              placeholder="Add a new task..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              autoFocus
            />
            <button type="submit" style={{...styles.button, borderRadius: '16px', padding: '0 16px', background: '#ec4899', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)'}}>
              <Plus size={24} />
            </button>
        </div>
        <div style={{display: 'flex', gap: '8px'}}>
            {(['low', 'medium', 'high'] as const).map(p => (
                <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: `1px solid ${newPriority === p ? getPriorityColor(p) : 'rgba(255,255,255,0.1)'}`,
                        background: newPriority === p ? `${getPriorityColor(p)}22` : 'transparent',
                        color: newPriority === p ? getPriorityColor(p) : theme.textMuted,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.2s'
                    }}
                >
                    {p}
                </button>
            ))}
        </div>
      </form>

      {/* Active List */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
        {activeItems.map(item => (
          <div key={item.id} style={{...styles.card, padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 0, animation: 'fadeIn 0.2s', borderLeft: `3px solid ${getPriorityColor(item.priority)}`}}>
            <button onClick={() => onToggle(item.id)} style={{background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', display: 'flex'}}>
              <Circle size={24} strokeWidth={1.5} />
            </button>
            <div style={{flex: 1}}>
                <span style={{fontWeight: 600, fontSize: '1rem', color: '#fff', lineHeight: 1.4, display: 'block'}}>{item.text}</span>
                {item.priority && (
                    <span style={{fontSize: '0.65rem', color: getPriorityColor(item.priority), textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginTop: '4px', display: 'inline-block'}}>
                        {item.priority} Priority
                    </span>
                )}
            </div>
            <button onClick={() => onDelete(item.id)} style={{background: 'transparent', border: 'none', color: theme.danger, cursor: 'pointer', opacity: 0.6, display: 'flex'}}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {activeItems.length === 0 && completedItems.length === 0 && (
            <div style={{textAlign: 'center', color: theme.textMuted, padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: theme.glassBorder}}>
                <div style={{marginBottom: '10px', opacity: 0.5}}>
                    <CheckSquare size={32} />
                </div>
                <p>No tasks yet. Add one above!</p>
            </div>
        )}
        {activeItems.length === 0 && completedItems.length > 0 && (
            <div style={{textAlign: 'center', color: '#34d399', padding: '20px', fontWeight: 600, fontSize: '0.9rem'}}>
                All tasks completed! Great job.
            </div>
        )}
      </div>

      {/* Completed List */}
      {completedItems.length > 0 && (
        <>
          <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: theme.textMuted, marginTop: '32px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            Completed <span style={{background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '6px', fontSize: '0.7rem'}}>{completedItems.length}</span>
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {completedItems.map(item => (
              <div key={item.id} style={{...styles.card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)'}}>
                <button onClick={() => onToggle(item.id)} style={{background: 'transparent', border: 'none', color: theme.success, cursor: 'pointer', display: 'flex'}}>
                  <CheckCircle2 size={24} />
                </button>
                <span style={{flex: 1, fontWeight: 500, fontSize: '1rem', color: theme.textMuted, textDecoration: 'line-through'}}>{item.text}</span>
                <button onClick={() => onDelete(item.id)} style={{background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', opacity: 0.4, display: 'flex'}}>
                  <X size={18} />
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
