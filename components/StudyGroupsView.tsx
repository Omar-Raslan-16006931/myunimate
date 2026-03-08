import React, { useState, useEffect } from 'react';
import { Users, Plus, MessageSquare, FileText, Calendar, ArrowLeft, Send, Link as LinkIcon, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StudyGroup, StudyGroupMessage, StudyGroupDocument, StudyGroupSession } from '../types';
import { theme, styles } from '../theme';

interface StudyGroupsViewProps {
  onBack: () => void;
  userId: string;
  username: string;
}

export const StudyGroupsView: React.FC<StudyGroupsViewProps> = ({ onBack, userId, username }) => {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<StudyGroup | null>(null);
  const [messages, setMessages] = useState<StudyGroupMessage[]>([]);
  const [documents, setDocuments] = useState<StudyGroupDocument[]>([]);
  const [sessions, setSessions] = useState<StudyGroupSession[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);
  
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [joinGroupId, setJoinGroupId] = useState('');
  
  const [activeTab, setActiveTab] = useState<'chat' | 'docs' | 'sessions'>('chat');

  useEffect(() => {
    fetchMyGroups();
  }, []);

  useEffect(() => {
    if (activeGroup) {
      fetchGroupData(activeGroup.id);
      
      // Subscribe to new messages
      const subscription = supabase
        .channel(`group_${activeGroup.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'study_group_messages',
            filter: `group_id=eq.${activeGroup.id}`
        }, payload => {
            setMessages(prev => [...prev, payload.new as StudyGroupMessage]);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [activeGroup]);

  const fetchMyGroups = async () => {
    setDbError(null);
    const { data, error } = await supabase
      .from('study_groups')
      .select('*, study_group_members!inner(user_id)')
      .eq('study_group_members.user_id', userId);
      
    if (error) {
      if (error.code === '42P01') {
        setDbError('The Study Groups tables have not been created in your Supabase database yet. Please run the SQL script provided to create them.');
      } else {
        console.error('Error fetching groups:', error);
      }
    } else if (data) {
      setGroups(data);
    }
  };

  const fetchGroupData = async (groupId: string) => {
    // Fetch messages
    const { data: msgData } = await supabase
      .from('study_group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });
    
    // Fetch usernames for messages (simplified, ideally join with profiles)
    if (msgData) {
        const userIds = [...new Set(msgData.map(m => m.user_id))];
        const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', userIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p.username]));
        
        const messagesWithNames = msgData.map(m => ({
            ...m,
            username: profileMap.get(m.user_id) || 'Unknown User'
        }));
        setMessages(messagesWithNames);
    }

    // Fetch docs
    const { data: docData } = await supabase
      .from('study_group_documents')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (docData) setDocuments(docData);

    // Fetch sessions
    const { data: sessData } = await supabase
      .from('study_group_sessions')
      .select('*')
      .eq('group_id', groupId)
      .order('start_time', { ascending: true });
    if (sessData) setSessions(sessData);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    const newGroup = {
      id: crypto.randomUUID(),
      name: newGroupName,
      description: newGroupDesc,
      created_by: userId
    };

    const { error } = await supabase.from('study_groups').insert(newGroup);
    if (!error) {
      await supabase.from('study_group_members').insert({
        group_id: newGroup.id,
        user_id: userId,
        role: 'admin'
      });
      setGroups([...groups, { ...newGroup, created_at: new Date().toISOString() }]);
      setIsCreatingGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
    }
  };

  const handleJoinGroup = async () => {
    if (!joinGroupId.trim()) return;
    
    const { error } = await supabase.from('study_group_members').insert({
      group_id: joinGroupId,
      user_id: userId,
      role: 'member'
    });

    if (!error) {
      fetchMyGroups();
      setIsJoiningGroup(false);
      setJoinGroupId('');
    } else {
      alert("Could not join group. Check the ID.");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeGroup) return;
    
    const msg = {
      id: crypto.randomUUID(),
      group_id: activeGroup.id,
      user_id: userId,
      message: newMessage
    };

    const { error } = await supabase.from('study_group_messages').insert(msg);
    if (!error) {
      setNewMessage('');
      // It will be added via subscription, but we can optimistically add it
      // setMessages([...messages, { ...msg, created_at: new Date().toISOString(), username }]);
    }
  };

  const handleAddDocument = async () => {
      if (!activeGroup) return;
      const title = prompt("Document Title:");
      if (!title) return;
      const url = prompt("Document URL (Google Docs, etc):");
      if (!url) return;

      const doc = {
          id: crypto.randomUUID(),
          group_id: activeGroup.id,
          user_id: userId,
          title,
          url
      };
      const { error } = await supabase.from('study_group_documents').insert(doc);
      if (!error) {
          setDocuments([{...doc, created_at: new Date().toISOString()}, ...documents]);
      }
  };

  const handleAddSession = async () => {
      if (!activeGroup) return;
      const title = prompt("Session Title:");
      if (!title) return;
      const dateStr = prompt("Date and Time (YYYY-MM-DD HH:MM):");
      if (!dateStr) return;
      const duration = prompt("Duration (minutes):", "60");
      
      const session = {
          id: crypto.randomUUID(),
          group_id: activeGroup.id,
          created_by: userId,
          title,
          start_time: new Date(dateStr).toISOString(),
          duration_minutes: parseInt(duration || "60")
      };

      const { error } = await supabase.from('study_group_sessions').insert(session);
      if (!error) {
          setSessions([...sessions, {...session, created_at: new Date().toISOString()}].sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
      }
  };

  if (activeGroup) {
    return (
      <div style={{...styles.scrollableContent, display: 'flex', flexDirection: 'column', padding: 0}}>
        <div style={{padding: '18px', background: theme.cardBg, borderBottom: theme.glassBorder, display: 'flex', alignItems: 'center', gap: '12px'}}>
            <button onClick={() => setActiveGroup(null)} style={{background: 'transparent', border: 'none', color: theme.text, cursor: 'pointer', padding: 0}}>
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 800}}>{activeGroup.name}</h2>
                <p style={{margin: 0, fontSize: '0.75rem', color: theme.textMuted}}>ID: {activeGroup.id}</p>
            </div>
        </div>

        <div style={{display: 'flex', borderBottom: theme.glassBorder, background: theme.cardBg}}>
            <button 
                onClick={() => setActiveTab('chat')}
                style={{flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: activeTab === 'chat' ? `2px solid ${theme.accent}` : '2px solid transparent', color: activeTab === 'chat' ? theme.accent : theme.textMuted, fontWeight: 600, cursor: 'pointer'}}
            >
                Chat
            </button>
            <button 
                onClick={() => setActiveTab('docs')}
                style={{flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: activeTab === 'docs' ? `2px solid ${theme.accent}` : '2px solid transparent', color: activeTab === 'docs' ? theme.accent : theme.textMuted, fontWeight: 600, cursor: 'pointer'}}
            >
                Docs
            </button>
            <button 
                onClick={() => setActiveTab('sessions')}
                style={{flex: 1, padding: '12px', background: 'transparent', border: 'none', borderBottom: activeTab === 'sessions' ? `2px solid ${theme.accent}` : '2px solid transparent', color: activeTab === 'sessions' ? theme.accent : theme.textMuted, fontWeight: 600, cursor: 'pointer'}}
            >
                Sessions
            </button>
        </div>

        <div style={{flex: 1, overflowY: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {activeTab === 'chat' && (
                <>
                    <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto'}}>
                        {messages.map(msg => (
                            <div key={msg.id} style={{
                                alignSelf: msg.user_id === userId ? 'flex-end' : 'flex-start',
                                background: msg.user_id === userId ? theme.accent : 'rgba(255,255,255,0.1)',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                maxWidth: '80%'
                            }}>
                                {msg.user_id !== userId && <div style={{fontSize: '0.65rem', fontWeight: 700, opacity: 0.7, marginBottom: '2px'}}>{msg.username}</div>}
                                <div style={{fontSize: '0.85rem'}}>{msg.message}</div>
                            </div>
                        ))}
                    </div>
                    <div style={{display: 'flex', gap: '8px', marginTop: 'auto'}}>
                        <input 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message..."
                            style={styles.input}
                        />
                        <button onClick={handleSendMessage} style={{...styles.button, padding: '12px'}}>
                            <Send size={16} />
                        </button>
                    </div>
                </>
            )}

            {activeTab === 'docs' && (
                <>
                    <button onClick={handleAddDocument} style={{...styles.secondaryButton, justifyContent: 'center', marginBottom: '12px'}}>
                        <Plus size={16} /> Add Document Link
                    </button>
                    {documents.map(doc => (
                        <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" style={{...styles.card, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px'}}>
                                <FileText size={20} color={theme.accent} />
                            </div>
                            <div>
                                <div style={{fontWeight: 700, color: theme.text, fontSize: '0.9rem'}}>{doc.title}</div>
                                <div style={{fontSize: '0.7rem', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <LinkIcon size={10} /> External Link
                                </div>
                            </div>
                        </a>
                    ))}
                    {documents.length === 0 && <div style={{textAlign: 'center', color: theme.textMuted, padding: '20px'}}>No documents shared yet.</div>}
                </>
            )}

            {activeTab === 'sessions' && (
                <>
                    <button onClick={handleAddSession} style={{...styles.secondaryButton, justifyContent: 'center', marginBottom: '12px'}}>
                        <Plus size={16} /> Schedule Session
                    </button>
                    {sessions.map(session => (
                        <div key={session.id} style={{...styles.card, display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <div style={{background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px'}}>
                                <Calendar size={20} color={theme.accent} />
                            </div>
                            <div>
                                <div style={{fontWeight: 700, color: theme.text, fontSize: '0.9rem'}}>{session.title}</div>
                                <div style={{fontSize: '0.75rem', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
                                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Clock size={12} /> {new Date(session.start_time).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                                    <span>({session.duration_minutes}m)</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {sessions.length === 0 && <div style={{textAlign: 'center', color: theme.textMuted, padding: '20px'}}>No sessions scheduled.</div>}
                </>
            )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.scrollableContent}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Study Groups</h2>
          <p style={styles.subtitle}>Collaborate with classmates</p>
        </div>
        <button onClick={onBack} style={{background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer'}}>
            <ArrowLeft size={24} />
        </button>
      </div>

      <div style={{display: 'flex', gap: '12px', marginBottom: '20px'}}>
          <button onClick={() => { setIsCreatingGroup(true); setIsJoiningGroup(false); }} style={{...styles.button, flex: 1, justifyContent: 'center'}}>
              <Plus size={16} /> Create Group
          </button>
          <button onClick={() => { setIsJoiningGroup(true); setIsCreatingGroup(false); }} style={{...styles.secondaryButton, flex: 1, justifyContent: 'center'}}>
              <Users size={16} /> Join Group
          </button>
      </div>

      {dbError && (
          <div style={{...styles.card, marginBottom: '20px', border: `1px solid ${theme.danger}`, background: `${theme.danger}11`}}>
              <h3 style={{marginTop: 0, marginBottom: '8px', fontSize: '1rem', color: theme.danger}}>Database Setup Required</h3>
              <p style={{margin: 0, fontSize: '0.85rem', color: theme.textMuted, lineHeight: 1.5}}>
                  {dbError}
              </p>
              <p style={{margin: '8px 0 0 0', fontSize: '0.85rem', color: theme.textMuted, lineHeight: 1.5}}>
                  Please copy the SQL from the <code style={{background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px'}}>supabase_schema.sql</code> file and run it in your Supabase SQL Editor.
              </p>
          </div>
      )}

      {isCreatingGroup && (
          <div style={{...styles.card, marginBottom: '20px'}}>
              <h3 style={{marginTop: 0, marginBottom: '12px', fontSize: '1rem'}}>Create New Group</h3>
              <input style={{...styles.input, width: '100%', marginBottom: '12px'}} placeholder="Group Name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              <input style={{...styles.input, width: '100%', marginBottom: '12px'}} placeholder="Description (optional)" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} />
              <div style={{display: 'flex', gap: '8px'}}>
                  <button onClick={handleCreateGroup} style={{...styles.button, flex: 1, justifyContent: 'center'}}>Create</button>
                  <button onClick={() => setIsCreatingGroup(false)} style={{...styles.secondaryButton, flex: 1, justifyContent: 'center'}}>Cancel</button>
              </div>
          </div>
      )}

      {isJoiningGroup && (
          <div style={{...styles.card, marginBottom: '20px'}}>
              <h3 style={{marginTop: 0, marginBottom: '12px', fontSize: '1rem'}}>Join Group</h3>
              <input style={{...styles.input, width: '100%', marginBottom: '12px'}} placeholder="Group ID" value={joinGroupId} onChange={e => setJoinGroupId(e.target.value)} />
              <div style={{display: 'flex', gap: '8px'}}>
                  <button onClick={handleJoinGroup} style={{...styles.button, flex: 1, justifyContent: 'center'}}>Join</button>
                  <button onClick={() => setIsJoiningGroup(false)} style={{...styles.secondaryButton, flex: 1, justifyContent: 'center'}}>Cancel</button>
              </div>
          </div>
      )}

      <h3 style={{fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: theme.textMuted}}>My Groups</h3>
      <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {groups.map(group => (
              <div key={group.id} onClick={() => setActiveGroup(group)} style={{...styles.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 0}}>
                  <div style={{background: `linear-gradient(135deg, ${theme.accent}44, ${theme.accent}11)`, padding: '12px', borderRadius: '16px', border: `1px solid ${theme.accent}44`}}>
                      <Users size={24} color={theme.accent} />
                  </div>
                  <div>
                      <h4 style={{margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700}}>{group.name}</h4>
                      <p style={{margin: 0, fontSize: '0.75rem', color: theme.textMuted}}>{group.description || 'No description'}</p>
                  </div>
              </div>
          ))}
          {groups.length === 0 && !isCreatingGroup && !isJoiningGroup && (
              <div style={{textAlign: 'center', padding: '30px', color: theme.textMuted, background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: theme.glassBorder}}>
                  You haven't joined any study groups yet.
              </div>
          )}
      </div>
    </div>
  );
};
