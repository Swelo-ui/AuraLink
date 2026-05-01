import { Download, File, Image as ImageIcon, FileText, Upload, Plus, X, Lock } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useSocket } from './SocketProvider';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';

export default function SmartVault({ connectionId, messages, partner, isPersonal = false }: { connectionId: string, messages: any[], partner: any, isPersonal?: boolean }) {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isPersonal) {
      fetchPersonalVault();
    }
  }, [isPersonal, user?.id]);

  const fetchPersonalVault = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('vault_items').select('*').eq('user_id', user.id);
    if (data) setVaultItems(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const safeName = file.name.replace(/[^\w.\-]/g, '_');
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = `vault/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
      if (uploadError) throw uploadError;

      if (isPersonal) {
        // Store storage path (not public URL) for private/internal access.
        await supabase.from('vault_items').insert([{
          user_id: user.id,
          name: file.name,
          content: filePath,
          type: 'file'
        }]);
        fetchPersonalVault();
      } else if (partner) {
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
        // Send as message in shared vault
        await supabase.from('messages').insert([{
          sender_id: user.id,
          receiver_id: partner.id,
          content: file.name,
          type: 'file',
          file_url: publicUrl
        }]);
      }
    } catch (err) {
      console.error(err);
      alert('File upload failed. Please try again (or check storage bucket/policies).');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isHttpUrl = (value: string) => value.startsWith('http://') || value.startsWith('https://');

  const displayFiles = isPersonal 
    ? vaultItems.map(item => ({
        id: item.id,
        content: item.name,
        fileUrl: isHttpUrl(item.content || '') ? item.content : '',
        storagePath: isHttpUrl(item.content || '') ? '' : (item.content || ''),
        type: 'file',
        timestamp: item.created_at
      }))
    : messages.filter(m => m.type === 'file');

  useEffect(() => {
    const resolvePersonalUrls = async () => {
      if (!isPersonal) return;
      const updates: Record<string, string> = {};

      for (const f of displayFiles) {
        if (f.fileUrl) {
          updates[f.id] = f.fileUrl;
          continue;
        }
        if (f.storagePath) {
          const { data, error } = await supabase.storage.from('uploads').createSignedUrl(f.storagePath, 3600);
          if (!error && data?.signedUrl) {
            updates[f.id] = data.signedUrl;
          }
        }
      }

      setResolvedUrls(prev => ({ ...prev, ...updates }));
    };
    resolvePersonalUrls();
  }, [isPersonal, vaultItems.length]);

  const getFileIcon = (url: string) => {
    if (url.match(/\.(jpeg|jpg|gif|png)$/i)) return <ImageIcon size={24} className="text-pink-400" />;
    if (url.match(/\.(pdf)$/i)) return <FileText size={24} className="text-red-400" />;
    if (url.match(/\.(doc|docx)$/i)) return <FileText size={24} className="text-blue-500" />;
    return <File size={24} className="text-aura-lavender/40" />;
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;
    const url = previewFile.fileUrl || resolvedUrls[previewFile.id] || '';
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-aura-navy rounded-2xl border border-aura-border">
          <p className="text-aura-lavender/60 text-sm">Preparing secure preview URL...</p>
        </div>
      );
    }
    if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
      return <img src={url} alt="Preview" className="max-w-full max-h-[70vh] rounded-lg shadow-xl" />;
    }
    if (url.match(/\.(pdf)$/i)) {
      return <iframe src={url} className="w-full h-[70vh] rounded-lg border border-aura-border" title="PDF Preview" />;
    }
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-aura-navy rounded-2xl border border-aura-border">
        <div className="w-20 h-20 bg-aura-panel rounded-full flex items-center justify-center mb-6 border border-aura-border">
          {getFileIcon(url)}
        </div>
        <h3 className="text-white font-bold text-lg mb-2">{previewFile.content}</h3>
        <p className="text-aura-lavender/50 text-sm mb-6 max-w-xs">This file type cannot be previewed in the browser. Please download it to view the content.</p>
        <a href={url} download className="bg-aura-primary hover:opacity-90 text-white px-6 py-2.5 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2">
          <Download size={18} /> Download Now
        </a>
      </div>
    );
  };

  const isPreviewable = (file: any, resolvedUrl?: string) => {
    const url = (resolvedUrl || file.fileUrl || '').toLowerCase();
    const name = (file.content || '').toLowerCase();
    const extensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    return extensions.some(ext => url.endsWith(ext) || name.endsWith(ext));
  };

  return (
    <div className="flex flex-col h-full bg-aura-navy overflow-hidden w-full relative">
      <div className="p-6 border-b border-aura-border bg-aura-panel/30 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            {isPersonal ? <Lock size={18} className="text-aura-primary" /> : null}
            {isPersonal ? 'My Personal Vault' : 'Shared Vault'}
          </h3>
          <p className="text-xs text-aura-lavender/50">{displayFiles.length} items</p>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-aura-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-aura-primary/20"
        >
          <Plus size={18} /> {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-aura-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayFiles.length === 0 ? (
            <div className="col-span-full text-center py-20 text-aura-lavender/50">
               <div className="w-16 h-16 bg-aura-panel rounded-full flex items-center justify-center mx-auto mb-4 border border-aura-border shadow-inner">
                 <Upload className="opacity-50 text-aura-primary" size={32} />
               </div>
               <p className="font-medium text-white mb-1">Vault is empty</p>
               <p className="text-sm max-w-xs mx-auto">Upload files to keep them secure {isPersonal ? 'for yourself' : 'and shared with your connection'}.</p>
            </div>
          ) : (
            displayFiles.map((f, i) => {
              const resolvedUrl = resolvedUrls[f.id] || f.fileUrl || '';
              const canPreview = isPreviewable(f, resolvedUrl);
              return (
                <div key={f.id || i} className="bg-aura-panel/40 backdrop-blur-sm border border-aura-border rounded-2xl p-4 flex flex-col group hover:border-aura-primary/50 hover:bg-aura-panel/60 hover:shadow-xl hover:shadow-aura-primary/5 transition-all duration-300 relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-aura-navy flex items-center justify-center shrink-0 border border-aura-border group-hover:border-aura-primary/30 transition-all duration-300 group-hover:scale-105">
                      {getFileIcon(resolvedUrl || f.content || '')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-semibold truncate" title={f.content}>{f.content}</p>
                      <p className="text-[10px] text-aura-lavender/40 uppercase tracking-widest font-medium mt-0.5">{f.timestamp ? new Date(f.timestamp).toLocaleDateString() : 'Just now'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-auto">
                     <button 
                      onClick={() => setPreviewFile({ ...f, fileUrl: resolvedUrl })}
                      disabled={!resolvedUrl}
                      className="flex-1 py-2.5 bg-aura-navy hover:bg-aura-border text-aura-lavender hover:text-white text-xs font-bold rounded-xl text-center transition-all duration-200 border border-aura-border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       {canPreview ? 'Preview' : 'Open'}
                     </button>
                     <a href={resolvedUrl || '#'} download className="p-2.5 bg-aura-primary/10 hover:bg-aura-primary text-aura-primary hover:text-white rounded-xl transition-all duration-200 border border-aura-primary/20 active:scale-90">
                       <Download size={18} />
                     </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-5xl flex flex-col items-center bg-aura-navy/50 rounded-3xl p-2 border border-white/5 shadow-2xl">
            <button 
              onClick={() => setPreviewFile(null)}
              className="absolute -top-12 right-0 md:-right-12 p-3 text-white/70 hover:text-white transition-all bg-white/5 hover:bg-white/20 rounded-full active:scale-90"
            >
              <X size={28} />
            </button>
            <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-2xl">
              {renderPreviewContent()}
            </div>
            <div className="mt-4 px-6 py-2 bg-white/5 rounded-full backdrop-blur-sm border border-white/10">
              <p className="text-white text-sm font-medium">{previewFile.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
