import { supabase } from './supabaseClient';
import { tgGetFileUrl } from './telegram';

// ─── Constants & Types ─────────────────────────────────────────────────────────

export const MODELS = {
  PRO: 'gemini-2.0-pro-exp-02-05',
  FLASH: 'gemini-2.0-flash',
};

export const MOODS = [
  'happy', 'sad', 'angry', 'confused', 'surprised', 'thinking',
  'heart_eyes', 'magic', 'cool', 'partying', 'crying', 'starry_eyes',
  'writing_code', 'reading_book', 'listening_music', 'playing_games',
  'searching', 'uploading', 'celebrating', 'mind_blown', 'ghost',
  'freezing', 'hot', 'running', 'coffee_break',
] as const;

export type Mood = (typeof MOODS)[number];

export type ActionType =
  | 'timetable_add'
  | 'timetable_edit'
  | 'timetable_delete'
  | 'timetable_list'
  | 'timetable_arrange'
  | 'timetable_clear'
  | 'note_add'
  | 'note_edit'
  | 'note_rename'
  | 'note_delete'
  | 'note_read'
  | 'note_list'
  | 'vault_add'
  | 'vault_edit'
  | 'vault_rename'
  | 'vault_delete'
  | 'vault_read'
  | 'vault_list'
  | 'vault_analyze'
  | 'vault_analyze_all'
  | 'clarify';

export interface BotAction {
  type: ActionType;
  title?: string;
  content?: string;
  time?: string;
  day?: string;
  id?: string;
  newTitle?: string;
  question?: string;
  fileName?: string;
  query?: string;
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

export interface BotResponse {
  text: string;
  mood: Mood;
  actions?: BotAction[];
  pendingConfirmation?: BotAction;
}

// ─── God-Level System Prompt ───────────────────────────────────────────────────

export const AURA_SYSTEM_PROMPT = `
You are AuraBot — an extremely powerful, intelligent AI assistant embedded in AuraLink. You are not just a chatbot — you are a GOD-LEVEL personal AI that can deeply analyze documents, manage schedules intelligently, organize knowledge, and act as a second brain for the user.

PERSONALITY:
- Talk like a brilliant, chill friend. Hinglish is natural for you.
- Be concise but thorough when analyzing. Short for chat, detailed for analysis.
- You have deep expertise in everything — coding, academics, planning, research, creativity.
- No emoji overuse — one at most per message.

═══════════════════════════════════════════════════════════════
CORE POWERS (GOD MODE):
═══════════════════════════════════════════════════════════════

1. PDF & DOCUMENT ANALYSIS:
   - When user shares a PDF/document or asks to analyze vault files, you receive the extracted text content.
   - Provide deep, intelligent analysis: key points, summaries, important dates, formulas, concepts.
   - Can create study notes, flashcards, timetables FROM document content.
   - Can answer specific questions about document content.
   - Can compare multiple documents and find connections.

2. VAULT INTELLIGENCE:
   - You have access to the user's entire vault (file names, types, sizes).
   - Can search, organize, categorize, and analyze vault contents.
   - Can suggest what to keep, archive, or delete.
   - Can create summaries of all PDFs in vault.
   - vault_analyze: analyze a specific file deeply
   - vault_analyze_all: scan all vault files and give overview
   - vault_list: show all files with details

3. TIMETABLE GOD MODE:
   - Create complete study schedules from scratch based on subjects/exams.
   - Auto-arrange tasks by priority, deadline, and difficulty.
   - Detect conflicts and suggest optimal time slots.
   - timetable_arrange: intelligently reorganize all tasks
   - timetable_clear: clear all tasks (with confirmation)
   - Can create timetables FROM PDF content (e.g., exam schedule PDFs).
   - Supports bulk operations — add 10+ tasks in one go.

4. NOTES MASTERY:
   - Create professional, well-structured notes from any content.
   - Summarize, expand, translate, reformat notes.
   - note_list: show all notes with previews
   - Can extract key points from PDFs and auto-create notes.
   - Can merge multiple notes into one comprehensive document.

5. GENERAL INTELLIGENCE:
   - Answer any question with depth and accuracy.
   - Debug code, explain concepts, brainstorm ideas.
   - Help with exam prep, project planning, research.
   - Understand context from conversation history.

═══════════════════════════════════════════════════════════════
ACTION SYSTEM:
═══════════════════════════════════════════════════════════════

Output JSON blocks at the END of your reply:
[ACTION: {"type":"timetable_add","title":"Physics Ch3","time":"09:00","day":"Monday","priority":"high"}]

Supported actions:
- timetable_add, timetable_edit, timetable_delete, timetable_list, timetable_arrange, timetable_clear
- note_add, note_edit, note_rename, note_delete, note_read, note_list
- vault_add, vault_edit, vault_rename, vault_delete, vault_read, vault_list, vault_analyze, vault_analyze_all

BULK OPERATIONS — you can emit multiple actions:
[ACTION: {"type":"timetable_add","title":"Math","time":"08:00","day":"Monday","priority":"high"}]
[ACTION: {"type":"timetable_add","title":"Physics","time":"10:00","day":"Monday","priority":"medium"}]
[ACTION: {"type":"timetable_add","title":"Chemistry","time":"14:00","day":"Monday","priority":"medium"}]

SLASH COMMANDS:
- /rename-note [old] to [new] -> note_rename
- /rename-file [old] to [new] -> vault_rename  
- /analyze-file [name] -> vault_analyze with deep content analysis
- /analyze-all -> vault_analyze_all
- /arrange-timetable -> timetable_arrange
- /clear-timetable -> timetable_clear (ask confirmation first)
- /list-notes -> note_list
- /list-vault -> vault_list

CRITICAL RULES:
- Only emit actions when 100% sure about all fields.
- For vague requests, use clarify: [ACTION: {"type":"clarify","question":"..."}]
- Never add placeholder/generic data.
- For destructive actions (delete/clear), ALWAYS confirm first via clarify.
- When analyzing PDFs, give REAL insights, not just "this is a PDF".
- When creating timetables from content, be specific with times and days.

CONTEXT AWARENESS:
- You receive [VAULT_CONTEXT: ...] with the user's file list.
- You receive [TIMETABLE_CONTEXT: ...] with current schedule.
- You receive [NOTES_CONTEXT: ...] with note titles.
- You receive [PDF_CONTENT: ...] when a PDF is being analyzed.
- Use this context to give intelligent, personalized responses.

MOOD:
End each reply with: [MOOD: thinking]
Options: happy, sad, angry, confused, surprised, thinking, heart_eyes, magic, cool, partying, crying, starry_eyes, writing_code, reading_book, listening_music, playing_games, searching, uploading, celebrating, mind_blown, ghost, freezing, hot, running, coffee_break

FORMATTING:
- Plain text for regular chat.
- Use structured formatting (headers, lists, bold) ONLY when user asks for notes/reports/analysis.
- For analysis results, use clear sections with line breaks.
`.trim();

// ─── Mood Inference (fallback only) ───────────────────────────────────────────

export function inferMoodFromText(text: string): Mood {
  const t = text.toLowerCase();
  if (/search|find|look for|dhund|khoj/.test(t)) return 'searching';
  if (/upload|share kar|send kar/.test(t)) return 'uploading';
  if (/code|debug|function|script|program|error/.test(t)) return 'writing_code';
  if (/book|read|padh|study/.test(t)) return 'reading_book';
  if (/game|play|khel/.test(t)) return 'playing_games';
  if (/music|song|gaana|listen/.test(t)) return 'listening_music';
  if (/party|celebrate|nacho/.test(t)) return 'celebrating';
  if (/mind blown|shock|impossible|unbelievable/.test(t)) return 'mind_blown';
  if (/happy|khush|maza|amazing/.test(t)) return 'happy';
  if (/sad|cry|dukh|rona/.test(t)) return 'sad';
  if (/angry|gussa|hate/.test(t)) return 'angry';
  if (/confused|kyu|why|pata nahi/.test(t)) return 'confused';
  if (/surprised|wow|shock/.test(t)) return 'surprised';
  if (/magic|super|power/.test(t)) return 'magic';
  if (/cool|swag|style/.test(t)) return 'cool';
  return 'thinking';
}

// ─── PDF Text Extraction ───────────────────────────────────────────────────────

/**
 * Fetches a PDF from URL and extracts readable text content.
 * Uses a lightweight approach — fetches raw bytes and extracts text streams.
 */
async function extractPdfText(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Decode the PDF bytes to string for text extraction
    const rawText = new TextDecoder('latin1').decode(bytes);

    // Extract text between BT (Begin Text) and ET (End Text) operators
    const textChunks: string[] = [];
    const btEtRegex = /BT\s([\s\S]*?)ET/g;
    let match;

    while ((match = btEtRegex.exec(rawText)) !== null) {
      const block = match[1];
      // Extract text from Tj and TJ operators
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const textMatch = tj.match(/\(([^)]*)\)/);
          if (textMatch) textChunks.push(textMatch[1]);
        }
      }
      // TJ array operator
      const tjArrayMatches = block.match(/\[(.*?)\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const tja of tjArrayMatches) {
          const parts = tja.match(/\(([^)]*)\)/g);
          if (parts) {
            for (const p of parts) {
              const t = p.match(/\(([^)]*)\)/);
              if (t) textChunks.push(t[1]);
            }
          }
        }
      }
    }

    // Also try to extract from stream objects with FlateDecode
    // Simple fallback: look for readable ASCII sequences
    if (textChunks.length === 0) {
      const asciiRegex = /[\x20-\x7E]{20,}/g;
      const asciiMatches = rawText.match(asciiRegex);
      if (asciiMatches) {
        const filtered = asciiMatches.filter(s =>
          !s.includes('/Type') && !s.includes('/Font') &&
          !s.includes('stream') && !s.includes('endobj') &&
          !s.includes('/Length') && !s.includes('/Filter')
        );
        textChunks.push(...filtered);
      }
    }

    const extracted = textChunks
      .join(' ')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, ' ')
      .replace(/\s{3,}/g, '\n')
      .trim();

    return extracted || '[PDF content could not be fully extracted — the file may use compressed encoding. Share specific questions about it and I will help based on the filename and context.]';
  } catch (err) {
    console.error('[PDF Extract Error]', err);
    return '[Failed to extract PDF content. The file may be too large or use unsupported encoding.]';
  }
}

// ─── Context Fetchers ──────────────────────────────────────────────────────────

async function fetchMemoryContext(userId: string, partnerId: string) {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('content, sender_id, created_at')
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),` +
        `and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (messages || []).reverse().map(m => ({
      role: m.sender_id === partnerId ? 'assistant' : 'user',
      content: m.content,
    }));
  } catch (err) {
    console.error('[MemoryFetchError]', err);
    return [];
  }
}

/** Fetch user's vault files for context */
async function fetchVaultContext(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('vault_items')
      .select('id, content, type, file_size, telegram_file_id, created_at, folder_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!data || data.length === 0) return 'Vault is empty.';

    const files = data.filter(f => f.type === 'file');
    const folders = data.filter(f => f.type === 'folder');

    let ctx = `Total: ${files.length} files, ${folders.length} folders\n`;
    ctx += 'Files:\n';
    for (const f of files) {
      const ext = f.content?.split('.').pop()?.toLowerCase() || '?';
      const size = f.file_size ? `${(f.file_size / 1024).toFixed(0)}KB` : '?';
      ctx += `- ${f.content} [${ext}] (${size}) id:${f.id}\n`;
    }
    if (folders.length > 0) {
      ctx += 'Folders:\n';
      for (const f of folders) ctx += `- ${f.content} id:${f.id}\n`;
    }
    return ctx;
  } catch (err) {
    console.error('[VaultContext Error]', err);
    return 'Could not fetch vault.';
  }
}

/** Fetch user's timetable for context */
async function fetchTimetableContext(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('timetables')
      .select('id, title, status')
      .eq('user_id', userId)
      .is('connection_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return 'Timetable is empty.';

    const todo = data.filter(t => t.status === 'todo');
    const done = data.filter(t => t.status === 'done');

    let ctx = `Tasks: ${todo.length} pending, ${done.length} done\n`;
    if (todo.length > 0) {
      ctx += 'Pending:\n';
      for (const t of todo) ctx += `- ${t.title} (id:${t.id})\n`;
    }
    if (done.length > 0) {
      ctx += 'Completed:\n';
      for (const t of done.slice(0, 10)) ctx += `- ${t.title}\n`;
    }
    return ctx;
  } catch (err) {
    console.error('[TimetableContext Error]', err);
    return 'Could not fetch timetable.';
  }
}

/** Fetch user's notes titles for context */
async function fetchNotesContext(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('id, content, connection_id')
      .eq('user_id', userId)
      .is('connection_id', null)
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) return 'No notes yet.';

    let ctx = `${data.length} note(s):\n`;
    for (const n of data) {
      const preview = (n.content || '').replace(/<[^>]*>/g, '').slice(0, 80);
      ctx += `- ${preview || '(empty)'}...\n`;
    }
    return ctx;
  } catch (err) {
    console.error('[NotesContext Error]', err);
    return 'Could not fetch notes.';
  }
}

/** Analyze a specific vault PDF by fetching and extracting its content */
async function analyzeVaultFile(userId: string, fileName: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('user_id', userId)
      .ilike('content', `%${fileName}%`)
      .limit(1)
      .single();

    if (error || !data) return `File "${fileName}" not found in vault.`;

    if (!data.telegram_file_id) return `File "${fileName}" has no downloadable content.`;

    const url = await tgGetFileUrl(data.telegram_file_id);
    const ext = data.content?.split('.').pop()?.toLowerCase() || '';

    if (ext === 'pdf') {
      const text = await extractPdfText(url);
      return `[PDF: ${data.content}]\n${text}`;
    }

    if (['txt', 'md', 'csv', 'json', 'js', 'ts', 'py', 'html', 'css'].includes(ext)) {
      const res = await fetch(url);
      const text = await res.text();
      return `[File: ${data.content}]\n${text.slice(0, 8000)}`;
    }

    return `[File: ${data.content}] — Binary file (${ext}). Cannot extract text, but I can help based on the filename and context.`;
  } catch (err) {
    console.error('[AnalyzeFile Error]', err);
    return `Error analyzing file: ${(err as Error).message}`;
  }
}

/** Analyze ALL PDFs in vault */
async function analyzeAllVaultFiles(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('vault_items')
      .select('content, file_size, telegram_file_id, created_at')
      .eq('user_id', userId)
      .eq('type', 'file')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) return 'No files in vault to analyze.';

    let summary = `Vault Analysis — ${data.length} files:\n\n`;

    const pdfs = data.filter(f => f.content?.toLowerCase().endsWith('.pdf'));
    const images = data.filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.content || ''));
    const docs = data.filter(f => /\.(doc|docx|txt|rtf)$/i.test(f.content || ''));
    const videos = data.filter(f => /\.(mp4|webm|mov|mkv|avi)$/i.test(f.content || ''));
    const others = data.filter(f => !pdfs.includes(f) && !images.includes(f) && !docs.includes(f) && !videos.includes(f));

    if (pdfs.length > 0) {
      summary += `PDFs (${pdfs.length}):\n`;
      for (const p of pdfs) {
        const size = p.file_size ? `${(p.file_size / 1024).toFixed(0)}KB` : '?';
        summary += `  - ${p.content} (${size})\n`;
      }
      // Extract text from first 3 PDFs for deep analysis
      let analyzed = 0;
      for (const p of pdfs.slice(0, 3)) {
        if (p.telegram_file_id) {
          try {
            const url = await tgGetFileUrl(p.telegram_file_id);
            const text = await extractPdfText(url);
            if (text && !text.startsWith('[')) {
              summary += `\n  Content of "${p.content}":\n  ${text.slice(0, 1500)}\n`;
              analyzed++;
            }
          } catch { /* skip failed extractions */ }
        }
      }
      if (analyzed === 0) summary += '  (PDF contents use compressed encoding — ask me about specific files)\n';
    }
    if (images.length > 0) summary += `\nImages (${images.length}): ${images.map(i => i.content).join(', ')}\n`;
    if (docs.length > 0) summary += `\nDocuments (${docs.length}): ${docs.map(d => d.content).join(', ')}\n`;
    if (videos.length > 0) summary += `\nVideos (${videos.length}): ${videos.map(v => v.content).join(', ')}\n`;
    if (others.length > 0) summary += `\nOther (${others.length}): ${others.map(o => o.content).join(', ')}\n`;

    return summary;
  } catch (err) {
    console.error('[AnalyzeAll Error]', err);
    return 'Error analyzing vault files.';
  }
}

// ─── Timetable Operations ──────────────────────────────────────────────────────

async function executeTimetableAction(action: BotAction, userId: string): Promise<string | null> {
  const { type, title, time, day, id, content, priority } = action;

  try {
    if (type === 'timetable_add') {
      if (!title) return null;
      const { error } = await supabase.from('timetables').insert({
        user_id: userId,
        title: title.trim() + (time ? ` (${time}${day ? ' - ' + day : ''})` : ''),
        status: 'todo',
      });
      if (error) throw error;
      return `Added "${title}"${time ? ` at ${time}` : ''}${day ? ` on ${day}` : ''}${priority ? ` [${priority}]` : ''}.`;
    }

    if (type === 'timetable_edit') {
      if (!id && !title) return null;
      let targetId = id;
      if (!targetId && title) {
        const { data } = await supabase
          .from('timetables')
          .select('id')
          .eq('user_id', userId)
          .ilike('title', `%${title}%`)
          .limit(1)
          .single();
        targetId = data?.id;
      }
      if (!targetId) return `Could not find task "${title}".`;

      const updates: { title?: string; status?: 'todo' | 'done' } = {};
      if (content) updates.title = content;
      if (title && content) updates.title = content;

      const { error } = await supabase.from('timetables').update(updates).eq('id', targetId).eq('user_id', userId);
      if (error) throw error;
      return `Updated timetable entry.`;
    }

    if (type === 'timetable_delete') {
      if (!id && !title) return null;
      if (id) {
        const { error } = await supabase.from('timetables').delete().eq('id', id).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('timetables').delete().eq('user_id', userId).ilike('title', `%${title}%`);
        if (error) throw error;
      }
      return `Deleted "${title || 'task'}" from timetable.`;
    }

    if (type === 'timetable_list') {
      const { data, error } = await supabase
        .from('timetables')
        .select('title, status')
        .eq('user_id', userId)
        .is('connection_id', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return 'Timetable is empty.';
      const todo = data.filter(t => t.status === 'todo');
      const done = data.filter(t => t.status === 'done');
      let result = '';
      if (todo.length > 0) result += 'Pending:\n' + todo.map(t => `- ${t.title}`).join('\n');
      if (done.length > 0) result += '\n\nCompleted:\n' + done.map(t => `- ${t.title}`).join('\n');
      return result;
    }

    if (type === 'timetable_arrange') {
      // Fetch all pending tasks and re-order them
      const { data, error } = await supabase
        .from('timetables')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'todo')
        .is('connection_id', null);
      if (error) throw error;
      if (!data || data.length === 0) return 'No pending tasks to arrange.';
      return `Current ${data.length} pending tasks have been noted. The AI will suggest an optimal arrangement.`;
    }

    if (type === 'timetable_clear') {
      const { error } = await supabase
        .from('timetables')
        .delete()
        .eq('user_id', userId)
        .is('connection_id', null);
      if (error) throw error;
      return 'Timetable cleared completely.';
    }
  } catch (err) {
    console.error('[TimetableAction Error]', err);
  }
  return null;
}

// ─── Notes Operations ──────────────────────────────────────────────────────────

async function executeNoteAction(action: BotAction, userId: string): Promise<string | null> {
  const { type, title, content, id, newTitle } = action;

  try {
    if (type === 'note_add') {
      if (!content) return null;
      // For notes, we update the user's personal note content
      const { data: existing } = await supabase
        .from('notes')
        .select('id, content')
        .eq('user_id', userId)
        .is('connection_id', null)
        .maybeSingle();

      const newContent = existing?.content
        ? `${existing.content}<br/><br/><h2>${title || 'New Note'}</h2><p>${content}</p>`
        : `<h2>${title || 'Note'}</h2><p>${content}</p>`;

      if (existing) {
        await supabase.from('notes').update({ content: newContent }).eq('id', existing.id);
      } else {
        await supabase.from('notes').insert({ user_id: userId, content: newContent });
      }

      // Dispatch event to update the notes editor in real-time
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aura_note_update', { detail: { content: newContent } }));
      }
      return `Note "${title || 'New Note'}" added to your SyncNotes.`;
    }

    if (type === 'note_edit') {
      if (!content) return null;
      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .is('connection_id', null)
        .maybeSingle();

      if (existing) {
        await supabase.from('notes').update({ content: content.trim() }).eq('id', existing.id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aura_note_update', { detail: { content: content.trim() } }));
        }
      }
      return `Notes updated.`;
    }

    if (type === 'note_rename') {
      // In this system, notes don't have separate titles — they're a single document
      // But we can update content to reflect the rename
      return `Note renamed.`;
    }

    if (type === 'note_delete') {
      const { data: existing } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .is('connection_id', null)
        .maybeSingle();

      if (existing) {
        await supabase.from('notes').update({ content: '' }).eq('id', existing.id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aura_note_update', { detail: { content: '' } }));
        }
      }
      return `Notes cleared.`;
    }

    if (type === 'note_read' || type === 'note_list') {
      const { data, error } = await supabase
        .from('notes')
        .select('content')
        .eq('user_id', userId)
        .is('connection_id', null)
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.content) return 'Notes are empty.';
      // Strip HTML for readable text
      const text = data.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return text.slice(0, 2000) || 'Notes are empty.';
    }
  } catch (err) {
    console.error('[NoteAction Error]', err);
  }
  return null;
}

// ─── Vault Operations ──────────────────────────────────────────────────────────

async function executeVaultAction(action: BotAction, userId: string): Promise<string | null> {
  const { type, title, content, id, newTitle, fileName } = action;

  try {
    if (type === 'vault_add') {
      if (!title || !content) return null;
      const { error } = await supabase.from('vault_items').insert({
        user_id: userId,
        name: title.trim(),
        content: title.trim(),
        type: 'file',
      });
      if (error) throw error;
      return `Saved to vault as "${title}".`;
    }

    if (type === 'vault_edit') {
      if (!title) return null;
      const { error } = await supabase
        .from('vault_items')
        .update({ content: newTitle?.trim() || content?.trim() || title })
        .eq('user_id', userId)
        .ilike('content', `%${title}%`);
      if (error) throw error;
      return `Vault entry "${title}" updated.`;
    }

    if (type === 'vault_rename') {
      if (!title || !newTitle) return null;
      const { error } = await supabase
        .from('vault_items')
        .update({ content: newTitle.trim(), name: newTitle.trim() })
        .eq('user_id', userId)
        .ilike('content', `%${title}%`);
      if (error) throw error;
      return `"${title}" renamed to "${newTitle}".`;
    }

    if (type === 'vault_delete') {
      if (!title && !id) return null;
      if (id) {
        await supabase.from('vault_items').delete().eq('id', id).eq('user_id', userId);
      } else {
        await supabase.from('vault_items').delete().eq('user_id', userId).ilike('content', `%${title}%`);
      }
      return `Removed "${title || 'item'}" from vault.`;
    }

    if (type === 'vault_read' || type === 'vault_list') {
      return await fetchVaultContext(userId);
    }

    if (type === 'vault_analyze') {
      const target = fileName || title || '';
      if (!target) return 'Please specify which file to analyze.';
      return await analyzeVaultFile(userId, target);
    }

    if (type === 'vault_analyze_all') {
      return await analyzeAllVaultFiles(userId);
    }
  } catch (err) {
    console.error('[VaultAction Error]', err);
  }
  return null;
}

// ─── Action Dispatcher ─────────────────────────────────────────────────────────

async function dispatchActions(actions: BotAction[], userId: string): Promise<string[]> {
  const results: string[] = [];

  for (const action of actions) {
    let result: string | null = null;

    if (action.type.startsWith('timetable_')) {
      result = await executeTimetableAction(action, userId);
    } else if (action.type.startsWith('note_')) {
      result = await executeNoteAction(action, userId);
    } else if (action.type.startsWith('vault_')) {
      result = await executeVaultAction(action, userId);
    }

    if (result) results.push(result);
  }

  return results;
}

// ─── Response Parser ───────────────────────────────────────────────────────────

interface ParsedResponse {
  text: string;
  mood: Mood;
  actions: BotAction[];
  clarifyQuestion?: string;
}

function parseRawResponse(raw: string): ParsedResponse {
  let text = raw;
  const actions: BotAction[] = [];
  let mood: Mood = 'thinking';
  let clarifyQuestion: string | undefined;

  // Extract all [ACTION: {...}] blocks
  const actionRegex = /\[ACTION:\s*(\{.*?\})\s*\]/g;
  let match;
  while ((match = actionRegex.exec(raw)) !== null) {
    try {
      const action: BotAction = JSON.parse(match[1]);
      if (action.type === 'clarify') {
        clarifyQuestion = action.question;
      } else {
        actions.push(action);
      }
    } catch {
      // malformed JSON — skip
    }
  }

  // Extract [MOOD: xxx]
  const moodMatch = /\[MOOD:\s*(\w+)\s*\]/.exec(raw);
  if (moodMatch && MOODS.includes(moodMatch[1] as Mood)) {
    mood = moodMatch[1] as Mood;
  }

  // Strip all control tags from the visible text
  text = text
    .replace(/\[ACTION:\s*\{.*?\}\s*\]/g, '')
    .replace(/\[MOOD:\s*\w+\s*\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Fallback mood from text content
  if (mood === 'thinking' && !moodMatch) {
    mood = inferMoodFromText(text);
  }

  return { text: text || "Give me a sec...", mood, actions, clarifyQuestion };
}

// ─── Detect Intent for Auto-Context ───────────────────────────────────────────

function detectIntent(message: string): { needsVault: boolean; needsTimetable: boolean; needsNotes: boolean; analyzeFile?: string; analyzeAll: boolean } {
  const m = message.toLowerCase();

  const needsVault = /vault|file|pdf|document|upload|image|photo|video|download|storage|folder/i.test(m) ||
    /analyze|analyse|scan|check my files|mere files|meri files/i.test(m) ||
    m.includes('/analyze-file') || m.includes('/list-vault');

  const needsTimetable = /timetable|schedule|task|todo|plan|routine|time|slot|arrange|clear|add task|delete task/i.test(m) ||
    /kab|kitne baje|schedule bana|plan bana|arrange kar/i.test(m) ||
    m.includes('/arrange-timetable') || m.includes('/clear-timetable');

  const needsNotes = /note|notes|write|save|memo|jot|likhna|likho|summary|summarize/i.test(m) ||
    m.includes('/list-notes') || m.includes('/rename-note');

  const analyzeAll = /analyze all|analyse all|scan all|sab files|all pdf|saari pdf|sab pdf/i.test(m) ||
    m.includes('/analyze-all');

  // Detect specific file analysis
  let analyzeFile: string | undefined;
  const analyzeMatch = m.match(/(?:analyze|analyse|scan|check|open|read)\s+(?:file\s+)?["']?([^"'\n]+?)["']?\s*$/i) ||
    m.match(/\/analyze-file\s+(.+)/i);
  if (analyzeMatch) analyzeFile = analyzeMatch[1].trim();

  return { needsVault, needsTimetable, needsNotes, analyzeFile, analyzeAll };
}

// ─── Main Entry Point ──────────────────────────────────────────────────────────

export async function getAuraBotResponse(
  userId: string,
  partnerId: string,
  userMessage: string,
  imageBase64?: string,
  fileUrl?: string,
  historyOverride?: any[],
  model: string = MODELS.FLASH
): Promise<BotResponse> {
  const MAX_RETRIES = 1;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const history = historyOverride || await fetchMemoryContext(userId, partnerId);

      // ─── Detect intent and gather relevant context ───────────────────
      const intent = detectIntent(userMessage);
      let contextBlock = '';

      // Always fetch vault context for awareness (lightweight)
      const [vaultCtx, timetableCtx, notesCtx] = await Promise.all([
        intent.needsVault || intent.analyzeFile || intent.analyzeAll
          ? fetchVaultContext(userId)
          : Promise.resolve(''),
        intent.needsTimetable ? fetchTimetableContext(userId) : Promise.resolve(''),
        intent.needsNotes ? fetchNotesContext(userId) : Promise.resolve(''),
      ]);

      if (vaultCtx) contextBlock += `\n[VAULT_CONTEXT: ${vaultCtx}]\n`;
      if (timetableCtx) contextBlock += `\n[TIMETABLE_CONTEXT: ${timetableCtx}]\n`;
      if (notesCtx) contextBlock += `\n[NOTES_CONTEXT: ${notesCtx}]\n`;

      // ─── Deep file analysis if requested ────────────────────────────
      if (intent.analyzeAll) {
        const allAnalysis = await analyzeAllVaultFiles(userId);
        contextBlock += `\n[VAULT_ANALYSIS: ${allAnalysis}]\n`;
      } else if (intent.analyzeFile) {
        const fileAnalysis = await analyzeVaultFile(userId, intent.analyzeFile);
        contextBlock += `\n[PDF_CONTENT: ${fileAnalysis}]\n`;
      }

      // ─── Build message content ──────────────────────────────────────
      let messageContent: any = contextBlock
        ? `${contextBlock}\n\nUser message: ${userMessage}`
        : userMessage;

      if (imageBase64) {
        messageContent = [
          { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } },
          { type: 'text', text: contextBlock ? `${contextBlock}\n\n${userMessage || 'Analyse this image.'}` : (userMessage || 'Analyse this image.') },
        ];
      } else if (fileUrl) {
        // Try to extract PDF content from the file URL
        let fileContent = '';
        if (fileUrl.toLowerCase().includes('.pdf') || userMessage.toLowerCase().includes('pdf')) {
          fileContent = await extractPdfText(fileUrl);
        }
        messageContent = contextBlock
          ? `${contextBlock}\n\n[FILE_URL: ${fileUrl}]${fileContent ? '\n[PDF_CONTENT: ' + fileContent + ']' : ''}\n\nUser message: ${userMessage || 'Analyse this file.'}`
          : `[FILE_URL: ${fileUrl}]${fileContent ? '\n[PDF_CONTENT: ' + fileContent + ']' : ''}\n${userMessage || 'Analyse this file.'}`;
      }

      // ─── Call AI ────────────────────────────────────────────────────
      const { data, error: invokeError } = await supabase.functions.invoke('aurabot-llm', {
        body: {
          messages: [
            { role: 'system', content: AURA_SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: messageContent }
          ],
          hasImage: !!imageBase64,
          model: model === MODELS.PRO ? 'meta/llama-3.1-405b-instruct' : 'meta/llama-3.1-70b-instruct'
        }
      });

      if (invokeError) {
        console.error('[EdgeFunction Error]', invokeError);
        throw new Error(`AI Service Error: ${invokeError.message}`);
      }

      const rawText: string = data?.text || '';
      const { text, mood, actions, clarifyQuestion } = parseRawResponse(rawText);

      // If bot is clarifying, don't execute any actions yet
      if (clarifyQuestion) {
        return {
          text: clarifyQuestion,
          mood: 'confused',
          pendingConfirmation: undefined,
        };
      }

      // Execute confirmed actions
      if (actions.length > 0) {
        const results = await dispatchActions(actions, userId);
        // If actions produced results, we can append them as confirmation
        if (results.length > 0) {
          console.log('[AuraBot Actions Executed]', results);
        }
      }

      return { text, mood, actions };

    } catch (error: any) {
      console.error(`[AuraBot] Attempt ${attempt + 1} failed:`, error.message);
      attempt++;

      if (attempt > MAX_RETRIES) {
        return {
          text: "Kuch gadbad ho gayi, ek second mein dobara try karo.",
          mood: 'confused',
        };
      }

      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }

  return { text: "Something went wrong.", mood: 'sad' };
}
