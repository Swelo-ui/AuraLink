import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { useEffect, useState, useRef } from 'react';
import { useSocket } from './SocketProvider';
import clsx from 'clsx';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';

export default function SyncNotes({ connectionId, partner }: { connectionId?: string, partner?: any }) {
  const { socket } = useSocket();
  const [syncedStatus, setSyncedStatus] = useState('Synced');
  const isUpdatingRef = useRef(false);

  const { user } = useAuthStore();

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    editor?.chain().focus().extendMarkRange('link').setLink({ href, target: '_blank' }).run();
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-aura-primary underline underline-offset-2 hover:opacity-80 cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: '<p>Start writing your notes...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none max-w-none p-6 min-h-full'
      }
    },
    onUpdate: async ({ editor }) => {
      if (isUpdatingRef.current || !user?.id) return;
      
      setSyncedStatus('Saving...');
      const html = editor.getHTML();

      if (connectionId) {
        // Send via Realtime
        if (socket) {
          socket.send({
            type: 'broadcast',
            event: `note_update:${connectionId}`,
            payload: { content: html, by: user.id }
          });
        }
        
        // Save to DB
        const { data: existing } = await supabase.from('notes').select('id').eq('connection_id', connectionId).single();
        if (existing) {
          await supabase.from('notes').update({ content: html, last_edited_by: user.id }).eq('id', existing.id);
        } else {
          await supabase.from('notes').insert([{ connection_id: connectionId, content: html, last_edited_by: user.id }]);
        }
      } else {
        // Personal note
        const { data: existing } = await supabase.from('notes').select('id').is('connection_id', null).eq('user_id', user.id).single();
        if (existing) {
          await supabase.from('notes').update({ content: html, last_edited_by: user.id }).eq('id', existing.id);
        } else {
          await supabase.from('notes').insert([{ user_id: user.id, content: html, last_edited_by: user.id }]);
        }
      }
      
      setTimeout(() => setSyncedStatus('Synced'), 1000);
    }
  });

  useEffect(() => {
    const fetchNote = async () => {
      try {
        if (!user?.id) return;
        let query = supabase.from('notes').select('content');
        if (connectionId) {
          query = query.eq('connection_id', connectionId);
        } else {
          query = query.is('connection_id', null).eq('user_id', user.id);
        }
        const { data } = await query.single();
        if (data && editor && data.content) {
          isUpdatingRef.current = true;
          editor.commands.setContent(data.content);
          isUpdatingRef.current = false;
        }
      } catch (err) {
        console.error('Failed to load note', err);
      }
    };
    if (editor) {
      fetchNote();
    }
  }, [connectionId, editor, user?.id]);

  useEffect(() => {
    if (!socket || !editor || !connectionId) return;

    const handleNoteUpdate = ({ payload }: any) => {
      // Prevent echoing back
      if (partner && payload.by !== partner.id) return;
      
      isUpdatingRef.current = true;
      const { from, to } = editor.state.selection;
      
      // Basic last-write-wins replacement (in production use Yjs for true CRDT)
      editor.commands.setContent(payload.content, { emitUpdate: false });
      
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

    socket.on('broadcast', { event: `note_update:${connectionId}` }, handleNoteUpdate);
    return () => {
      // Cannot cleanly off a specific broadcast event in supabase-js easily, but channel unmounts handle it
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
            <button onClick={addLink} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all text-aura-lavender/50 hover:text-white border border-aura-border bg-aura-navy" title="Add Link">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
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
