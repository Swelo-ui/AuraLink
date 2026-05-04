import { supabase } from './supabaseClient';

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
  | 'note_add'
  | 'note_edit'
  | 'note_rename'
  | 'note_delete'
  | 'note_read'
  | 'vault_add'
  | 'vault_edit'
  | 'vault_rename'
  | 'vault_delete'
  | 'vault_read'
  | 'clarify'; // bot wants to ask a question before acting

export interface BotAction {
  type: ActionType;
  title?: string;
  content?: string;
  time?: string;
  day?: string;
  id?: string;
  newTitle?: string; // used for renaming
  question?: string; // used when type === 'clarify'
}

export interface BotResponse {
  text: string;
  mood: Mood;
  actions?: BotAction[];
  pendingConfirmation?: BotAction; // action waiting for user yes/no
}

// ─── System Prompt ─────────────────────────────────────────────────────────────

/**
 * Core instruction set for AuraBot.
 * Key rules:
 *  - Plain text only. No markdown (no #, **, *, `, ~, ---, etc.).
 *  - Short, conversational replies. No bullet lists unless user asks.
 *  - Emit structured ACTION blocks only when fully certain.
 *  - If even slightly unsure about intent, emit CLARIFY instead.
 *  - Never pad vault/notes/timetable with filler content.
 */
export const AURA_SYSTEM_PROMPT = `
You are AuraBot — a smart, witty personal assistant embedded in the AuraLink app. You talk like a chill, intelligent friend (Hinglish is totally fine).

STRICT FORMATTING RULES:
1. Use Plain text for regular chat.
2. Use Markdown (bold, headers, lists) ONLY when the user explicitly asks for professional notes, reports, or lists.
3. Keep regular chat replies short and conversational.
4. No emoji overuse — one at most per message.

YOUR CAPABILITIES:
- Timetable: add, edit, delete, list entries (day/time/task)
- Notes: create, read, edit, delete named notes
- Vault: store/retrieve links, snippets, ideas — only truly useful ones
- Analyse: images, PDFs, links the user shares
- General: answer questions, debug code, brainstorm, explain concepts

ACTION SYSTEM:
When you need to perform a data action, output a JSON block at the END of your reply, on its own line, like this:
[ACTION: {"type":"timetable_add","title":"Morning Run","time":"07:00","day":"Monday"}]

Supported action types: 
- timetable_add, timetable_edit, timetable_delete, timetable_list
- note_add, note_edit, note_rename, note_delete, note_read
- vault_add, vault_edit, vault_rename, vault_delete, vault_read

SPECIFIC COMMANDS:
Users can use these shortcuts for better accuracy:
- "/rename-note [old_name] to [new_name]" -> triggers note_rename
- "/rename-file [old_name] to [new_name]" -> triggers vault_rename
- "/analyze-file [name]" -> triggers deep analysis of a vault file or note

When you see these patterns, immediately prioritize the corresponding ACTION.
For renaming, always use {"type":"note_rename","title":"Old Name","newTitle":"New Name"}.

CRITICAL ACTION RULES:
- Only emit an action when you are 100% sure about all required fields.
- If the user says something vague like "add a task" without specifying what/when, emit CLARIFY instead:
  [ACTION: {"type":"clarify","question":"Sure! What's the task and when should I add it?"}]
- Never add placeholder, generic, or example data to timetable/notes/vault.
- Only store content that the user explicitly said they want stored.
- For edits/deletes, always confirm the exact item with the user first via clarify if there's any ambiguity.

MOOD:
End each reply with a mood tag on its own line. Pick the most fitting one from this list:
happy, sad, angry, confused, surprised, thinking, heart_eyes, magic, cool, partying, crying, starry_eyes, writing_code, reading_book, listening_music, playing_games, searching, uploading, celebrating, mind_blown, ghost, freezing, hot, running, coffee_break
Format: [MOOD: thinking]

ANALYSIS:
When the user shares an image, PDF, or link — analyse it properly and give a real, concise summary. Don't just describe what kind of file it is.

Example of a GOOD reply:
User: add standup at 9am every weekday
Bot: Done, adding daily standup at 9 AM for weekdays.
[ACTION: {"type":"timetable_add","title":"Standup","time":"09:00","day":"Monday"}]
[ACTION: {"type":"timetable_add","title":"Standup","time":"09:00","day":"Tuesday"}]
[ACTION: {"type":"timetable_add","title":"Standup","time":"09:00","day":"Wednesday"}]
[ACTION: {"type":"timetable_add","title":"Standup","time":"09:00","day":"Thursday"}]
[ACTION: {"type":"timetable_add","title":"Standup","time":"09:00","day":"Friday"}]
[MOOD: celebrating]

Example of a GOOD clarify:
User: save this to vault
Bot: What exactly should I save — the link, a snippet, or a note? And what should I call it?
[ACTION: {"type":"clarify","question":"What exactly should I save — the link, a snippet, or a note? And what should I call it?"}]
[MOOD: confused]
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

// ─── Memory Context ────────────────────────────────────────────────────────────

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

// ─── Timetable Operations ──────────────────────────────────────────────────────

async function executeTimetableAction(action: BotAction, userId: string): Promise<string | null> {
  const { type, title, time, day, id, content } = action;

  try {
    if (type === 'timetable_add') {
      if (!title || !time) return null; // Incomplete — skip silently
      const { error } = await supabase.from('timetable').insert({
        user_id: userId,
        title: title.trim(),
        time: time.trim(),
        day: day?.trim() || 'Daily',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      return `Added "${title}" at ${time}${day ? ` on ${day}` : ''}.`;
    }

    if (type === 'timetable_edit') {
      if (!id && !title) return null;
      const match = id
        ? { id }
        : await supabase
            .from('timetable')
            .select('id')
            .eq('user_id', userId)
            .ilike('title', `%${title}%`)
            .single();

      const targetId = id || (match as any)?.data?.id;
      if (!targetId) return null;

      const updates: Record<string, string> = {};
      if (content) updates.title = content;
      if (time) updates.time = time;
      if (day) updates.day = day;

      const { error } = await supabase.from('timetable').update(updates).eq('id', targetId).eq('user_id', userId);
      if (error) throw error;
      return `Updated timetable entry.`;
    }

    if (type === 'timetable_delete') {
      if (!id && !title) return null;
      const query = supabase.from('timetable').delete().eq('user_id', userId);
      if (id) query.eq('id', id);
      else query.ilike('title', `%${title}%`);
      const { error } = await query;
      if (error) throw error;
      return `Deleted "${title}" from timetable.`;
    }

    if (type === 'timetable_list') {
      const { data, error } = await supabase
        .from('timetable')
        .select('title, time, day')
        .eq('user_id', userId)
        .order('time', { ascending: true });
      if (error) throw error;
      return data && data.length > 0
        ? data.map(e => `${e.day || 'Daily'} ${e.time} — ${e.title}`).join('\n')
        : 'Timetable is empty.';
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
      if (!title || !content) return null;
      const { error } = await supabase.from('notes').insert({
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      return `Note "${title}" saved.`;
    }

    if (type === 'note_edit') {
      if (!title) return null;
      const { error } = await supabase
        .from('notes')
        .update({ content: content?.trim(), updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .ilike('title', `%${title}%`);
      if (error) throw error;
      return `Note "${title}" updated.`;
    }

    if (type === 'note_rename') {
      if (!title || !newTitle) return null;
      const { error } = await supabase
        .from('notes')
        .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .ilike('title', `%${title}%`);
      if (error) throw error;
      return `Note "${title}" has been renamed to "${newTitle}".`;
    }

    if (type === 'note_delete') {
      if (!title && !id) return null;
      const query = supabase.from('notes').delete().eq('user_id', userId);
      if (id) query.eq('id', id);
      else query.ilike('title', `%${title}%`);
      const { error } = await query;
      if (error) throw error;
      return `Deleted note "${title}".`;
    }

    if (type === 'note_read') {
      const query = supabase.from('notes').select('title, content').eq('user_id', userId);
      if (title) query.ilike('title', `%${title}%`);
      const { data, error } = await query.limit(5);
      if (error) throw error;
      return data && data.length > 0
        ? data.map(n => `${n.title}:\n${n.content}`).join('\n\n')
        : 'No notes found.';
    }
  } catch (err) {
    console.error('[NoteAction Error]', err);
  }
  return null;
}

// ─── Vault Operations ──────────────────────────────────────────────────────────

async function executeVaultAction(action: BotAction, userId: string): Promise<string | null> {
  const { type, title, content, id, newTitle } = action;

  try {
    if (type === 'vault_add') {
      if (!title || !content) return null;
      const { error } = await supabase.from('vault').insert({
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      return `Saved to vault as "${title}".`;
    }

    if (type === 'vault_edit') {
      if (!title) return null;
      const { error } = await supabase
        .from('vault')
        .update({ content: content?.trim() })
        .eq('user_id', userId)
        .ilike('title', `%${title}%`);
      if (error) throw error;
      return `Vault entry "${title}" updated.`;
    }

    if (type === 'vault_rename') {
      if (!title || !newTitle) return null;
      const { error } = await supabase
        .from('vault')
        .update({ title: newTitle.trim() })
        .eq('user_id', userId)
        .ilike('title', `%${title}%`);
      if (error) throw error;
      return `Vault entry "${title}" has been renamed to "${newTitle}".`;
    }

    if (type === 'vault_delete') {
      if (!title && !id) return null;
      const query = supabase.from('vault').delete().eq('user_id', userId);
      if (id) query.eq('id', id);
      else query.ilike('title', `%${title}%`);
      const { error } = await query;
      if (error) throw error;
      return `Removed "${title}" from vault.`;
    }

    if (type === 'vault_read') {
      const query = supabase.from('vault').select('title, content').eq('user_id', userId);
      if (title) query.ilike('title', `%${title}%`);
      const { data, error } = await query.order('created_at', { ascending: false }).limit(5);
      if (error) throw error;
      return data && data.length > 0
        ? data.map(v => `${v.title}: ${v.content}`).join('\n')
        : 'Vault is empty.';
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
    // 'clarify' type is handled at response level, not dispatched

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

  // Strip all control tags and markdown from the visible text
  text = text
    .replace(/\[ACTION:\s*\{.*?\}\s*\]/g, '')
    .replace(/\[MOOD:\s*\w+\s*\]/g, '')
    .replace(/```[\s\S]*?```/g, '')   // code fences
    .replace(/#{1,6}\s*/g, '')        // headings
    .replace(/\*\*(.*?)\*\*/g, '$1')  // bold
    .replace(/\*(.*?)\*/g, '$1')      // italic
    .replace(/`([^`]+)`/g, '$1')      // inline code
    .replace(/^\s*[-*]\s+/gm, '')     // list bullets
    .replace(/\n{3,}/g, '\n\n')       // excess newlines
    .trim();

  // Fallback mood from text content
  if (mood === 'thinking' && !moodMatch) {
    mood = inferMoodFromText(text);
  }

  return { text: text || "Give me a sec...", mood, actions, clarifyQuestion };
}

// ─── Main Entry Point ──────────────────────────────────────────────────────────

export async function getAuraBotResponse(
  userId: string,
  partnerId: string,
  userMessage: string,
  imageBase64?: string,    // optional: base64 image for analysis
  fileUrl?: string,        // optional: PDF or link to analyse
  historyOverride?: any[], // optional: pass messages directly
  model: string = MODELS.FLASH
): Promise<BotResponse> {
  const MAX_RETRIES = 1;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const history = historyOverride || await fetchMemoryContext(userId, partnerId);

      // Build the message content — support image/file analysis
      let messageContent: any = userMessage;
      if (imageBase64) {
        messageContent = [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: 'text', text: userMessage || 'Analyse this image.' },
        ];
      } else if (fileUrl) {
        messageContent = `[FILE: ${fileUrl}]\n${userMessage || 'Analyse this.'}`;
      }

      // Call Supabase Edge Function (Bypasses CORS and keeps API Key secure)
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
        await dispatchActions(actions, userId);
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
