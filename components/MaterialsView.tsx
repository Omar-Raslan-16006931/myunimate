
import React, { useRef, useState, useEffect } from 'react';
import { MaterialFile } from '../types';
import * as XLSX from 'xlsx';
import { Folder, FileText, Download, MoreVertical, Search, Plus, Image, FileSpreadsheet, File, ArrowLeft, Eye, Edit2, Trash2, FolderPlus, CornerUpLeft, X, Minus, RotateCcw, Move, MousePointer2, FileType, Save, FilePlus } from 'lucide-react';
import { styles, theme } from '../theme';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { PdfViewer } from './PdfViewer';
import { generateId } from '../constants';

interface MaterialsViewProps {
  files: MaterialFile[];
  onAddFile: (file: MaterialFile) => void;
  onUpdateFile: (id: string, updates: Partial<MaterialFile>) => void;
  onDeleteFile: (id: string) => void;
  onBack: () => void;
  onFileViewChange?: (isViewing: boolean) => void;
}

const ExcelViewer: React.FC<{ data: string }> = ({ data }) => {
    const [sheets, setSheets] = useState<{ name: string, data: any[][] }[]>([]);
    const [activeSheet, setActiveSheet] = useState(0);

    React.useEffect(() => {
        if (!data) return;
        try {
            const base64Data = data.includes(',') ? data.split(',')[1] : data;
            const workbook = XLSX.read(base64Data, { type: 'base64' });
            const result = workbook.SheetNames.map(name => ({
                name,
                data: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }) as any[][]
            }));
            setSheets(result);
        } catch (e) {
            console.error("Excel parsing error:", e);
        }
    }, [data]);

    if (sheets.length === 0) return <div className="text-white p-4">Loading Excel data...</div>;

    return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden">
            <div className="flex bg-gray-100 border-b overflow-x-auto shrink-0">
                {sheets.map((sheet, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveSheet(i)}
                        className={`px-4 py-2 text-xs font-bold border-r whitespace-nowrap ${activeSheet === i ? 'bg-white text-emerald-600 border-b-2 border-b-emerald-500' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                        {sheet.name}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-auto p-4">
                <table className="border-collapse w-full text-xs text-gray-800">
                    <tbody>
                        {sheets[activeSheet].data.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j} className="border border-gray-300 p-2 min-w-[80px]">
                                        {cell?.toString() || ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const MaterialsView: React.FC<MaterialsViewProps> = ({ files, onAddFile, onUpdateFile, onDeleteFile, onBack, onFileViewChange }) => {
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
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteName, setNoteName] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  useEffect(() => {
    onFileViewChange?.(isEditingNote || !!viewingFile);
  }, [isEditingNote, viewingFile, onFileViewChange]);

  const getIcon = (type: string) => {
      switch(type) {
          case 'folder': return <Folder size={32} className="text-yellow-400" fill="currentColor" fillOpacity={0.2} />;
          case 'pdf': return <FileText size={20} className="text-red-400" />;
          case 'image': return <Image size={20} className="text-blue-400" />;
          case 'excel': return <FileSpreadsheet size={20} className="text-emerald-400" />;
          case 'powerpoint': return <FileType size={20} className="text-orange-400" />;
          case 'word': return <FileText size={20} className="text-blue-500" />;
          case 'txt': return <FileText size={20} className="text-slate-300" />;
          default: return <File size={20} className="text-slate-400" />;
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
      if (!allowedTypes.includes(file.type)) {
          alert('Invalid file format. Please upload PDF, JPG, PNG, or DOCX files.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      // Max 10MB limit
      if (file.size > 10 * 1024 * 1024) {
          alert("File is too large. Please upload files smaller than 10MB.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          const base64 = event.target?.result as string;
          
          let type = 'other';
          if (file.type.includes('pdf')) type = 'pdf';
          else if (file.type.includes('image')) type = 'image';
          else if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) type = 'excel';
          else if (file.type.includes('presentation') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) type = 'powerpoint';
          else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) type = 'word';

          const newFile: MaterialFile = {
              id: generateId(),
              name: file.name,
              type: type as any,
              size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
              dateAdded: new Date().toISOString().split('T')[0],
              fileData: base64,
              mimeType: file.type,
              parentId: currentFolderId || undefined
          };
          onAddFile(newFile);
          
          // Reset input so the same file can be selected again
          if (fileInputRef.current) {
              fileInputRef.current.value = '';
          }
      };
      reader.readAsDataURL(file);
  };

  const openFile = (file: MaterialFile) => {
      if (file.type === 'folder') {
          setCurrentFolderId(file.id);
          return;
      }
      
      if (file.type === 'txt') {
          setActiveNoteId(file.id);
          setNoteName(file.name);
          setNoteContent(file.content || '');
          setIsEditingNote(true);
          return;
      }

      setViewingFile(file);
  };

  const handleSaveNote = () => {
    if (!noteName.trim()) {
        alert("Please enter a file name");
        return;
    }

    const fileName = noteName.endsWith('.txt') ? noteName : `${noteName}.txt`;

    if (activeNoteId) {
        // Find the file to update its size based on new content
        const size = (new Blob([noteContent]).size / 1024).toFixed(1) + ' KB';
        onUpdateFile(activeNoteId, { 
            name: fileName, 
            content: noteContent,
            size: size
        });
    } else {
        const newFile: MaterialFile = {
            id: generateId(),
            name: fileName,
            type: 'txt',
            size: (new Blob([noteContent]).size / 1024).toFixed(1) + ' KB',
            dateAdded: new Date().toISOString().split('T')[0],
            content: noteContent,
            parentId: currentFolderId || undefined
        };
        onAddFile(newFile);
    }
    
    setIsEditingNote(false);
    setActiveNoteId(null);
    setNoteName('');
    setNoteContent('');
  };

  const handleCreateFolder = () => {
      if (!newFolderName.trim()) return;
      const newFolder: MaterialFile = {
          id: generateId(),
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
      onUpdateFile(fileId, { parentId: targetFolderId || null });
      setMovingFileId(null);
      setActiveMenuId(null);
  };

  const handleDownload = (file: MaterialFile) => {
      if (!file.fileData) return;
      
      try {
          // Try converting base64 to blob for more reliable downloading
          if (file.fileData.startsWith('data:')) {
              const arr = file.fileData.split(',');
              const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
              const bstr = atob(arr[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while(n--){
                  u8arr[n] = bstr.charCodeAt(n);
              }
              const blob = new Blob([u8arr], {type: mime});
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = file.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              return;
          }
      } catch (e) {
          console.warn("Blob conversion failed, falling back to direct link", e);
      }

      // Fallback
      const link = document.createElement('a');
      link.href = file.fileData;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    <div style={styles.scrollableContent} onClick={() => { setActiveMenuId(null); setIsPlusMenuOpen(false); }}>
       <div style={{marginBottom: '20px', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '12px'}}>
          <button onClick={() => currentFolderId ? setCurrentFolderId(null) : onBack()} style={{background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0}}>
              <ArrowLeft size={24} />
          </button>
          <div style={{flex: 1}}>
              <h1 style={styles.title}>{currentFolderId ? files.find(f => f.id === currentFolderId)?.name : 'Materials'}</h1>
              <p style={styles.subtitle}>{currentFolderId ? 'Folder Contents' : 'Documents & Resources'}</p>
          </div>
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
                <div style={{flex: 1, cursor: 'pointer', minWidth: 0}} onClick={() => openFile(file)}>
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
                       <h4 style={{margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={file.name}>{file.name}</h4>
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
       <div style={{position: 'fixed', bottom: '100px', right: '20px', zIndex: 100}}>
           {isPlusMenuOpen && (
               <div 
                   className="absolute bottom-16 right-0 bg-[#1e1e24] border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[160px] flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-4 duration-200"
                   onClick={e => e.stopPropagation()}
               >
                   <button 
                       onClick={() => { setIsPlusMenuOpen(false); fileInputRef.current?.click(); }}
                       className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 rounded-xl text-white text-sm font-semibold transition-colors"
                   >
                       <Plus size={18} className="text-violet-400" />
                       Upload File
                   </button>
                   <button 
                       onClick={() => { setIsPlusMenuOpen(false); setIsCreatingFolder(true); }}
                       className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 rounded-xl text-white text-sm font-semibold transition-colors"
                   >
                       <FolderPlus size={18} className="text-yellow-400" />
                       New Folder
                   </button>
                   <button 
                       onClick={() => { setIsPlusMenuOpen(false); setNoteName(''); setNoteContent(''); setActiveNoteId(null); setIsEditingNote(true); }}
                       className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 rounded-xl text-white text-sm font-semibold transition-colors"
                   >
                       <FilePlus size={18} className="text-blue-400" />
                       New Note
                   </button>
               </div>
           )}
           <button 
               onClick={(e) => { e.stopPropagation(); setIsPlusMenuOpen(!isPlusMenuOpen); }}
               style={{...styles.button, width: '56px', height: '56px', borderRadius: '50%', padding: 0, justifyContent: 'center', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)', marginBottom: 0}}
           >
              <Plus size={24} className={`transition-transform duration-300 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
           </button>
       </div>

       {isEditingNote && (
           <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsEditingNote(false)}>
               <div 
                   className="w-full h-full md:w-[80%] md:h-[80%] max-w-4xl bg-[#0a0a0c] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] md:rounded-3xl border-0 md:border md:border-white/10 animate-in zoom-in-95 duration-300"
                   onClick={e => e.stopPropagation()}
               >
                   <div className="p-3 md:p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0 gap-2 md:gap-4">
                       <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                           <div className="w-8 h-8 md:w-10 md:h-10 bg-violet-500/20 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                               <FileText className="text-violet-400" size={18} />
                           </div>
                           <input 
                               value={noteName}
                               onChange={e => setNoteName(e.target.value)}
                               placeholder="Note Title..."
                               className="bg-transparent border-none text-white font-bold text-base md:text-lg focus:outline-none flex-1 placeholder:text-white/20 min-w-0"
                               autoFocus
                           />
                       </div>

                       <div className="flex items-center gap-2">
                           <button 
                               onClick={handleSaveNote}
                               className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg shadow-violet-600/20 active:scale-95"
                           >
                               <Save size={18} /> <span className="hidden xs:inline">Save</span>
                           </button>
                           <button 
                               onClick={() => { setIsEditingNote(false); setActiveNoteId(null); setNoteName(''); setNoteContent(''); }}
                               className="bg-white/5 hover:bg-white/10 text-white p-2 rounded-xl transition-colors border border-white/10 active:scale-95"
                           >
                               <X size={20} />
                           </button>
                       </div>
                   </div>

                   <div className="flex-1 relative overflow-hidden flex flex-col">
                       <textarea 
                           value={noteContent}
                           onChange={e => setNoteContent(e.target.value)}
                           placeholder="Start typing your note here..."
                           className="flex-1 w-full p-4 md:p-6 bg-transparent text-white/90 text-base md:text-lg leading-relaxed resize-none focus:outline-none placeholder:text-white/10 font-medium"
                           spellCheck={false}
                       />
                       <div className="px-4 md:px-6 py-2 md:py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-white/30">
                           <div className="flex gap-3 md:gap-4">
                               <span>{noteContent.length} chars</span>
                               <span>{noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0} words</span>
                           </div>
                           <span>Text File (.txt)</span>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {viewingFile && (
           <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
               <div className="w-full h-full max-w-6xl bg-[#0a0a0c] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                   <div className="p-3 border-b border-white/5 bg-black/40 flex items-center justify-between shrink-0 gap-4">
                       <div className="flex items-center gap-3 min-w-0">
                           {getIcon(viewingFile.type)}
                           <div className="min-w-0">
                               <h2 className="text-white font-bold text-lg truncate" title={viewingFile.name}>{viewingFile.name}</h2>
                               <p className="text-white/50 text-xs truncate">{viewingFile.size} • {viewingFile.type.toUpperCase()}</p>
                           </div>
                       </div>

                       <div className="flex items-center gap-2 shrink-0">
                           {viewingFile.fileData && (
                               <button 
                                   onClick={() => handleDownload(viewingFile)}
                                   className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors border border-white/10"
                                   title="Download"
                               >
                                   <Download size={18} />
                               </button>
                           )}
                           
                           <button 
                               onClick={() => { setViewingFile(null); onFileViewChange?.(false); }}
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
                             ) : viewingFile.type === 'excel' ? (
                                 <ExcelViewer data={viewingFile.fileData} />
                             ) : viewingFile.type === 'powerpoint' || viewingFile.type === 'word' ? (
                                 <div className="text-white/50 flex flex-col items-center gap-4">
                                     <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-2">
                                         {getIcon(viewingFile.type)}
                                     </div>
                                     <div className="text-center">
                                         <p className="text-white font-bold mb-1">Preview not available</p>
                                         <p className="text-sm opacity-60">Direct preview for {viewingFile.type === 'powerpoint' ? 'PowerPoint' : 'Word'} files is not supported in browser.</p>
                                     </div>
                                     <button 
                                         onClick={() => handleDownload(viewingFile)} 
                                         className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                     >
                                         <Download size={18} /> Download to View
                                     </button>
                                 </div>
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
                                   <button onClick={() => handleDownload(viewingFile)} className="text-violet-400 hover:text-violet-300 underline">Download File</button>
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
