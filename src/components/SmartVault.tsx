import { Download, File, Image as ImageIcon, FileText, Upload, Plus, X, Lock, Trash2, ExternalLink, Presentation } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useSocket } from './SocketProvider';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';

const BUCKET = 'uploads';

function getFileType(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  return 'other';
}

function FileIcon({ name, size = 24 }: { name: string; size?: number }) {
  const type = getFileType(name);
  if (type === 'image') return <ImageIcon size={size} className="text-pink-400" />;
  if (type === 'pdf') return <FileText size={size} className="text-red-400" />;
  if (type === 'doc') return <FileText size={size} className="text-blue-400" />;
  if (type === 'ppt') return <Presentation size={size} className="text-orange-400" />;
  if (type === 'sheet') return <FileText size={size} className="text-green-400" />;
  if (type === 'video') return <File size={size} className="text-purple-400" />;
  return <File size={size} className="text-aura-lavender/60" />;
}

export default function SmartVault({ connectionId, messages, partner, isPersonal = false }: {
  connectionId: string;
  messages: any[];
  partner: any;
  isPersonal?: boolean;
}) {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (isPersonal) fetchPersonalVault();
  }, [isPersonal, user?.id]);

  const fetchPersonalVault = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('vault_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setVaultItems(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploadError('');
    setUploading(true);

    try {
      const ext = file.name.split('.').pop();
      const safeName = file.name.replace(/[^\w.\-]/g, '_');
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = `vault/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setUploadError(`Upload failed: ${uploadError.message}. Check Supabase Storage bucket "${BUCKET}" exists with public read policy.`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

      if (isPersonal) {
        const { error: dbError } = await supabase.from('vault_items').insert([{
          user_id: user.id,
          name: file.name,
          content: filePath,
          type: 'file',
        }]);
        if (dbError) console.error('DB insert error:', dbError);
        fetchPersonalVault();
      } else if (partner) {
        await supabase.from('messages').insert([{
          sender_id: user.id,
          receiver_id: partner.id,
          content: file.name,
          type: 'file',
          file_url: publicUrl,
        }]);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(`Unexpected error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete "${item.content}"?`)) return;
    // Delete from storage
    if (item.storagePath) {
      await supabase.storage.from(BUCKET).remove([item.storagePath]);
    }
    // Delete from DB
    if (item.id) {
      await supabase.from('vault_items').delete().eq('id', item.id);
    }
    fetchPersonalVault();
  };

  const displayFiles = isPersonal
    ? vaultItems.map(item => ({
        id: item.id,
        content: item.name,
        fileUrl: '',
        storagePath: item.content || '',
        type: 'file',
        timestamp: item.created_at,
      }))
    : messages.filter(m => m.type === 'file');

  useEffect(() => {
    const resolveUrls = async () => {
      if (!isPersonal) return;
      const updates: Record<string, string> = {};
      for (const f of displayFiles) {
        if (resolvedUrls[f.id]) continue;
        if (f.storagePath) {
          const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.storagePath, 7200);
          if (!error && data?.signedUrl) updates[f.id] = data.signedUrl;
        } else if (f.fileUrl) {
          updates[f.id] = f.fileUrl;
        }
      }
      if (Object.keys(updates).length > 0) {
        setResolvedUrls(prev => ({ ...prev, ...updates }));
      }
    };
    resolveUrls();
  }, [isPersonal, vaultItems.length]);

  const getUrl = (f: any) => resolvedUrls[f.id] || f.fileUrl || f.file_url || '';

  const renderPreview = () => {
    if (!previewFile) return null;
    const url = getUrl(previewFile);
    const type = getFileType(previewFile.content || '');

    if (!url) return (
      <div className="flex items-center justify-center p-12 text-aura-lavender/50 text-sm">
        Loading preview...
      </div>
    );

    if (type === 'image') return (
      <img src={url} alt="Preview" className="max-w-full max-h-[70vh] rounded-xl shadow-2xl object-contain" />
    );

    if (type === 'video') return (
      <video src={url} controls className="max-w-full max-h-[70vh] rounded-xl shadow-xl" />
    );

    // For PDF/doc/ppt/xls — use Google Docs Viewer (works reliably on mobile and without downloading)
    if (['pdf', 'doc', 'ppt', 'sheet'].includes(type)) {
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
        <FileIcon name={previewFile.content} size={48} />
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

  return (
    <div className="flex flex-col h-full bg-aura-navy overflow-hidden w-full">
      {/* Header */}
      <div className="p-4 border-b border-aura-border bg-aura-panel/30 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
            {isPersonal && <Lock size={15} className="text-aura-primary" />}
            {isPersonal ? 'My Personal Vault' : 'Shared Vault'}
          </h3>
          <p className="text-xs text-aura-lavender/50">{displayFiles.length} items</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-aura-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-aura-primary/20 disabled:opacity-60"
        >
          <Plus size={16} /> {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.mp4,.webm,.txt,.zip"
        />
      </div>

      {uploadError && (
        <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs leading-relaxed">
          ⚠️ {uploadError}
        </div>
      )}

      {/* File Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {displayFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-aura-lavender/50 gap-3">
            <div className="w-16 h-16 bg-aura-panel rounded-full flex items-center justify-center border border-aura-border">
              <Upload size={28} className="text-aura-primary opacity-60" />
            </div>
            <p className="font-semibold text-white">Vault is empty</p>
            <p className="text-sm max-w-xs">Upload images, PDFs, docs, PPTs, videos and more</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayFiles.map((f, i) => {
              const url = getUrl(f);
              const type = getFileType(f.content || '');
              return (
                <div key={f.id || i} className="bg-aura-panel/50 border border-aura-border rounded-2xl p-3.5 flex flex-col gap-3 hover:border-aura-primary/40 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-aura-navy flex items-center justify-center shrink-0 border border-aura-border group-hover:border-aura-primary/30 transition-all">
                      <FileIcon name={f.content} size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-semibold truncate" title={f.content}>{f.content}</p>
                      <p className="text-[10px] text-aura-lavender/40 uppercase tracking-widest mt-0.5">
                        {f.timestamp ? new Date(f.timestamp).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewFile(f)}
                      className="flex-1 py-2 bg-aura-navy hover:bg-aura-border text-aura-lavender hover:text-white text-xs font-bold rounded-xl border border-aura-border active:scale-95 transition-all"
                    >
                      {['image', 'pdf', 'doc', 'ppt', 'sheet', 'video'].includes(type) ? 'Preview' : 'Open'}
                    </button>
                    {url && (
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
                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl border border-red-500/20 active:scale-90 transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
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
