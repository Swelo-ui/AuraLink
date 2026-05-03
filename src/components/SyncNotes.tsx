import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useSocket } from './SocketProvider';
import clsx from 'clsx';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { 
  Bold, Italic, List, Link as LinkIcon, Trash2, 
  CheckCircle2, RefreshCw, Heading1, Heading2, 
  Quote, Code, Highlighter, Download, Sparkles,
  Clock, Hash, Send
} from 'lucide-react';

export default function SyncNotes({ connectionId, partner }: { connectionId?: string, partner?: any }) {
  const { socket } = useSocket();
  const [syncedStatus, setSyncedStatus] = useState('Synced');
  const [isSaving, setIsSaving] = useState(false);
  const isUpdatingRef = useRef(false);
  const { user } = useAuthStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Placeholder.configure({
        placeholder: 'Capture your thoughts, ideas, or shared insights...',
      }),
      CharacterCount,
      Typography,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-aura-primary underline underline-offset-2 hover:opacity-80 cursor-pointer transition-all',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none max-w-none p-8 min-h-full selection:bg-aura-primary/30'
      }
    },
    onUpdate: async ({ editor }) => {
      if (isUpdatingRef.current || !user?.id) return;
      
      setIsSaving(true);
      setSyncedStatus('Saving...');
      const html = editor.getHTML();

      if (connectionId) {
        if (socket) {
          socket.send({
            type: 'broadcast',
            event: `note_update:${connectionId}`,
            payload: { content: html, by: user.id }
          });
        }
        const { data: existing } = await supabase.from('notes').select('id').eq('connection_id', connectionId).maybeSingle();
        if (existing) {
          await supabase.from('notes').update({ content: html, last_edited_by: user.id }).eq('id', existing.id);
        } else {
          await supabase.from('notes').insert([{ connection_id: connectionId, content: html, last_edited_by: user.id, user_id: user.id }]);
        }
      } else {
        const { data: existing } = await supabase.from('notes').select('id').is('connection_id', null).eq('user_id', user.id).maybeSingle();
        if (existing) {
          await supabase.from('notes').update({ content: html, last_edited_by: user.id }).eq('id', existing.id);
        } else {
          await supabase.from('notes').insert([{ user_id: user.id, content: html, last_edited_by: user.id }]);
        }
      }
      
      setTimeout(() => {
        setIsSaving(false);
        setSyncedStatus('Synced');
      }, 800);
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
        const { data } = await query.maybeSingle();
        if (data && editor && data.content) {
          isUpdatingRef.current = true;
          editor.commands.setContent(data.content);
          isUpdatingRef.current = false;
        }
      } catch (err) {
        console.error('Failed to load note', err);
      }
    };
    if (editor) fetchNote();
  }, [connectionId, editor, user?.id]);

  useEffect(() => {
    if (!socket || !editor || !connectionId) return;
    const handleNoteUpdate = ({ payload }: any) => {
      if (partner && payload.by !== partner.id) return;
      isUpdatingRef.current = true;
      const { from, to } = editor.state.selection;
      editor.commands.setContent(payload.content, { emitUpdate: false });
      try { editor.commands.setTextSelection({ from, to }); } catch (e) {}
      isUpdatingRef.current = false;
      setSyncedStatus('Synced from ' + (partner?.username || 'Partner'));
    };
    socket.on('broadcast', { event: `note_update:${connectionId}` }, handleNoteUpdate);
  }, [socket, editor, partner, connectionId]);

  useEffect(() => {
    const handleRemoteUpdate = (e: any) => {
      if (e.detail?.content && editor) {
        editor.commands.setContent(e.detail.content);
        setSyncedStatus('Updated by Aura AI');
      }
    };
    window.addEventListener('aura_note_update', handleRemoteUpdate);
    return () => window.removeEventListener('aura_note_update', handleRemoteUpdate);
  }, [editor]);

  const stats = useMemo(() => {
    if (!editor) return { words: 0, characters: 0, readTime: 0 };
    const text = editor.getText();
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const characters = text.length;
    const readTime = Math.ceil(words / 200);
    return { words, characters, readTime };
  }, [editor?.getText()]);

  const [showAiMenu, setShowAiMenu] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const runAiCommand = (type: string, custom?: string) => {
    const content = editor?.getText() || '';
    if (!content && type !== 'write') return alert('Add some content first!');
    
    let promptText = '';
    switch(type) {
      case 'refine': promptText = `Please professionalize and refine these notes, making them sound more executive and clear: \n\n${content}`; break;
      case 'summarize': promptText = `Summarize these notes into 3-5 key bullet points: \n\n${content}`; break;
      case 'todo': promptText = `Convert these notes into an organized checklist of actionable items: \n\n${content}`; break;
      case 'expand': promptText = `Expand on the ideas in these notes and provide more detail and context: \n\n${content}`; break;
      case 'hinglish': promptText = `Convert these notes into a natural Hinglish (Hindi + English) style that's easy to read for a social environment: \n\n${content}`; break;
      case 'custom': promptText = `${custom}: \n\n${content}`; break;
      case 'write': promptText = `${custom}`; break;
    }

    navigator.clipboard.writeText(content);
    const event = new CustomEvent('aura_ai_suggest', { detail: { prompt: promptText } });
    window.dispatchEvent(event);
    setShowAiMenu(false);
    setCustomPrompt('');
  };

  const exportAsMarkdown = () => {
    const content = editor?.getText() || '';
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura-note-${new Date().toISOString().slice(0,10)}.md`;
    a.click();
  };

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;
    editor?.chain().focus().extendMarkRange('link').setLink({ href, target: '_blank' }).run();
  };

  return (
    <div className="flex flex-col h-full bg-aura-navy overflow-hidden relative selection:bg-aura-primary/30">
      <div className={clsx("absolute top-0 left-0 h-[2.5px] bg-gradient-to-r from-aura-primary to-aura-pink z-50 transition-all duration-700", isSaving ? "w-full opacity-100" : "w-0 opacity-0")}/>

      <div className="h-14 bg-aura-panel/95 backdrop-blur-xl border-b border-aura-border flex items-center px-4 justify-between shrink-0 z-40 shadow-lg relative">
         <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center bg-aura-navy/50 p-1 rounded-xl border border-aura-border/50 mr-2">
              <ToolbarButton active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} icon={<Bold size={15} />} />
              <ToolbarButton active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} icon={<Italic size={15} />} />
            </div>
            <div className="flex items-center bg-aura-navy/50 p-1 rounded-xl border border-aura-border/50 mr-2">
              <ToolbarButton active={editor?.isActive('heading', { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={15} />} />
              <ToolbarButton active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={15} />} />
            </div>
            <div className="flex items-center bg-aura-navy/50 p-1 rounded-xl border border-aura-border/50">
              <ToolbarButton active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} icon={<List size={15} />} />
              <ToolbarButton active={editor?.isActive('blockquote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()} icon={<Quote size={15} />} />
              <ToolbarButton active={editor?.isActive('codeBlock')} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} icon={<Code size={15} />} />
              <ToolbarButton active={editor?.isActive('highlight')} onClick={() => editor?.chain().focus().toggleHighlight().run()} icon={<Highlighter size={15} />} />
            </div>
            <div className="w-px h-5 bg-aura-border mx-1 shrink-0" />
            <ToolbarButton onClick={addLink} icon={<LinkIcon size={15} />} active={editor?.isActive('link')} />
         </div>

         <div className="flex items-center gap-3 shrink-0">
           <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-aura-teal/5 border border-aura-teal/20 rounded-full">
              {isSaving ? <RefreshCw size={12} className="animate-spin text-aura-teal" /> : <CheckCircle2 size={12} className="text-aura-teal" />}
              <span className="text-[10px] font-black uppercase tracking-wider text-aura-teal">{syncedStatus}</span>
           </div>
           <div className="flex items-center gap-1">
           <div className="relative">
             <button 
               onClick={() => setShowAiMenu(!showAiMenu)}
               className={clsx(
                 "p-2 rounded-lg transition-all flex items-center gap-2",
                 showAiMenu ? "bg-aura-primary text-white shadow-lg" : "text-aura-primary/50 hover:text-aura-primary hover:bg-aura-primary/10"
               )}
               title="Aura Intelligence"
             >
               <Sparkles size={18} />
               <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Aura AI</span>
             </button>

             {showAiMenu && (
               <>
                 <div className="fixed inset-0 z-[60]" onClick={() => setShowAiMenu(false)} />
                 <div className="absolute right-0 mt-2 w-56 bg-aura-panel border border-aura-border rounded-2xl shadow-2xl z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-2xl">
                   <div className="p-3 border-b border-aura-border bg-white/5">
                     <p className="text-[10px] font-black text-aura-primary uppercase tracking-[0.2em]">Aura Intelligence</p>
                   </div>
                   <div className="p-1 pb-2">
                     <AiMenuButton icon={<Sparkles size={14}/>} label="Professionalize" onClick={() => runAiCommand('refine')} />
                     <AiMenuButton icon={<List size={14}/>} label="Create Checklist" onClick={() => runAiCommand('todo')} />
                     <AiMenuButton icon={<Hash size={14}/>} label="Summarize" onClick={() => runAiCommand('summarize')} />
                     <AiMenuButton icon={<RefreshCw size={14}/>} label="Rewrite in Hinglish" onClick={() => runAiCommand('hinglish')} />
                     
                     <div className="mt-2 px-2 pb-1">
                        <div className="relative group">
                          <input 
                            type="text" 
                            placeholder="Custom request..."
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && runAiCommand('custom', customPrompt)}
                            className="w-full bg-aura-navy/50 border border-aura-border rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-aura-primary/50 transition-all placeholder:text-aura-lavender/20"
                          />
                          <button 
                            onClick={() => runAiCommand('custom', customPrompt)}
                            className="absolute right-2 top-1.5 p-1 text-aura-primary hover:bg-aura-primary/20 rounded-md transition-all"
                          >
                            <Send size={12} />
                          </button>
                        </div>
                     </div>
                   </div>
                 </div>
               </>
             )}
           </div>
             <button onClick={exportAsMarkdown} className="p-2 text-aura-lavender/40 hover:text-white hover:bg-white/5 rounded-lg transition-all" title="Export as Markdown"><Download size={18} /></button>
             <button onClick={() => confirm('Wipe all content?') && editor?.commands.setContent('')} className="p-2 text-red-400/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Clear All"><Trash2 size={18} /></button>
           </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-aura-navy/30 relative">
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          <div className="p-8 pb-0 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2 py-0.5 bg-aura-primary/20 rounded text-[9px] font-black text-aura-primary uppercase tracking-widest border border-aura-primary/30">Document</div>
              {connectionId && <div className="px-2 py-0.5 bg-aura-teal/20 rounded text-[9px] font-black text-aura-teal uppercase tracking-widest border border-aura-teal/30">Shared</div>}
            </div>
            <h1 className="text-3xl font-black text-white/90 tracking-tight mb-2">
              {connectionId ? (partner?.username ? `${partner.username}'s Workspace` : 'Sync Notes') : 'Personal Vault Notes'}
            </h1>
            <div className="flex items-center gap-4 text-[11px] text-aura-lavender/30 font-medium border-b border-aura-border pb-6">
              <span className="flex items-center gap-1.5"><Clock size={12} /> Last edit: {new Date().toLocaleTimeString()}</span>
              <span className="flex items-center gap-1.5"><Sparkles size={12} /> AuraLink Verified</span>
            </div>
          </div>
          <div className="relative">
            <EditorContent editor={editor} className="min-h-full" />
          </div>
        </div>
      </div>

      <div className="h-8 bg-aura-panel/50 border-t border-aura-border flex items-center justify-between px-4 shrink-0 text-[10px] text-aura-lavender/30 uppercase tracking-[0.2em] font-bold">
         <div className="flex items-center gap-4">
           <span className="flex items-center gap-1.5"><Hash size={10} /> {stats.characters} Chars</span>
           <span className="flex items-center gap-1.5"><Clock size={10} /> {stats.readTime}m Read</span>
         </div>
         <div className="flex items-center gap-1.5">
           <span className="text-aura-primary">{stats.words}</span> Words
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(148, 163, 184, 0.3);
          pointer-events: none;
          height: 0;
        }
        .prose pre {
          background: #0a0a14 !important;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 1rem;
        }
        .prose blockquote {
          border-left: 3px solid #7c3aed;
          background: rgba(124, 58, 237, 0.05);
          padding: 0.5rem 1rem;
          font-style: italic;
          border-radius: 0 8px 8px 0;
        }
      `}} />
    </div>
  );
}

function AiMenuButton({ icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-aura-lavender/60 hover:text-white hover:bg-white/5 transition-all rounded-xl"
    >
      <span className="text-aura-primary">{icon}</span>
      <span className="font-semibold">{label}</span>
    </button>
  );
}

function ToolbarButton({ active, onClick, icon, label, size = 'md' }: any) {
  return (
    <button onClick={onClick} title={label} className={clsx("flex items-center justify-center rounded-lg transition-all", size === 'sm' ? "w-7 h-7" : "w-9 h-9", active ? "bg-aura-primary text-white shadow-lg shadow-aura-primary/20 scale-105" : "text-aura-lavender/40 hover:text-white hover:bg-white/5")}>
      {icon}
    </button>
  );
}
