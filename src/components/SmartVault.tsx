import { Download, File, Image as ImageIcon, FileText } from 'lucide-react';

export default function SmartVault({ connectionId, messages }: { connectionId: string, messages: any[] }) {
  const files = messages.filter(m => m.type === 'file');

  const getFileIcon = (url: string) => {
    if (url.match(/\\.(jpeg|jpg|gif|png)\$/i)) return <ImageIcon size={24} className="text-blue-400" />;
    if (url.match(/\\.(pdf)\$/i)) return <FileText size={24} className="text-red-400" />;
    if (url.match(/\\.(doc|docx)\$/i)) return <FileText size={24} className="text-blue-500" />;
    return <File size={24} className="text-neutral-400" />;
  };

  return (
    <div className="flex flex-col h-full bg-aura-navy p-6 overflow-y-auto w-full">
      <div className="grid grid-cols-2 gap-4">
        {files.length === 0 ? (
          <div className="col-span-2 text-center py-20 text-aura-lavender/50">
             <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
             <p>No files shared yet in this sync.</p>
             <p className="text-sm mt-2">Any file you or your partner uploads will permanently appear here.</p>
          </div>
        ) : (
          files.map((f, i) => (
            <div key={i} className="bg-aura-panel border border-aura-border rounded-xl p-4 flex flex-col items-center justify-center text-center group hover:border-aura-primary transition-colors relative">
              <div className="w-12 h-12 rounded-full bg-aura-navy flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                {getFileIcon(f.fileUrl)}
              </div>
              <p className="text-sm text-white font-medium truncate w-full px-2" title={f.content}>{f.content}</p>
              <p className="text-xs text-aura-lavender/50 mt-1">{new Date(f.timestamp).toLocaleDateString()}</p>
              
              <div className="absolute inset-0 bg-aura-navy/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                 <a href={f.fileUrl} target="_blank" rel="noreferrer" className="p-2 bg-aura-panel rounded-full hover:bg-aura-border text-white transition-colors" title="Preview / Open">
                   <FileText size={16} />
                 </a>
                 <a href={f.fileUrl} download className="p-2 bg-aura-primary rounded-full hover:bg-aura-primary-hover text-white transition-colors" title="Download">
                   <Download size={16} />
                 </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
