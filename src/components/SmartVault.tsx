import {
  Download, File, Image as ImageIcon, FileText, Upload,
  Plus, X, Lock, Trash2, Presentation, Loader2, AlertCircle, Folder, FolderPlus, ArrowLeft, Filter
} from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketProvider';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';

import { tgUploadFile, tgGetFileUrl, tgDeleteMessage } from '../lib/telegram';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VaultFile {
  id: string;
  content: string;           // display name
  fileUrl?: string;
  storagePath?: string;
  telegram_file_id?: string;
  telegram_msg_id?: number;
  type: string;
  timestamp?: string;
  created_at?: string;       // Add this for DB compatibility
  file_url?: string;
  folder_id?: string | null;
  file_size?: number;
  is_chat_file?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFileType(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
  if (ext === 'pdf')                                          return 'pdf';
  if (['doc','docx'].includes(ext))                          return 'doc';
  if (['ppt','pptx'].includes(ext))                          return 'ppt';
  if (['xls','xlsx','csv'].includes(ext))                    return 'sheet';
  if (['mp4','webm','mov'].includes(ext))                    return 'video';
  return 'other';
}

function FileIcon({ name, size = 24, isFolder = false }: { name: string; size?: number; isFolder?: boolean }) {
  if (isFolder) return <Folder size={size} className="text-aura-primary fill-aura-primary/20" />;
  const type = getFileType(name);
  if (type === 'image')  return <ImageIcon      size={size} className="text-pink-400" />;
  if (type === 'pdf')    return <FileText        size={size} className="text-red-400" />;
  if (type === 'doc')    return <FileText        size={size} className="text-blue-400" />;
  if (type === 'ppt')    return <Presentation   size={size} className="text-orange-400" />;
  if (type === 'sheet')  return <FileText        size={size} className="text-green-400" />;
  if (type === 'video')  return <File            size={size} className="text-purple-400" />;
  return <File size={size} className="text-aura-lavender/60" />;
}

function formatBytes(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SmartVault({
  connectionId,
  messages,
  partner,
  isPersonal = false,
}: {
  connectionId: string;
  messages: VaultFile[];
  partner: any;
  isPersonal?: boolean;
}) {
  const { socket }     = useSocket();
  const { user }       = useAuthStore();
  const fileInputRef   = useRef<HTMLInputElement>(null);

  const [previewFile,   setPreviewFile]   = useState<VaultFile | null>(null);
  const [vaultItems,    setVaultItems]    = useState<VaultFile[]>([]);
  const [resolvedUrls,  setResolvedUrls]  = useState<Record<string, string>>({});
  
  // Navigation & Filtering
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'image', 'doc', 'video', 'pdf'
  
  // Upload State
  const [uploading,     setUploading]     = useState(false);
  const [uploadProgress,setUploadProgress]= useState(0);
  const [uploadError,   setUploadError]   = useState('');
  
  // Folder Creation State
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  
  const [deletingId,    setDeletingId]    = useState<string | null>(null);

  // ── Build display list ────────────────────────────────────────────────────
  const rawFiles: VaultFile[] = [
    ...vaultItems.map(item => ({
      id:                item.id,
      content:           item.content || (item as any).name,
      fileUrl:           '',
      telegram_file_id:  item.telegram_file_id,
      telegram_msg_id:   item.telegram_msg_id,
      file_size:         item.file_size,
      type:              item.type || 'file',
      timestamp:         item.created_at || (item as any).timestamp,
      folder_id:         item.folder_id,
      is_chat_file:      item.is_chat_file
    })),
    // Local messages that might not be in DB yet
    ...messages.filter(m => m.type === 'file' && !vaultItems.find(v => v.telegram_file_id === m.telegram_file_id)).map(m => ({
      id:                m.id || `local-${Date.now()}`,
      content:           m.content,
      fileUrl:           m.fileUrl || m.file_url || '',
      telegram_file_id:  m.telegram_file_id,
      telegram_msg_id:   m.telegram_msg_id,
      file_size:         null,
      type:              'file',
      timestamp:         m.timestamp,
      folder_id:         null,
      is_chat_file:      true
    }))
  ];

  // Apply filters and folder navigation
  let displayFiles = rawFiles;
  
  if (filterType !== 'all') {
    // When filtering by type, show a flat view (ignore folders)
    displayFiles = displayFiles.filter(f => f.type !== 'folder' && getFileType(f.content) === filterType);
  } else {
    // Normal folder view
    displayFiles = displayFiles.filter(f => f.folder_id === currentFolderId || (!f.folder_id && currentFolderId === null));
  }

  // Sort folders first, then files by newest
  displayFiles.sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  const currentFolderName = rawFiles.find(f => f.id === currentFolderId)?.content || 'Vault';

  // ── Fetch personal vault from Supabase (metadata + chat files) ────────────
  const fetchPersonalVault = useCallback(async () => {
    if (!user?.id) return;
    
    const [vaultRes, msgRes] = await Promise.all([
      supabase.from('vault_items').select('*').eq('user_id', user.id),
      supabase.from('messages').select('*').eq('type', 'file').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    ]);

    const vaultData = vaultRes.data || [];
    const msgData = msgRes.data || [];

    const msgItems = msgData.map(m => ({
      id: m.id,
      content: m.content,
      name: m.content,
      telegram_file_id: m.telegram_file_id,
      telegram_msg_id: m.telegram_msg_id,
      created_at: m.created_at,
      file_size: null,
      is_chat_file: true,
      sender_id: m.sender_id,
      type: 'file',
      folder_id: null
    }));

    const combined = [...vaultData, ...msgItems].sort((a, b) => {
      const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
      const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    const unique = [];
    const seen = new Set();
    for (const item of combined) {
      const key = item.telegram_file_id || item.id;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    setVaultItems(unique);
  }, [user?.id]);

  useEffect(() => {
    fetchPersonalVault();
  }, [fetchPersonalVault]);

  // ── Resolve Telegram download URLs ──────────────────────────────────────────
  useEffect(() => {
    const resolveUrls = async () => {
      const updates: Record<string, string> = {};
      for (const f of displayFiles) {
        if (f.type === 'folder') continue; // folders don't have URLs
        if (resolvedUrls[f.id]) continue;
        try {
          if (f.telegram_file_id) {
            const url = await tgGetFileUrl(f.telegram_file_id);
            updates[f.id] = url;
          } else if (f.file_url || f.fileUrl) {
            updates[f.id] = f.file_url || f.fileUrl || '';
          }
        } catch (err) { 
          console.error(`Failed to resolve URL for ${f.id}:`, err);
        }
      }
      if (Object.keys(updates).length > 0)
        setResolvedUrls(prev => ({ ...prev, ...updates }));
    };
    resolveUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayFiles.length]);

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploadError('');
    setUploading(true);
    setUploadProgress(10);

    try {
      setUploadProgress(30);
      const { file_id, message_id } = await tgUploadFile(file);
      setUploadProgress(80);

      if (isPersonal) {
        const { error: dbError } = await supabase.from('vault_items').insert([{
          user_id:            user.id,
          name:               file.name,
          content:            file.name,
          type:               'file',
          telegram_file_id:   file_id,
          telegram_msg_id:    message_id,
          file_size:          file.size,
          folder_id:          currentFolderId,
        }]);
        if (dbError) throw new Error(`Metadata save failed: ${dbError.message}`);
        await fetchPersonalVault();

      } else if (partner) {
        const fileUrl = await tgGetFileUrl(file_id);
        await supabase.from('messages').insert([{
          sender_id:          user.id,
          receiver_id:        partner.id,
          content:            file.name,
          type:               'file',
          file_url:           fileUrl,
          telegram_file_id:   file_id,
          telegram_msg_id:    message_id,
        }]);
      }

      setUploadProgress(100);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Upload failed. Check your Telegram Bot config.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Create Folder handler ─────────────────────────────────────────────────
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user?.id) return;
    setCreatingFolder(true);
    try {
      await supabase.from('vault_items').insert([{
        user_id: user.id,
        name: newFolderName.trim(),
        content: newFolderName.trim(),
        type: 'folder',
        folder_id: currentFolderId,
      }]);
      setNewFolderName('');
      setShowFolderModal(false);
      await fetchPersonalVault();
    } catch (err) {
      console.error('Folder creation failed:', err);
    } finally {
      setCreatingFolder(false);
    }
  };

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (item: VaultFile) => {
    const isFolder = item.type === 'folder';
    if (!confirm(`Delete ${isFolder ? 'folder' : 'file'} "${item.content}"${isFolder ? ' and all its contents' : ''}?`)) return;
    setDeletingId(item.id);
    try {
      if (item.telegram_msg_id) await tgDeleteMessage(item.telegram_msg_id);
      
      if (item.is_chat_file) {
        await supabase.from('messages').delete().eq('id', item.id);
      } else if (item.id) {
        await supabase.from('vault_items').delete().eq('id', item.id);
      }
      
      setResolvedUrls(prev => { const n = { ...prev }; delete n[item.id]; return n; });
      await fetchPersonalVault();
    } catch (err: any) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getUrl = (f: VaultFile) =>
    resolvedUrls[f.id] || f.fileUrl || f.file_url || '';

  // ── Preview renderer ──────────────────────────────────────────────────────
  const renderPreview = () => {
    if (!previewFile) return null;
    const url  = getUrl(previewFile);
    const type = getFileType(previewFile.content ?? '');

    if (!url) return (
      <div className="flex flex-col items-center gap-3 p-12 text-aura-lavender/50 text-sm">
        <Loader2 size={32} className="animate-spin text-aura-primary" />
        <p>Loading preview…</p>
      </div>
    );

    if (type === 'image') return (
      <img
        src={url}
        alt={previewFile.content}
        className="max-w-full max-h-[70vh] rounded-xl shadow-2xl object-contain"
      />
    );

    if (type === 'video') return (
      <video src={url} controls className="max-w-full max-h-[70vh] rounded-xl shadow-xl" />
    );

    if (['pdf','doc','ppt','sheet'].includes(type)) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-[70vh] rounded-xl border border-aura-border bg-white"
          title="Document Preview"
        />
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-10 text-center gap-4">
        <FileIcon name={previewFile.content ?? ''} size={48} />
        <p className="text-white font-semibold">{previewFile.content}</p>
        <p className="text-aura-lavender/50 text-sm">Preview not available for this file type.</p>
        <a
          href={url}
          download={previewFile.content}
          className="flex items-center gap-2 bg-aura-primary text-white px-6 py-2.5 rounded-xl font-medium hover:opacity-90 active:scale-95 transition-all"
        >
          <Download size={18} /> Download
        </a>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-aura-navy overflow-hidden w-full relative">

      {/* ── Header & Navigation ──────────────────────────────────────────── */}
      <div className="p-4 border-b border-aura-border bg-aura-panel/30 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentFolderId && filterType === 'all' && (
              <button 
                onClick={() => setCurrentFolderId(null)}
                className="p-1.5 hover:bg-aura-border text-aura-lavender hover:text-white rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
                {isPersonal && <Lock size={15} className="text-aura-primary" />}
                {filterType !== 'all' ? `Filtered by ${filterType}` : currentFolderName}
              </h3>
              <p className="text-xs text-aura-lavender/50">{displayFiles.length} items</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPersonal && filterType === 'all' && (
              <button
                onClick={() => setShowFolderModal(true)}
                className="bg-aura-panel hover:bg-aura-border text-aura-lavender hover:text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all active:scale-95 border border-aura-border"
              >
                <FolderPlus size={16} /> <span className="hidden sm:inline">New Folder</span>
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || filterType !== 'all'}
              className="bg-aura-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-aura-primary/20 disabled:opacity-60"
            >
              {uploading
                ? <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                : <><Plus size={16} /> Upload</>}
            </button>
            <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" accept="*" />
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={14} className="text-aura-lavender/50 mr-1 shrink-0" />
          {['all', 'image', 'video', 'pdf', 'doc'].map(ft => (
            <button
              key={ft}
              onClick={() => { setFilterType(ft); setCurrentFolderId(null); }}
              className={`px-3 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap transition-all border ${
                filterType === ft 
                  ? 'bg-aura-primary/20 border-aura-primary text-aura-primary' 
                  : 'bg-aura-panel/50 border-aura-border text-aura-lavender hover:text-white hover:border-aura-primary/50'
              }`}
            >
              {ft}
            </button>
          ))}
        </div>
      </div>

      {/* ── Upload progress bar ──────────────────────────────────────────── */}
      {uploading && uploadProgress > 0 && (
        <div className="h-1 bg-aura-border shrink-0">
          <div
            className="h-full bg-aura-primary transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {uploadError && (
        <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs leading-relaxed flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError('')} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── File Grid ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {displayFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-aura-lavender/50 gap-3">
            <div className="w-16 h-16 bg-aura-panel rounded-full flex items-center justify-center border border-aura-border">
              <Upload size={28} className="text-aura-primary opacity-60" />
            </div>
            <p className="font-semibold text-white">
              {filterType !== 'all' ? `No ${filterType}s found` : 'Vault is empty'}
            </p>
            <p className="text-sm max-w-xs">
              {filterType !== 'all' ? 'Try changing the filter.' : 'Upload any file — images, PDFs, videos, ZIPs, and more. No size limits.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayFiles.map((f, i) => {
              const isFolder = f.type === 'folder';
              const url  = isFolder ? '' : getUrl(f);
              const type = getFileType(f.content ?? '');
              const isDeleting = deletingId === f.id;

              return (
                <div
                  key={f.id || i}
                  className="bg-aura-panel/50 border border-aura-border rounded-2xl p-3.5 flex flex-col gap-3 hover:border-aura-primary/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-11 h-11 rounded-xl bg-aura-navy flex items-center justify-center shrink-0 border border-aura-border group-hover:border-aura-primary/30 transition-all cursor-pointer"
                      onClick={() => isFolder ? setCurrentFolderId(f.id) : setPreviewFile(f)}
                    >
                      <FileIcon name={f.content ?? ''} size={22} isFolder={isFolder} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p 
                        className="text-sm text-white font-semibold truncate cursor-pointer hover:text-aura-primary transition-colors" 
                        title={f.content}
                        onClick={() => isFolder ? setCurrentFolderId(f.id) : setPreviewFile(f)}
                      >
                        {f.content}
                      </p>
                      <p className="text-[10px] text-aura-lavender/40 uppercase tracking-widest mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {isFolder ? 'Folder' : (f.file_size ? formatBytes(f.file_size) + ' · ' : '')}
                        {f.timestamp ? new Date(f.timestamp).toLocaleDateString() : 'Just now'}
                        {f.is_chat_file && (
                          <span className="bg-aura-primary/20 text-aura-primary px-1.5 py-0.5 rounded-sm lowercase text-[8px] font-bold">from chat</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFolder ? (
                      <button
                        onClick={() => setCurrentFolderId(f.id)}
                        className="flex-1 py-2 bg-aura-navy hover:bg-aura-border text-aura-lavender hover:text-white text-xs font-bold rounded-xl border border-aura-border active:scale-95 transition-all"
                      >
                        Open Folder
                      </button>
                    ) : (
                      <button
                        onClick={() => setPreviewFile(f)}
                        className="flex-1 py-2 bg-aura-navy hover:bg-aura-border text-aura-lavender hover:text-white text-xs font-bold rounded-xl border border-aura-border active:scale-95 transition-all"
                      >
                        {['image','pdf','doc','ppt','sheet','video'].includes(type) ? 'Preview' : 'Open'}
                      </button>
                    )}

                    {!isFolder && url && (
                      <a
                        href={url}
                        download={f.content}
                        className="p-2 bg-aura-primary/10 hover:bg-aura-primary text-aura-primary hover:text-white rounded-xl border border-aura-primary/20 active:scale-90 transition-all"
                        title="Download"
                      >
                        <Download size={16} />
                      </a>
                    )}

                    {isPersonal && (
                      <button
                        onClick={() => handleDelete(f)}
                        disabled={isDeleting}
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl border border-red-500/20 active:scale-90 transition-all disabled:opacity-50"
                        title="Delete"
                      >
                        {isDeleting
                          ? <Loader2 size={16} className="animate-spin" />
                          : <Trash2   size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Folder Modal ──────────────────────────────────────────── */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-aura-panel border border-aura-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-aura-border flex items-center justify-between bg-aura-navy/50">
              <h3 className="text-white font-semibold flex items-center gap-2"><FolderPlus size={18} className="text-aura-primary"/> New Folder</h3>
              <button onClick={() => setShowFolderModal(false)} className="text-aura-lavender hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <input
                type="text"
                autoFocus
                placeholder="Folder Name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                className="w-full bg-aura-navy border border-aura-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-aura-primary transition-all"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || creatingFolder}
                className="w-full bg-aura-primary text-white font-semibold py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {creatingFolder ? <Loader2 size={18} className="animate-spin" /> : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ────────────────────────────────────────────────── */}
      {previewFile && (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <p className="text-white font-semibold truncate text-sm">{previewFile.content}</p>
            <div className="flex items-center gap-2">
              {getUrl(previewFile) && (
                <a
                  href={getUrl(previewFile)}
                  download={previewFile.content}
                  className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/15 rounded-full transition-all"
                  title="Download"
                >
                  <Download size={20} />
                </a>
              )}
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/20 rounded-full transition-all"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
            {renderPreview()}
          </div>
        </div>
      )}
    </div>
  );
}
