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
import Blockquote from '@tiptap/extension-blockquote';

// Custom Blockquote with color support
const CustomBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: element => element.getAttribute('data-color'),
        renderHTML: attributes => {
          if (!attributes.color) return {};
          return { 'data-color': attributes.color, style: `--quote-color: ${attributes.color}` };
        },
      },
    };
  },
});
import { 
  Bold, Italic, List, Link as LinkIcon, Trash2, 
  CheckCircle2, RefreshCw, Heading1, Heading2, 
  Quote, Code, Highlighter, Download, Sparkles,
  Clock, Hash, Send, X, Palette
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
        blockquote: false, // Turn off default blockquote to use our custom one
      }),
      CustomBlockquote.configure({
        HTMLAttributes: {
          class: 'aura-quote',
        },
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
        class: 'prose prose-invert prose-sm sm:prose-base focus:outline-none max-w-none p-8 min-h-full selection:bg-aura-primary/30 aura-editor'
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
      if (!user?.id || !editor) return;
      try {
        let query = supabase.from('notes').select('content');
        if (connectionId) {
          query = query.eq('connection_id', connectionId);
        } else {
          query = query.is('connection_id', null).eq('user_id', user.id);
        }
        
        const { data, error } = await query.maybeSingle();
        if (error) throw error;

        if (data && data.content !== undefined) {
          isUpdatingRef.current = true;
          editor.commands.setContent(data.content);
          // Set timeout to ensure the ref is cleared after the editor stabilizes
          setTimeout(() => { isUpdatingRef.current = false; }, 50);
        }
      } catch (err) {
        console.error('[Fetch Note Error]', err);
      }
    };
    fetchNote();
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
  const [showColorMenu, setShowColorMenu] = useState(false);
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
    <div className="flex flex-col h-full bg-aura-navy overflow-visible relative selection:bg-aura-primary/30">
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
              
              {/* Quote Menu */}
              <div className="relative flex items-center bg-aura-navy/50 p-1 rounded-xl border border-aura-border/50 ml-2">
                <ToolbarButton 
                  active={editor?.isActive('blockquote')} 
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()} 
                  icon={<Quote size={15} />} 
                />
                <button 
                  onClick={() => setShowColorMenu(!showColorMenu)}
                  className="w-4 h-8 flex items-center justify-center hover:bg-white/5 rounded-md text-aura-lavender/30 transition-colors border-l border-aura-border/30 ml-1"
                >
                  <Palette size={10} />
                </button>
                
                {showColorMenu && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowColorMenu(false)} />
                    <div className="absolute left-0 top-full mt-2 p-2 bg-aura-panel border border-aura-border rounded-xl shadow-2xl z-[70] flex gap-1 animate-in zoom-in-95 duration-200">
                       {[
                         { color: '#a855f7', label: 'Purple' },
                         { color: '#14b8a6', label: 'Teal' },
                         { color: '#3b82f6', label: 'Blue' },
                         { color: '#f97316', label: 'Orange' },
                         { color: '#ec4899', label: 'Pink' },
                       ].map((c) => (
                         <button
                           key={c.color}
                           onClick={() => {
                             // If not in blockquote, toggle it first
                             if (!editor?.isActive('blockquote')) {
                               editor?.chain().focus().toggleBlockquote().run();
                             }
                             // Update the attribute for the specific blockquote
                             editor?.chain().focus().updateAttributes('blockquote', { color: c.color }).run();
                             setShowColorMenu(false);
                           }}
                           className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-lg"
                           style={{ backgroundColor: c.color }}
                           title={c.label}
                         />
                       ))}
                    </div>
                  </>
                )}
              </div>

              <ToolbarButton active={editor?.isActive('codeBlock')} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} icon={<Code size={15} />} />
              
              {/* Standard Highlighter */}
              <div className="flex items-center gap-1 bg-aura-navy/30 px-1 ml-1 rounded-lg">
                <button 
                  onClick={() => editor?.chain().focus().toggleHighlight({ color: '#facc15' }).run()}
                  className={clsx("w-6 h-6 rounded flex items-center justify-center transition-all", editor?.isActive('highlight', { color: '#facc15' }) ? "bg-yellow-400 text-black" : "text-yellow-400/50 hover:text-yellow-400")}
                >
                  <Highlighter size={12} />
                </button>
                <button 
                  onClick={() => editor?.chain().focus().toggleHighlight({ color: '#4ade80' }).run()}
                  className={clsx("w-6 h-6 rounded flex items-center justify-center transition-all", editor?.isActive('highlight', { color: '#4ade80' }) ? "bg-green-400 text-black" : "text-green-400/50 hover:text-green-400")}
                >
                  <Highlighter size={12} />
                </button>
              </div>
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
                  <div className="fixed inset-0 z-[60] bg-aura-navy/20 backdrop-blur-[2px] md:bg-transparent" onClick={() => setShowAiMenu(false)} />
                  <div className="fixed bottom-0 inset-x-0 md:absolute md:bottom-auto md:top-full md:right-0 mt-0 md:mt-2 w-full md:w-64 bg-aura-panel border-t md:border border-aura-border rounded-t-3xl md:rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-2xl z-[70] overflow-hidden animate-in fade-in slide-in-from-bottom md:slide-in-from-top-2 duration-300 backdrop-blur-2xl">
                    <div className="p-4 md:p-3 border-b border-aura-border bg-white/5 flex items-center justify-between">
                      <p className="text-[10px] md:text-[9px] font-black text-aura-primary uppercase tracking-[0.2em]">Aura Intelligence</p>
                      <button onClick={() => setShowAiMenu(false)} className="md:hidden text-aura-lavender/50"><X size={18} /></button>
                    </div>
                    <div className="p-2 md:p-1 pb-4 md:pb-2 max-h-[60vh] overflow-y-auto">
                      <AiMenuButton icon={<Sparkles size={16}/>} label="Professionalize" onClick={() => runAiCommand('refine')} />
                      <AiMenuButton icon={<List size={16}/>} label="Create Checklist" onClick={() => runAiCommand('todo')} />
                      <AiMenuButton icon={<Hash size={16}/>} label="Summarize" onClick={() => runAiCommand('summarize')} />
                      <AiMenuButton icon={<RefreshCw size={16}/>} label="Rewrite in Hinglish" onClick={() => runAiCommand('hinglish')} />
                      
                      <div className="mt-3 md:mt-2 px-3 md:px-2 pb-2">
                         <div className="relative group">
                           <input 
                             type="text" 
                             placeholder="Custom request..."
                             className="w-full bg-aura-navy/50 border border-aura-border rounded-xl py-3 md:py-2 px-4 md:px-3 text-sm md:text-xs text-white placeholder:text-aura-lavender/30 focus:outline-none focus:border-aura-primary/50 transition-all"
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 runAiCommand('custom', (e.target as HTMLInputElement).value);
                                 (e.target as HTMLInputElement).value = '';
                               }
                             }}
                           />
                           <button 
                             className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-aura-primary hover:text-white transition-colors"
                             onClick={(e) => {
                               const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                               if (input.value) {
                                 runAiCommand('custom', input.value);
                                 input.value = '';
                               }
                             }}
                           >
                             <Send size={16} />
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
          padding: 0.75rem 1.25rem;
          font-style: italic;
          border-radius: 0 12px 12px 0;
          transition: all 0.3s ease;
          margin: 1.5rem 0;
        }
        /* Dynamic Quote Colors */
        .prose blockquote[data-color] {
          border-left-color: var(--quote-color);
          background: color-mix(in srgb, var(--quote-color) 10%, transparent);
        }
        .aura-editor mark {
          color: #000 !important;
          font-weight: 500;
          border-radius: 4px;
          padding: 0 3px;
        }
      `}} />
    </div>
  );
}

function AiMenuButton({ icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 md:gap-3 px-4 md:px-3 py-3.5 md:py-2.5 text-sm md:text-xs text-aura-lavender/60 hover:text-white hover:bg-white/5 transition-all rounded-2xl md:rounded-xl active:scale-[0.98]"
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
