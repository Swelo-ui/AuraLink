import { supabase } from './supabaseClient';

type ChatMsg = {
  senderId: string;
  content: string;
  type: string;
  timestamp: string;
};

type AuraAction =
  | { type: 'add_timetable_task'; title: string }
  | { type: 'toggle_timetable_task'; title: string; status?: 'todo' | 'done' }
  | { type: 'delete_timetable_task'; title: string }
  | { type: 'append_note'; text: string }
  | { type: 'replace_note'; text: string }
  | { type: 'add_vault_item_text'; name: string; content: string };

type AuraResult = {
  text: string;
  mood: string;
};

const PRIMARY_MODEL = 'mistralai/devstral-2-123b-instruct-2512';
const FALLBACK_MODEL = 'minimaxai/minimax-m2.7';
const MOODS = ['happy', 'sad', 'angry', 'confused', 'surprised', 'thinking', 'heart_eyes', 'magic', 'cool', 'partying', 'crying', 'starry_eyes', 'writing_code', 'reading_book', 'listening_music', 'playing_games', 'searching', 'uploading', 'celebrating'] as const;
function cleanAssistantText(text: string): string {
  return text.replace(/```json[\s\S]*?```/gi, '').trim();
}

function inferMoodFromText(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('search') || lower.includes('find') || lower.includes('look for')) return 'searching';
  if (lower.includes('code') || lower.includes('debug') || lower.includes('function')) return 'writing_code';
  if (lower.includes('upload') || lower.includes('file') || lower.includes('save')) return 'uploading';
  if (lower.includes('read') || lower.includes('study') || lower.includes('learn')) return 'reading_book';
  if (lower.includes('congratulations') || lower.includes('yay') || lower.includes('celebrate') || lower.includes('woohoo')) return 'celebrating';
  if (lower.includes('sorry') || lower.includes('sad') || lower.includes('tough')) return 'sad';
  if (lower.includes('great') || lower.includes('awesome') || lower.includes('nice')) return 'happy';
  if (lower.includes('think') || lower.includes('analyze') || lower.includes('step')) return 'thinking';
  if (lower.includes('love') || lower.includes('proud')) return 'heart_eyes';
  if (lower.includes('wow') || lower.includes('amazing')) return 'surprised';
  if (lower.includes('play') || lower.includes('game')) return 'playing_games';
  if (lower.includes('music') || lower.includes('song') || lower.includes('listen')) return 'listening_music';
  return 'happy';
}

function extractActions(raw: string): AuraAction[] {
  const match = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/\{[\s\S]*"actions"[\s\S]*\}/i);
  if (!match) return [];
  const payload = match[1] || match[0];
  try {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed.actions)) return [];
    return parsed.actions as AuraAction[];
  } catch {
    return [];
  }
}

function sanitizeAction(action: AuraAction): AuraAction | null {
  const banned = new Set(['ok add', 'add', 'task', 'todo', 'note', 'vault']);
  const normalize = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();

  if (action.type === 'add_timetable_task' || action.type === 'toggle_timetable_task' || action.type === 'delete_timetable_task') {
    const title = normalize(action.title || '');
    if (!title || title.length < 3 || banned.has(title)) return null;
  }
  if ((action.type === 'append_note' || action.type === 'replace_note') && (!action.text || action.text.trim().length < 3)) {
    return null;
  }
  if (action.type === 'add_vault_item_text') {
    const name = normalize(action.name || '');
    const content = (action.content || '').trim();
    if (!name || !content || banned.has(name)) return null;
  }
  return action;
}

function getAllowedActionTypes(userMessage: string): Set<AuraAction['type']> {
  const msg = userMessage.toLowerCase();
  const allowed = new Set<AuraAction['type']>();

  const taskIntent =
    /(add|create|make|plan|schedule|set)\b.*\b(task|todo|timetable|plan)\b/.test(msg) ||
    /\b(mark|complete|done|delete|remove)\b.*\b(task|todo|timetable)\b/.test(msg);
  const noteIntent =
    /\b(add|append|write|save|replace|update|summarize)\b.*\b(note|notes)\b/.test(msg);
  const vaultIntent =
    /\b(save|store|add|remember)\b.*\b(vault|secret|password|credential)\b/.test(msg);

  if (taskIntent) {
    allowed.add('add_timetable_task');
    allowed.add('toggle_timetable_task');
    allowed.add('delete_timetable_task');
  }
  if (noteIntent) {
    allowed.add('append_note');
    allowed.add('replace_note');
  }
  if (vaultIntent) {
    allowed.add('add_vault_item_text');
  }

  return allowed;
}

async function fetchMemoryContext(userId: string) {
  const [notesRes, tasksRes, vaultRes] = await Promise.all([
    supabase
      .from('notes')
      .select('content, updated_at')
      .eq('user_id', userId)
      .is('connection_id', null)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase
      .from('timetables')
      .select('title, status')
      .eq('user_id', userId)
      .is('connection_id', null)
      .order('id', { ascending: false })
      .limit(20),
    supabase
      .from('vault_items')
      .select('name, type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    note: notesRes.data?.[0]?.content || '',
    tasks: tasksRes.data || [],
    vault: vaultRes.data || [],
  };
}

async function callAuraBotLLM(systemPrompt: string, userPrompt: string): Promise<{ content: string; model: string }> {
  const { data, error } = await supabase.functions.invoke('aurabot-llm', {
    body: { systemPrompt, userPrompt },
  });

  if (error) {
    throw new Error(error.message || 'Supabase Edge Function invoke failed');
  }
  if (!data?.content) {
    throw new Error(data?.error || 'AuraBot function returned empty content');
  }

  return {
    content: String(data.content),
    model: String(data.model || FALLBACK_MODEL),
  };
}

async function executeActions(userId: string, actions: AuraAction[]) {
  for (const action of actions) {
    if (action.type === 'add_timetable_task' && action.title?.trim()) {
      await supabase.from('timetables').insert([{ user_id: userId, connection_id: null, title: action.title.trim(), status: 'todo' }]);
      continue;
    }
    if (action.type === 'toggle_timetable_task' && action.title?.trim()) {
      const { data } = await supabase
        .from('timetables')
        .select('id, status')
        .eq('user_id', userId)
        .is('connection_id', null)
        .ilike('title', action.title.trim())
        .limit(1);
      const row = data?.[0];
      if (row) {
        const next = action.status || (row.status === 'done' ? 'todo' : 'done');
        await supabase.from('timetables').update({ status: next }).eq('id', row.id);
      }
      continue;
    }
    if (action.type === 'delete_timetable_task' && action.title?.trim()) {
      await supabase
        .from('timetables')
        .delete()
        .eq('user_id', userId)
        .is('connection_id', null)
        .ilike('title', action.title.trim());
      continue;
    }
    if (action.type === 'append_note' && action.text?.trim()) {
      const { data } = await supabase
        .from('notes')
        .select('id, content')
        .eq('user_id', userId)
        .is('connection_id', null)
        .limit(1);
      const existing = data?.[0];
      if (existing) {
        const merged = `${existing.content || ''}\n\n${action.text.trim()}`.trim();
        await supabase.from('notes').update({ content: merged, last_edited_by: userId }).eq('id', existing.id);
      } else {
        await supabase.from('notes').insert([{ user_id: userId, connection_id: null, content: action.text.trim(), last_edited_by: userId }]);
      }
      continue;
    }
    if (action.type === 'replace_note' && action.text?.trim()) {
      const { data } = await supabase
        .from('notes')
        .select('id')
        .eq('user_id', userId)
        .is('connection_id', null)
        .limit(1);
      const existing = data?.[0];
      if (existing) {
        await supabase.from('notes').update({ content: action.text.trim(), last_edited_by: userId }).eq('id', existing.id);
      } else {
        await supabase.from('notes').insert([{ user_id: userId, connection_id: null, content: action.text.trim(), last_edited_by: userId }]);
      }
      continue;
    }
    if (action.type === 'add_vault_item_text' && action.name?.trim() && action.content?.trim()) {
      await supabase.from('vault_items').insert([
        {
          user_id: userId,
          name: action.name.trim(),
          content: action.content.trim(),
          type: 'secret',
        },
      ]);
    }
  }
}

export async function getAuraBotResponse(params: {
  userId: string;
  username: string;
  userMessage: string;
  messages: ChatMsg[];
}) : Promise<AuraResult> {
  const memory = await fetchMemoryContext(params.userId);
  const recent = params.messages.slice(-20).map((m) => ({
    role: m.senderId === params.userId ? 'user' : 'assistant',
    content: m.type === 'file' ? `[FILE] ${m.content}` : m.content,
  }));

  const systemPrompt = `
You are AuraBot, an empathetic productivity + coding assistant in AuraLink.
User name: ${params.username}
Allowed moods: ${MOODS.join(', ')}.

You can optionally emit JSON actions inside a \`\`\`json code block:
{
  "mood": "thinking",
  "actions": [
    {"type":"add_timetable_task","title":"..."},
    {"type":"toggle_timetable_task","title":"...","status":"done"},
    {"type":"delete_timetable_task","title":"..."},
    {"type":"append_note","text":"..."},
    {"type":"replace_note","text":"..."},
    {"type":"add_vault_item_text","name":"...","content":"..."}
  ]
}
Only use actions when user explicitly asks for create/update/delete.
Also return a normal friendly response outside JSON.
`;

  const userPrompt = `
User latest message:
${params.userMessage}

Recent chat memory:
${JSON.stringify(recent, null, 2)}

User personal note (latest):
${(memory.note || '(empty)').slice(0, 1000)}

User timetable tasks:
${JSON.stringify((memory.tasks || []).slice(0, 12), null, 2)}

User vault items metadata:
${JSON.stringify((memory.vault || []).slice(0, 12), null, 2)}

If user asks file analysis and only filenames are available, be explicit about limits and still provide useful suggestions.
`;

  const llm = await callAuraBotLLM(systemPrompt, userPrompt);
  const raw = llm.content;
  const usedModel = llm.model;

  const allowedActionTypes = getAllowedActionTypes(params.userMessage);
  const actions = extractActions(raw)
    .map(sanitizeAction)
    .filter((a): a is AuraAction => Boolean(a))
    .filter((a) => allowedActionTypes.has(a.type));

  if (actions.length > 0) {
    await executeActions(params.userId, actions);
  }

  const text = cleanAssistantText(raw) || 'Done. Mainne tumhari request process kar di ✅';
  const declaredMood = (() => {
    const m = raw.match(/"mood"\s*:\s*"([^"]+)"/i)?.[1] || '';
    return MOODS.includes(m as (typeof MOODS)[number]) ? m : '';
  })();

  return {
    text,
    mood: declaredMood || inferMoodFromText(text),
  };
}
