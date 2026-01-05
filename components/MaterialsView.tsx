
import React from 'react';
import { MaterialFile } from '../types';
import { Folder, FileText, Download, MoreVertical, Search, Plus, Image, FileSpreadsheet, File } from 'lucide-react';
import { styles, theme } from '../theme';

interface MaterialsViewProps {
  files: MaterialFile[];
}

const MaterialsView: React.FC<MaterialsViewProps> = ({ files }) => {
  const getIcon = (type: string) => {
      switch(type) {
          case 'folder': return <Folder size={32} className="text-yellow-400" fill="currentColor" fillOpacity={0.2} />;
          case 'pdf': return <FileText size={20} className="text-red-400" />;
          case 'image': return <Image size={20} className="text-blue-400" />;
          case 'google-sheet': return <FileSpreadsheet size={20} className="text-emerald-400" />;
          default: return <File size={20} className="text-slate-400" />;
      }
  };

  const folders = files.filter(f => f.type === 'folder');
  const items = files.filter(f => f.type !== 'folder');

  return (
    <div style={styles.scrollableContent}>
       <div style={{marginBottom: '20px', paddingTop: '8px'}}>
          <h1 style={styles.title}>Materials</h1>
          <p style={styles.subtitle}>Documents & Resources</p>
       </div>

       <div style={{marginBottom: '24px', position: 'relative'}}>
          <Search size={18} style={{position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted}} />
          <input 
            placeholder="Search files..."
            style={{...styles.input, width: '100%', paddingLeft: '42px', boxSizing: 'border-box', borderRadius: '16px'}}
          />
       </div>

       <div style={{marginBottom: '24px'}}>
           <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: theme.textMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px'}}>Folders</h3>
           <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px'}}>
              {folders.map(folder => (
                  <div key={folder.id} style={{...styles.card, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'}}>
                     {getIcon(folder.type)}
                     <span style={{fontSize: '0.75rem', fontWeight: 600, color: '#fff', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap'}}>{folder.name}</span>
                     <span style={{fontSize: '0.6rem', color: theme.textMuted}}>2 items</span>
                  </div>
              ))}
              {folders.length === 0 && <p style={{color: theme.textMuted, fontSize: '0.8rem', fontStyle: 'italic'}}>No folders.</p>}
           </div>
       </div>

       <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: theme.textMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px'}}>Recent Files</h3>
       <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {items.map(file => (
             <div key={file.id} style={{display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                   {getIcon(file.type)}
                </div>
                <div style={{flex: 1}}>
                   <h4 style={{margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff'}}>{file.name}</h4>
                   <p style={{margin: 0, fontSize: '0.7rem', color: theme.textMuted}}>{file.size} • {file.dateAdded}</p>
                </div>
                <button style={{background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: '8px', borderRadius: '50%'}}>
                   <MoreVertical size={18} />
                </button>
             </div>
          ))}
          {items.length === 0 && <p style={{color: theme.textMuted, fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px'}}>No files yet.</p>}
       </div>
       
       <button style={{...styles.button, position: 'fixed', bottom: '100px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', padding: 0, justifyContent: 'center', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)', zIndex: 100}}>
          <Plus size={24} />
       </button>
    </div>
  );
};

export default MaterialsView;
