
import React, { useRef, useState, useEffect } from 'react';
import { MaterialFile } from '../types';
import * as XLSX from 'xlsx';
import { Folder, FileText, Download, MoreVertical, Search, Plus, Image, FileSpreadsheet, File, ArrowLeft, Eye, Edit2, Trash2, FolderPlus, CornerUpLeft, X, RotateCw, FileType, FilePlus, Save } from 'lucide-react';
import { styles, theme } from '../theme';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { PdfViewer } from './PdfViewer';
import { generateId } from '../constants';

interface MaterialsViewProps {
  files: MaterialFile[];
  onAddFile: (file: MaterialFile) => void;
  onUpdateFile: (id: string, updates: Partial<MaterialFile>) => void;
  onDeleteFile: (id: string) => void;
  onLoadFileContent: (id: string) => Promise<string>;
  onBack: () => void;
  onFileViewChange?: (isViewing: boolean) => void;
}

const INK = '#1A1730';
const CARD_BG = '#FAFAF6';
const HL_YELLOW = '#F6DF63';
const HL_GREEN = '#8CE3B7';
const HL_BLUE = '#9ECFFF';
const HL_RED = '#E56A5A';
const HL_ORANGE = '#F4BE8A';

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

    if (sheets.length === 0) return <div style={{ color: INK, padding: '16px' }}>Loading Excel data...</div>;

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

const MaterialsView: React.FC<MaterialsViewProps> = ({ files, onAddFile, onUpdateFile, onDeleteFile, onLoadFileContent, onBack, onFileViewChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
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
          case 'folder': return <Folder size={32} color="#F4BE8A" fill="#F4BE8A" fillOpacity={0.3} />;
          case 'pdf': return <FileText size={20} color={HL_RED} />;
          case 'image': return <Image size={20} color={HL_BLUE} />;
          case 'excel': return <FileSpreadsheet size={20} color={HL_GREEN} />;
          case 'powerpoint': return <FileType size={20} color={HL_ORANGE} />;
          case 'word': return <FileText size={20} color={HL_BLUE} />;
          case 'txt': return <FileText size={20} color={`rgba(26,23,48,0.5)`} />;
          default: return <File size={20} color={`rgba(26,23,48,0.4)`} />;
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

  const openFile = async (file: MaterialFile) => {
      if (file.type === 'folder') {
          setCurrentFolderId(file.id);
          return;
      }

      // Lazy load content if missing
      let fileContent = file.fileData;
    if (fileContent === undefined) {
          setIsLoadingContent(true);
          fileContent = await onLoadFileContent(file.id);
          setIsLoadingContent(false);
          if (fileContent === undefined) return; // Error handled in App.tsx
      }

      if (file.type === 'txt') {
          setActiveNoteId(file.id);
          setNoteName(file.name);
          setNoteContent(fileContent || '');
          setIsEditingNote(true);
          return;
      }

      setViewingFile({ ...file, fileData: fileContent });
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
            fileData: noteContent,
            size: size
        });
    } else {
        const newFile: MaterialFile = {
            id: generateId(),
            name: fileName,
            type: 'txt',
            size: (new Blob([noteContent]).size / 1024).toFixed(1) + ' KB',
            dateAdded: new Date().toISOString().split('T')[0],
            fileData: noteContent,
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

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: `rgba(26,23,48,0.5)`,
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
  };

  const contextMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '28px',
    right: '4px',
    background: CARD_BG,
    border: `1.5px solid ${INK}`,
    borderRadius: '10px',
    boxShadow: `4px 5px 0 ${INK}`,
    padding: '4px',
    zIndex: 50,
    minWidth: '130px',
  };

  const menuBtnStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: INK,
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
    fontWeight: 600,
    borderRadius: '6px',
  };

  return (
    <div style={styles.scrollableContent} onClick={() => { setActiveMenuId(null); setIsPlusMenuOpen(false); }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => currentFolderId ? setCurrentFolderId(null) : onBack()}
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
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
            fontWeight: 800,
            fontSize: '1.5rem',
            color: INK,
            margin: 0,
          }}>
            {currentFolderId ? files.find(f => f.id === currentFolderId)?.name : 'Materials'}
          </h1>
          <p style={{ fontFamily: "'Instrument Sans', 'Inter', sans-serif", color: `rgba(26,23,48,0.5)`, fontSize: '0.78rem', margin: 0, fontWeight: 500 }}>
            {currentFolderId ? 'Folder Contents' : 'Documents & Resources'}
          </p>
        </div>
      </div>

      {/* Create folder row */}
      {isCreatingFolder && (
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          gap: '8px',
          background: `${HL_YELLOW}44`,
          border: `1.5px solid ${INK}`,
          padding: '12px',
          borderRadius: '10px',
        }}>
          <input
            autoFocus
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Folder name..."
            style={{
              flex: 1,
              background: CARD_BG,
              border: `1.5px solid ${INK}`,
              borderRadius: '8px',
              padding: '8px 12px',
              color: INK,
              fontSize: '0.85rem',
              outline: 'none',
              fontFamily: "'Instrument Sans', 'Inter', sans-serif",
            }}
          />
          <button
            onClick={handleCreateFolder}
            style={{
              background: INK,
              color: '#fff',
              border: `1.5px solid ${INK}`,
              borderRadius: '8px',
              fontWeight: 700,
              boxShadow: `3px 3px 0 ${HL_YELLOW}`,
              cursor: 'pointer',
              padding: '8px 14px',
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: '0.8rem',
            }}
          >
            Create
          </button>
          <button
            onClick={() => setIsCreatingFolder(false)}
            style={{
              background: 'rgba(26,23,48,0.07)',
              border: `1.5px solid ${INK}`,
              borderRadius: '8px',
              color: INK,
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              fontFamily: "'Instrument Sans', 'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <Search size={18} color={`rgba(26,23,48,0.4)`} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          placeholder="Search files..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(26,23,48,0.06)',
            border: `1.5px solid ${INK}`,
            borderRadius: '10px',
            padding: '11px 14px 11px 44px',
            color: INK,
            fontFamily: "'Instrument Sans', 'Inter', sans-serif",
            fontSize: '0.9rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Loading overlay */}
      {isLoadingContent && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center" style={{ background: 'rgba(26,23,48,0.5)' }}>
          <div style={{
            background: CARD_BG,
            border: `1.5px solid ${INK}`,
            borderRadius: '14px',
            boxShadow: `8px 10px 0 ${INK}`,
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}>
            <RotateCw className="animate-spin" size={28} color={INK} />
            <span style={{ color: INK, fontWeight: 700, fontSize: '0.9rem', fontFamily: "'Instrument Sans', 'Inter', sans-serif", textAlign: 'center' }}>
              Downloading file content...<br />
              <span style={{ opacity: 0.5, fontSize: '0.75rem', fontWeight: 500 }}>Syncing with server</span>
            </span>
          </div>
        </div>
      )}

      {/* Folders */}
      {folders.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <h3 style={sectionLabelStyle}>Folders</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
            {folders.map(folder => (
              <div key={folder.id} style={{ position: 'relative' }}>
                <div
                  onClick={() => openFile(folder)}
                  style={{
                    background: CARD_BG,
                    border: `1.5px solid ${INK}`,
                    borderRadius: '10px',
                    boxShadow: `3px 4px 0 ${INK}`,
                    padding: '14px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  {getIcon(folder.type)}
                  {editingFileId === folder.id ? (
                    <input
                      autoFocus
                      value={editFileName}
                      onChange={e => setEditFileName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(folder.id)}
                      onBlur={() => handleRename(folder.id)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%',
                        background: 'rgba(26,23,48,0.06)',
                        border: `1.5px solid ${INK}`,
                        color: INK,
                        fontSize: '0.72rem',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: INK, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap', fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}>
                      {folder.name}
                    </span>
                  )}
                  <span style={{ fontSize: '0.6rem', color: `rgba(26,23,48,0.45)`, fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}>
                    {files.filter(f => f.parentId === folder.id).length} items
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === folder.id ? null : folder.id); }}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'transparent', border: 'none', color: `rgba(26,23,48,0.4)`, cursor: 'pointer', padding: '4px' }}
                >
                  <MoreVertical size={13} />
                </button>
                {activeMenuId === folder.id && (
                  <div style={contextMenuStyle}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingFileId(folder.id); setEditFileName(folder.name); setActiveMenuId(null); }}
                      style={menuBtnStyle}
                    >
                      <Edit2 size={13} /> Rename
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteFile(folder.id); setActiveMenuId(null); }}
                      style={{ ...menuBtnStyle, color: HL_RED }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      <h3 style={sectionLabelStyle}>Files</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(file => (
          <div
            key={file.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 14px',
              background: CARD_BG,
              border: `1.5px solid ${INK}`,
              borderRadius: '10px',
              boxShadow: `3px 4px 0 ${INK}`,
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: `rgba(26,23,48,0.06)`,
              border: `1px solid rgba(26,23,48,0.12)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {getIcon(file.type)}
            </div>
            <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => openFile(file)}>
              {editingFileId === file.id ? (
                <input
                  autoFocus
                  value={editFileName}
                  onChange={e => setEditFileName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRename(file.id)}
                  onBlur={() => handleRename(file.id)}
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: '100%',
                    background: 'rgba(26,23,48,0.06)',
                    border: `1.5px solid ${INK}`,
                    color: INK,
                    fontSize: '0.88rem',
                    padding: '3px 6px',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              ) : (
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Instrument Sans', 'Inter', sans-serif" }} title={file.name}>
                  {file.name}
                </h4>
              )}
              <p style={{ margin: 0, fontSize: '0.68rem', color: `rgba(26,23,48,0.45)`, fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}>
                {file.size} • {file.dateAdded}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => openFile(file)}
                style={{ background: 'transparent', border: 'none', color: INK, cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
              >
                <Eye size={17} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id); }}
                style={{ background: 'transparent', border: 'none', color: `rgba(26,23,48,0.45)`, cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}
              >
                <MoreVertical size={17} />
              </button>
            </div>
            {activeMenuId === file.id && (
              <div style={{ ...contextMenuStyle, top: '44px' }}>
                <button onClick={(e) => { e.stopPropagation(); setEditingFileId(file.id); setEditFileName(file.name); setActiveMenuId(null); }} style={menuBtnStyle}>
                  <Edit2 size={13} /> Rename
                </button>
                <button onClick={(e) => { e.stopPropagation(); setMovingFileId(file.id); setActiveMenuId(null); }} style={menuBtnStyle}>
                  <CornerUpLeft size={13} /> Move to...
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); setActiveMenuId(null); }} style={{ ...menuBtnStyle, color: HL_RED }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p style={{ color: `rgba(26,23,48,0.4)`, fontSize: '0.8rem', fontStyle: 'italic', textAlign: 'center', padding: '24px', fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}>
            No files yet.
          </p>
        )}
      </div>

      {/* Move file modal */}
      {movingFileId && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(26,23,48,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setMovingFileId(null)}
        >
          <div
            style={{
              background: CARD_BG,
              border: `1.5px solid ${INK}`,
              borderRadius: '14px',
              boxShadow: `8px 10px 0 ${INK}`,
              padding: '24px',
              width: '100%',
              maxWidth: '360px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: INK, fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px', fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif" }}>
              Move File
            </h3>
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleMove(movingFileId, null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(26,23,48,0.05)',
                  border: `1.5px solid rgba(26,23,48,0.15)`,
                  borderRadius: '10px',
                  color: INK,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                  fontWeight: 600,
                }}
              >
                <Folder size={20} color={`rgba(26,23,48,0.5)`} /> Root Directory
              </button>
              {allFolders.filter(f => f.id !== movingFileId).map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleMove(movingFileId, folder.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(26,23,48,0.05)',
                    border: `1.5px solid rgba(26,23,48,0.15)`,
                    borderRadius: '10px',
                    color: INK,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  <Folder size={20} color={HL_ORANGE} /> {folder.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMovingFileId(null)}
              style={{
                width: '100%',
                padding: '11px',
                background: 'rgba(26,23,48,0.06)',
                border: `1.5px solid ${INK}`,
                borderRadius: '10px',
                color: INK,
                marginTop: '14px',
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
      />

      {/* FAB + menu */}
      <div style={{ position: 'fixed', bottom: '100px', right: '20px', zIndex: 100 }}>
        {isPlusMenuOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '68px',
              right: 0,
              background: CARD_BG,
              border: `1.5px solid ${INK}`,
              borderRadius: '12px',
              boxShadow: `6px 7px 0 ${INK}`,
              padding: '6px',
              minWidth: '160px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setIsPlusMenuOpen(false); fileInputRef.current?.click(); }}
              style={{ ...menuBtnStyle, gap: '10px', padding: '10px 12px' }}
            >
              <Plus size={17} color={INK} /> Upload File
            </button>
            <button
              onClick={() => { setIsPlusMenuOpen(false); setIsCreatingFolder(true); }}
              style={{ ...menuBtnStyle, gap: '10px', padding: '10px 12px' }}
            >
              <FolderPlus size={17} color={HL_ORANGE} /> New Folder
            </button>
            <button
              onClick={() => { setIsPlusMenuOpen(false); setNoteName(''); setNoteContent(''); setActiveNoteId(null); setIsEditingNote(true); }}
              style={{ ...menuBtnStyle, gap: '10px', padding: '10px 12px' }}
            >
              <FilePlus size={17} color={HL_BLUE} /> New Note
            </button>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setIsPlusMenuOpen(!isPlusMenuOpen); }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: INK,
            color: '#fff',
            border: `1.5px solid ${INK}`,
            boxShadow: `4px 4px 0 ${HL_YELLOW}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={24} style={{ transition: 'transform 0.3s', transform: isPlusMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)' }} />
        </button>
      </div>

      {/* Note editor */}
      {isEditingNote && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ background: 'rgba(26,23,48,0.6)' }}
          onClick={() => setIsEditingNote(false)}
        >
          <div
            className="w-full h-full md:w-[80%] md:h-[80%] max-w-4xl overflow-hidden flex flex-col md:rounded-2xl"
            style={{
              background: CARD_BG,
              border: `1.5px solid ${INK}`,
              boxShadow: `8px 10px 0 ${INK}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Note header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: `1.5px solid rgba(26,23,48,0.12)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: `${HL_YELLOW}44`,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: `${HL_YELLOW}`,
                  border: `1.5px solid ${INK}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <FileText size={16} color={INK} />
                </div>
                <input
                  value={noteName}
                  onChange={e => setNoteName(e.target.value)}
                  placeholder="Note Title..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: INK,
                    fontWeight: 800,
                    fontSize: '1rem',
                    outline: 'none',
                    flex: 1,
                    fontFamily: "'Bricolage Grotesque', 'Inter', sans-serif",
                  }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleSaveNote}
                  style={{
                    background: INK,
                    color: '#fff',
                    border: `1.5px solid ${INK}`,
                    borderRadius: '10px',
                    boxShadow: `3px 3px 0 ${HL_YELLOW}`,
                    padding: '8px 14px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                  }}
                >
                  <Save size={16} /> <span className="hidden xs:inline">Save</span>
                </button>
                <button
                  onClick={() => { setIsEditingNote(false); setActiveNoteId(null); setNoteName(''); setNoteContent(''); }}
                  style={{
                    background: 'rgba(26,23,48,0.06)',
                    border: `1.5px solid ${INK}`,
                    borderRadius: '8px',
                    color: INK,
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Text area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Start typing your note here..."
                style={{
                  flex: 1,
                  width: '100%',
                  padding: '20px 24px',
                  background: 'transparent',
                  color: INK,
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  resize: 'none',
                  outline: 'none',
                  border: 'none',
                  fontFamily: "'Instrument Sans', 'Inter', sans-serif",
                  fontWeight: 500,
                  boxSizing: 'border-box',
                }}
                spellCheck={false}
              />
              <div style={{
                padding: '8px 24px',
                borderTop: `1.5px solid rgba(26,23,48,0.1)`,
                background: 'rgba(26,23,48,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 700,
                color: `rgba(26,23,48,0.4)`,
                fontFamily: "'Instrument Sans', 'Inter', sans-serif",
              }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span>{noteContent.length} chars</span>
                  <span>{noteContent.trim() ? noteContent.trim().split(/\s+/).length : 0} words</span>
                </div>
                <span>Text File (.txt)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File viewer */}
      {viewingFile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="w-full h-full max-w-6xl overflow-hidden flex flex-col" style={{ background: '#0a0a0c' }}>
            {/* Viewer header */}
            <div style={{
              padding: '10px 16px',
              borderBottom: `1px solid rgba(255,255,255,0.08)`,
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {getIcon(viewingFile.type)}
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }} title={viewingFile.name}>
                    {viewingFile.name}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', margin: 0 }}>
                    {viewingFile.size} • {viewingFile.type.toUpperCase()}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {viewingFile.fileData && (
                  <button
                    onClick={() => handleDownload(viewingFile)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                    }}
                    title="Download"
                  >
                    <Download size={17} />
                  </button>
                )}
                <button
                  onClick={() => { setViewingFile(null); onFileViewChange?.(false); }}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                  title="Close"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Viewer content */}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center" style={{ background: '#000' }}>
              {viewingFile.fileData ? (
                viewingFile.type === 'image' ? (
                  <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit wheel={{ step: 0.1 }}>
                    <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                      <img src={viewingFile.fileData} alt={viewingFile.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    </TransformComponent>
                  </TransformWrapper>
                ) : viewingFile.type === 'pdf' ? (
                  <PdfViewer file={viewingFile.fileData} />
                ) : viewingFile.type === 'excel' ? (
                  <ExcelViewer data={viewingFile.fileData} />
                ) : viewingFile.type === 'powerpoint' || viewingFile.type === 'word' ? (
                  <div style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '72px', height: '72px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getIcon(viewingFile.type)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#fff', fontWeight: 700, marginBottom: '6px' }}>Preview not available</p>
                      <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                        Direct preview for {viewingFile.type === 'powerpoint' ? 'PowerPoint' : 'Word'} files is not supported in browser.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(viewingFile)}
                      style={{
                        background: HL_GREEN,
                        border: `1.5px solid ${INK}`,
                        borderRadius: '10px',
                        color: INK,
                        padding: '10px 20px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        boxShadow: `3px 3px 0 ${INK}`,
                      }}
                    >
                      <Download size={17} /> Download to View
                    </button>
                  </div>
                ) : (
                  <iframe src={viewingFile.fileData} className="w-full h-full rounded-lg bg-white shadow-2xl border-0" title={viewingFile.name} />
                )
              ) : viewingFile.webViewLink ? (
                <iframe src={viewingFile.webViewLink} className="w-full h-full rounded-lg bg-white shadow-2xl" title={viewingFile.name} />
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <File size={48} style={{ opacity: 0.5 }} color="#fff" />
                  <p>Preview not available for this file type.</p>
                  {viewingFile.fileData && (
                    <button onClick={() => handleDownload(viewingFile)} style={{ color: HL_BLUE, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Download File
                    </button>
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
