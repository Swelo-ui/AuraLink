import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useRef } from 'react';
import { useSocket } from './SocketProvider';
import clsx from 'clsx';
import { API_URL } from '../lib/utils';

export default function SyncNotes({ connectionId, partner }: { connectionId?: string, partner?: any }) {
  const { socket } = useSocket();
  const [syncedStatus, setSyncedStatus] = useState('Synced');
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Start writing your notes...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none max-w-none p-6 min-h-full'
      }
    },
    onUpdate: async ({ editor }) => {
      if (isUpdatingRef.current) return;
      
      setSyncedStatus('Saving...');
      const html = editor.getHTML();
      if (connectionId && socket) {
        socket.emit('note_update', { connectionId, content: html });
      } else {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ connectionId: connectionId || undefined, content: html })
        });
      }
      
      setTimeout(() => setSyncedStatus('Synced'), 1000);
    }
  });

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = connectionId ? `${API_URL}/api/notes?connectionId=${connectionId}` : `${API_URL}/api/notes`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (editor && data.content) {
             isUpdatingRef.current = true;
             editor.commands.setContent(data.content);
             isUpdatingRef.current = false;
          }
        }
      } catch (err) {
        console.error('Failed to load note', err);
      }
    };
    if (editor) {
      fetchNote();
    }
  }, [connectionId, editor]);

  useEffect(() => {
    if (!socket || !editor || !connectionId) return;

    const handleNoteUpdate = (data: { content: string, by: string }) => {
      // Prevent echoing back
      if (partner && data.by !== partner.id) return;
      
      isUpdatingRef.current = true;
      const { from, to } = editor.state.selection;
      
      // Basic last-write-wins replacement (in production use Yjs for true CRDT)
      editor.commands.setContent(data.content, { emitUpdate: false });
      
      // Attempt to restore cursor roughly
      try {
        editor.commands.setTextSelection({ from, to });
      } catch (e) {}
      
      isUpdatingRef.current = false;
      if (partner?.username) {
        setSyncedStatus('Synced from ' + partner.username);
      } else {
        setSyncedStatus('Synced');
      }
    };

    socket.on('note_updated', handleNoteUpdate);
    return () => {
      socket.off('note_updated', handleNoteUpdate);
    };
  }, [socket, editor, partner, connectionId]);

  return (
    <div className="flex flex-col h-full bg-aura-navy overflow-hidden">
      <div className="h-12 bg-aura-panel border-b border-aura-border flex items-center px-2 sm:px-4 justify-between shrink-0 overflow-x-auto no-scrollbar">
         <div className="flex gap-1.5 sm:gap-2">
            <button onClick={() => editor?.chain().focus().toggleBold().run()} className={clsx("w-8 h-8 flex items-center justify-center rounded-lg transition-all", editor?.isActive('bold') ? "bg-aura-primary text-white" : "bg-aura-navy text-aura-lavender/50 hover:text-white border border-aura-border")}>
              <span className="font-bold text-sm">B</span>
            </button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={clsx("w-8 h-8 flex items-center justify-center rounded-lg transition-all", editor?.isActive('italic') ? "bg-aura-primary text-white" : "bg-aura-navy text-aura-lavender/50 hover:text-white border border-aura-border")}>
              <span className="italic text-sm">I</span>
            </button>
            <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={clsx("w-8 h-8 flex items-center justify-center rounded-lg transition-all", editor?.isActive('bulletList') ? "bg-aura-primary text-white" : "bg-aura-navy text-aura-lavender/50 hover:text-white border border-aura-border")}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <div className="w-px h-6 bg-aura-border self-center mx-0.5 sm:mx-1 shrink-0"></div>
            <button 
              onClick={() => {
                 if (confirm('Clear all notes?')) {
                    editor?.commands.setContent('');
                 }
              }} 
              className="px-3 h-8 text-[11px] font-bold text-red-400 bg-red-400/5 hover:bg-red-400/20 border border-red-400/20 rounded-lg transition-all"
            >
              CLEAR
            </button>
         </div>
         <div className="hidden xs:flex items-center gap-3 ml-4 shrink-0">
           <span className={clsx("text-[10px] font-bold uppercase tracking-wider transition-colors", syncedStatus.includes('Saving') ? "text-aura-teal animate-pulse" : "text-aura-lavender/40")}>
             {syncedStatus}
           </span>
         </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
      <div className="h-6 bg-aura-panel/50 border-t border-aura-border flex items-center justify-end px-4 shrink-0 text-[10px] text-aura-lavender/40 uppercase tracking-widest">
         {editor ? editor.getText().split(/\s+/).filter(w => w.length > 0).length : 0} Words
      </div>
    </div>
  );
}
