import React, { useState } from 'react';
import { Bot, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { theme, styles } from '../theme';
import { getChatResponse } from '../services/geminiService';
import { ScheduleEvent, PeriodDefinition } from '../types';

interface AIChatProps {
  onAddEvent?: (event: Partial<ScheduleEvent>) => void;
  periods: PeriodDefinition[];
}

const AIChat: React.FC<AIChatProps> = ({ onAddEvent, periods }) => {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;

    setIsAiLoading(true);
    setAiResponse(null);
    setIsError(false);
    try {
        const { text, eventData } = await getChatResponse([], aiPrompt, periods);
        setAiResponse(text);
        
        if (eventData && onAddEvent) {
            onAddEvent(eventData);
        }
    } catch (e) {
        setAiResponse("Sorry, I couldn't reach the server.");
        setIsError(true);
    } finally {
        setIsAiLoading(false);
    }
  };

  return (
    <div style={styles.scrollableContent}>
       <div style={{marginBottom: "30px", textAlign: "center", paddingTop: "20px"}}>
          <div style={{width: "80px", height: "80px", background: `linear-gradient(135deg, ${theme.accent}, #5fdccd)`, borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: theme.accentGlow}}>
            <Bot size={40} color="white" />
          </div>
          <h1 style={styles.title}>Assistant</h1>
          <p style={styles.subtitle}>Your personal AI study planner</p>
       </div>
       <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
         <div style={styles.card}>
           <textarea style={{...styles.input, width: "100%", minHeight: "120px", resize: "none", boxSizing: 'border-box', border: 'none', backgroundColor: 'rgba(0,0,0,0.2)'}} placeholder="Example: 'I have a Quiz next Tuesday at 10am'..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
           <div style={{marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
             <div style={{fontSize: "0.8rem", color: isAiLoading ? theme.accent : (aiResponse ? (isError ? theme.danger : theme.success) : theme.textMuted)}}>
                {isAiLoading && "Thinking..."}
                {aiResponse && !isAiLoading && (isError ? "Error" : "Done!")}
             </div>
             <button style={styles.button} onClick={handleAiSubmit} disabled={isAiLoading}><Send size={18} /> Process</button>
           </div>
         </div>
       </div>
       {aiResponse && !isAiLoading && (
         <div style={{
             marginTop: "20px", 
             padding: "16px", 
             backgroundColor: isError ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)", 
             border: `1px solid ${isError ? theme.danger : theme.success}`, 
             borderRadius: "20px", 
             color: isError ? theme.danger : theme.success, 
             display: "flex", 
             gap: "12px", 
             animation: "scaleIn 0.3s ease-out"
         }}>
           {isError ? <AlertCircle size={20} style={{minWidth: '20px'}}/> : <CheckCircle2 size={20} style={{minWidth: '20px'}}/>}
           <span style={{fontSize: "0.9rem", fontWeight: 600, color: '#fff'}}>{aiResponse}</span>
         </div>
       )}
    </div>
  );
};

export default AIChat;