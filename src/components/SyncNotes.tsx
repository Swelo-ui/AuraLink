import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, useRef } from 'react';
import { useSocket } from './SocketProvider';

export default function SyncNotes({ connectionId, partner }: { connectionId: string, partner: any }) {
  const { socket } = useSocket();
  const [syncedStatus, setSyncedStatus] = useState('Synced');
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Start collaborating...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none max-w-none p-6 min-h-full'
      }
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;
      
      setSyncedStatus('Saving...');
      const html = editor.getHTML();
      socket?.emit('note_update', { connectionId, content: html });
      
      setTimeout(() => setSyncedStatus('Synced'), 1000);
    }
  });

  useEffect(() => {
    if (!socket || !editor) return;

    const handleNoteUpdate = (data: { content: string, by: string }) => {
      // Prevent echoing back
      if (data.by !== partner.id) return;
      
      isUpdatingRef.current = true;
      const { from, to } = editor.state.selection;
      
      // Basic last-write-wins replacement (in production use Yjs for true CRDT)
      editor.commands.setContent(data.content, { emitUpdate: false });
      
      // Attempt to restore cursor roughly
      try {
        editor.commands.setTextSelection({ from, to });
      } catch (e) {}
      
      isUpdatingRef.current = false;
      setSyncedStatus('Synced from ' + partner.username);
    };

    socket.on('note_updated', handleNoteUpdate);
    return () => {
      socket.off('note_updated', handleNoteUpdate);
    };
  }, [socket, editor, partner]);

  return (
    <div className="flex flex-col h-full bg-aura-navy overflow-hidden">
      <div className="h-10 bg-aura-panel border-b border-aura-border flex items-center px-4 justify-between shrink-0">
         <div className="flex gap-2">
            <button onClick={() => editor?.chain().focus().toggleBold().run()} className="p-1 px-2 text-xs font-bold bg-aura-border hover:bg-aura-primary rounded text-white transition-colors">B</button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="p-1 px-2 text-xs italic bg-aura-border hover:bg-aura-primary rounded text-white transition-colors">I</button>
            <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="p-1 px-2 text-xs font-semibold bg-aura-border hover:bg-aura-primary rounded text-white transition-colors">H2</button>
         </div>
         <span className="text-xs text-aura-lavender/40">{syncedStatus}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
}
