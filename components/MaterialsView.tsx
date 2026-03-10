
import React, { useRef, useState } from 'react';
import { MaterialFile } from '../types';
import { Folder, FileText, Download, MoreVertical, Search, Plus, Image, FileSpreadsheet, File, ArrowLeft, Eye, Edit2, Trash2, FolderPlus, CornerUpLeft, X, Minus, RotateCcw, Move, MousePointer2 } from 'lucide-react';
import { styles, theme } from '../theme';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { PdfViewer } from './PdfViewer';

interface MaterialsViewProps {
  files: MaterialFile[];
  onAddFile: (file: MaterialFile) => void;
  onUpdateFile: (id: string, updates: Partial<MaterialFile>) => void;
  onDeleteFile: (id: string) => void;
  onBack: () => void;
}

const MaterialsView: React.FC<MaterialsViewProps> = ({ files, onAddFile, onUpdateFile, onDeleteFile, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [movingFileId, setMovingFileId] = useState<string | null>(null);

  const [viewingFile, setViewingFile] = useState<MaterialFile | null>(null);

  const getIcon = (type: string) => {
      switch(type) {
          case 'folder': return <Folder size={32} className="text-yellow-400" fill="currentColor" fillOpacity={0.2} />;
          case 'pdf': return <FileText size={20} className="text-red-400" />;
          case 'image': return <Image size={20} className="text-blue-400" />;
          case 'google-sheet': return <FileSpreadsheet size={20} className="text-emerald-400" />;
          default: return <File size={20} className="text-slate-400" />;
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const newFile: MaterialFile = {
              id: crypto.randomUUID(),
              name: file.name,
              type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'other',
              size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
              dateAdded: new Date().toISOString().split('T')[0],
              fileData: base64,
              mimeType: file.type,
              parentId: currentFolderId || undefined
          };
          onAddFile(newFile);
      };
      reader.readAsDataURL(file);
  };

  const openFile = (file: MaterialFile) => {
      if (file.type === 'folder') {
          setCurrentFolderId(file.id);
          return;
      }
      setViewingFile(file);
  };

  const handleCreateFolder = () => {
      if (!newFolderName.trim()) return;
      const newFolder: MaterialFile = {
          id: crypto.randomUUID(),
          name: newFolderName.trim(),
          type: 'folder',
          dateAdded: new Date().toISOString().split('T')[0],
          parentId: currentFolderId || undefined
      };
      onAddFile(newFolder);
      setNewFolderName('');
      setIsCreatingFolder(false);
  };

  const handleRename = (id: string) => {
      if (!editFileName.trim()) return;
      const file = files.find(f => f.id === id);
      if (!file) return;

      let newName = editFileName.trim();
      
      // If it's a file (not a folder), preserve the extension
      if (file.type !== 'folder' && file.name.includes('.')) {
          const originalExt = file.name.split('.').pop();
          const newExt = newName.split('.').pop();
          
          if (originalExt && originalExt.toLowerCase() !== newExt?.toLowerCase()) {
              // If the user tried to change the extension, append the original one
              // Unless they completely removed the extension, then we add it back
              if (!newName.toLowerCase().endsWith(`.${originalExt.toLowerCase()}`)) {
                  newName = `${newName}.${originalExt}`;
              }
          }
      }

      onUpdateFile(id, { name: newName });
      setEditingFileId(null);
      setEditFileName('');
  };

  const handleMove = (fileId: string, targetFolderId: string | null) => {
      onUpdateFile(fileId, { parentId: targetFolderId || undefined });
      setMovingFileId(null);
      setActiveMenuId(null);
  };

  const displayedFiles = files.filter(f => {
      if (searchQuery) return f.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (currentFolderId) return f.parentId === currentFolderId;
      return !f.parentId;
  });

  const folders = displayedFiles.filter(f => f.type === 'folder');
  const items = displayedFiles.filter(f => f.type !== 'folder');
  const allFolders = files.filter(f => f.type === 'folder');

  return (
    <div style={styles.scrollableContent} onClick={() => setActiveMenuId(null)}>
       <div style={{marginBottom: '20px', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <button onClick={() => currentFolderId ? setCurrentFolderId(null) : onBack()} style={{background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0}}>
              <ArrowLeft size={24} />
          </button>
          <div style={{flex: 1}}>
              <h1 style={styles.title}>{currentFolderId ? files.find(f => f.id === currentFolderId)?.name : 'Materials'}</h1>
              <p style={styles.subtitle}>{currentFolderId ? 'Folder Contents' : 'Documents & Resources'}</p>
          </div>
          <button onClick={() => setIsCreatingFolder(true)} style={{background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600}}>
              <FolderPlus size={16} /> New Folder
          </button>
       </div>

       {isCreatingFolder && (
           <div style={{marginBottom: '24px', display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '16px'}}>
               <input 
                   autoFocus
                   value={newFolderName}
                   onChange={e => setNewFolderName(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                   placeholder="Folder name..."
                   style={{...styles.input, flex: 1, marginBottom: 0, padding: '8px 12px'}}
               />
               <button onClick={handleCreateFolder} style={{...styles.button, padding: '8px 16px', marginBottom: 0}}>Create</button>
               <button onClick={() => setIsCreatingFolder(false)} style={{background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer'}}>Cancel</button>
           </div>
       )}

       <div style={{marginBottom: '24px', position: 'relative'}}>
          <Search size={18} style={{position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: theme.textMuted}} />
          <input 
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{...styles.input, width: '100%', paddingLeft: '42px', boxSizing: 'border-box', borderRadius: '16px'}}
          />
       </div>

       {folders.length > 0 && (
           <div style={{marginBottom: '24px'}}>
                <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: theme.textMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px'}}>Folders</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px'}}>
                   {folders.map(folder => (
                       <div key={folder.id} style={{position: 'relative'}}>
                           <div onClick={() => openFile(folder)} style={{...styles.card, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'}}>
                              {getIcon(folder.type)}
                              {editingFileId === folder.id ? (
                                  <input 
                                      autoFocus
                                      value={editFileName}
                                      onChange={e => setEditFileName(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && handleRename(folder.id)}
                                      onBlur={() => handleRename(folder.id)}
                                      onClick={e => e.stopPropagation()}
                                      style={{width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.75rem', padding: '2px 4px', borderRadius: '4px', textAlign: 'center'}}
                                  />
                              ) : (
                                  <span style={{fontSize: '0.75rem', fontWeight: 600, color: '#fff', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap'}}>{folder.name}</span>
                              )}
                              <span style={{fontSize: '0.6rem', color: theme.textMuted}}>{files.filter(f => f.parentId === folder.id).length} items</span>
                           </div>
                           <button 
                               onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === folder.id ? null : folder.id); }}
                               style={{position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: '4px'}}
                           >
                               <MoreVertical size={14} />
                           </button>
                           {activeMenuId === folder.id && (
                               <div style={{position: 'absolute', top: '24px', right: '4px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', zIndex: 10, minWidth: '120px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
                                   <button onClick={(e) => { e.stopPropagation(); setEditingFileId(folder.id); setEditFileName(folder.name); setActiveMenuId(null); }} style={{width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}><Edit2 size={14} /> Rename</button>
                                   <button onClick={(e) => { e.stopPropagation(); onDeleteFile(folder.id); setActiveMenuId(null); }} style={{width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: theme.danger, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}><Trash2 size={14} /> Delete</button>
                               </div>
                           )}
                       </div>
                   ))}
                </div>
           </div>
       )}

       <h3 style={{fontSize: '0.8rem', fontWeight: 800, color: theme.textMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px'}}>Files</h3>
       <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          {items.map(file => (
             <div key={file.id} style={{position: 'relative', display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                   {getIcon(file.type)}
                </div>
                <div style={{flex: 1, cursor: 'pointer'}} onClick={() => openFile(file)}>
                   {editingFileId === file.id ? (
                       <input 
                           autoFocus
                           value={editFileName}
                           onChange={e => setEditFileName(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleRename(file.id)}
                           onBlur={() => handleRename(file.id)}
                           onClick={e => e.stopPropagation()}
                           style={{width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.9rem', padding: '2px 4px', borderRadius: '4px'}}
                       />
                   ) : (
                       <h4 style={{margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff'}}>{file.name}</h4>
                   )}
                   <p style={{margin: 0, fontSize: '0.7rem', color: theme.textMuted}}>{file.size} • {file.dateAdded}</p>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                    <button onClick={() => openFile(file)} style={{background: 'transparent', border: 'none', color: theme.accent, cursor: 'pointer', padding: '8px', borderRadius: '50%'}}>
                       <Eye size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id); }} style={{background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: '8px', borderRadius: '50%'}}>
                       <MoreVertical size={18} />
                    </button>
                </div>
                {activeMenuId === file.id && (
                    <div style={{position: 'absolute', top: '40px', right: '16px', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', zIndex: 10, minWidth: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'}}>
                        <button onClick={(e) => { e.stopPropagation(); setEditingFileId(file.id); setEditFileName(file.name); setActiveMenuId(null); }} style={{width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}><Edit2 size={14} /> Rename</button>
                        <button onClick={(e) => { e.stopPropagation(); setMovingFileId(file.id); setActiveMenuId(null); }} style={{width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}><CornerUpLeft size={14} /> Move to...</button>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); setActiveMenuId(null); }} style={{width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: theme.danger, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'}}><Trash2 size={14} /> Delete</button>
                    </div>
                )}
             </div>
          ))}
          {items.length === 0 && <p style={{color: theme.textMuted, fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '20px'}}>No files yet.</p>}
       </div>

       {movingFileId && (
           <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}} onClick={() => setMovingFileId(null)}>
               <div style={{background: '#1e1e24', borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.1)'}} onClick={e => e.stopPropagation()}>
                   <h3 style={{color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px'}}>Move File</h3>
                   <div style={{maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                       <button onClick={() => handleMove(movingFileId, null)} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', textAlign: 'left'}}>
                           <Folder size={20} className="text-slate-400" /> Root Directory
                       </button>
                       {allFolders.filter(f => f.id !== movingFileId).map(folder => (
                           <button key={folder.id} onClick={() => handleMove(movingFileId, folder.id)} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', textAlign: 'left'}}>
                               <Folder size={20} className="text-yellow-400" /> {folder.name}
                           </button>
                       ))}
                   </div>
                   <button onClick={() => setMovingFileId(null)} style={{width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', marginTop: '16px', cursor: 'pointer'}}>Cancel</button>
               </div>
           </div>
       )}
       
       <input 
           type="file" 
           ref={fileInputRef} 
           style={{display: 'none'}} 
           onChange={handleFileChange}
           accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
       />
       <button 
           onClick={() => fileInputRef.current?.click()}
           style={{...styles.button, position: 'fixed', bottom: '100px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', padding: 0, justifyContent: 'center', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)', zIndex: 100}}
       >
          <Plus size={24} />
       </button>

       {viewingFile && (
           <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
               <div className="w-full h-full max-w-6xl max-h-[90vh] bg-[#130f1c] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                   <div className="p-4 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0 gap-4">
                       <div className="flex items-center gap-3 min-w-0">
                           {getIcon(viewingFile.type)}
                           <div className="min-w-0">
                               <h2 className="text-white font-bold text-lg truncate" title={viewingFile.name}>{viewingFile.name}</h2>
                               <p className="text-white/50 text-xs truncate">{viewingFile.size} • {viewingFile.type.toUpperCase()}</p>
                           </div>
                       </div>

                       <div className="flex items-center gap-2 shrink-0">
                           {viewingFile.fileData && (
                               <a 
                                   href={viewingFile.fileData} 
                                   download={viewingFile.name}
                                   className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors border border-white/10"
                                   title="Download"
                               >
                                   <Download size={18} />
                               </a>
                           )}
                           
                           <button 
                               onClick={() => { setViewingFile(null); }}
                               className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors border border-white/10"
                               title="Close"
                           >
                               <X size={18} />
                           </button>
                       </div>
                   </div>
                   
                    <div className="flex-1 overflow-hidden bg-black relative flex items-center justify-center">
                       {viewingFile.fileData ? (
                                                       viewingFile.type === 'image' ? (
                                <TransformWrapper
                                    initialScale={1}
                                    minScale={0.5}
                                    maxScale={5}
                                    centerOnInit
                                    wheel={{ step: 0.1 }}
                                >
                                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                        <img 
                                            src={viewingFile.fileData} 
                                            alt={viewingFile.name} 
                                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                                        />
                                    </TransformComponent>
                                </TransformWrapper>
                            ) : viewingFile.type === 'pdf' ? (
                                <PdfViewer file={viewingFile.fileData} />
                            ) : (
                                <iframe src={viewingFile.fileData} className="w-full h-full rounded-lg bg-white shadow-2xl border-0" title={viewingFile.name} />
                            )
                       ) : viewingFile.webViewLink ? (
                           <iframe src={viewingFile.webViewLink} className="w-full h-full rounded-lg bg-white shadow-2xl" title={viewingFile.name} />
                       ) : (
                           <div className="text-white/50 flex flex-col items-center gap-4">
                               <File size={48} className="opacity-50" />
                               <p>Preview not available for this file type.</p>
                               {viewingFile.fileData && (
                                   <a href={viewingFile.fileData} download={viewingFile.name} className="text-violet-400 hover:text-violet-300 underline">Download File</a>
                               )}
                           </div>
                       )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default MaterialsView;
