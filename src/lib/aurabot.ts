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
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

const MOODS = ['happy', 'sad', 'angry', 'confused', 'surprised', 'thinking', 'heart_eyes', 'magic', 'cool'] as const;

function cleanAssistantText(text: string): string {
  return text.replace(/```json[\s\S]*?```/gi, '').trim();
}

function inferMoodFromText(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('sorry') || lower.includes('sad') || lower.includes('tough')) return 'sad';
  if (lower.includes('great') || lower.includes('awesome') || lower.includes('nice')) return 'happy';
  if (lower.includes('think') || lower.includes('analyze') || lower.includes('step')) return 'thinking';
  if (lower.includes('love') || lower.includes('proud')) return 'heart_eyes';
  if (lower.includes('wow') || lower.includes('amazing')) return 'surprised';
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

async function callNvidiaChat(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
}) {
  const resp = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      temperature: params.model === PRIMARY_MODEL ? 0.15 : 0.7,
      top_p: 0.95,
      max_tokens: 1200,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`NVIDIA API failed (${resp.status}): ${text.slice(0, 300)}`);
  }
  const json = await resp.json();
  return String(json?.choices?.[0]?.message?.content || '').trim();
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
  const primaryKey = import.meta.env.VITE_NVIDIA_API_KEY_PRIMARY || '';
  const secondaryKey = import.meta.env.VITE_NVIDIA_API_KEY_SECONDARY || '';

  if (!primaryKey && !secondaryKey) {
    return {
      text: 'NVIDIA API key missing hai. `.env` me `VITE_NVIDIA_API_KEY_PRIMARY` / `VITE_NVIDIA_API_KEY_SECONDARY` set karo.',
      mood: 'confused',
    };
  }

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
${memory.note || '(empty)'}

User timetable tasks:
${JSON.stringify(memory.tasks, null, 2)}

User vault items metadata:
${JSON.stringify(memory.vault, null, 2)}

If user asks file analysis and only filenames are available, be explicit about limits and still provide useful suggestions.
`;

  let raw = '';
  let usedModel = PRIMARY_MODEL;

  try {
    raw = await callNvidiaChat({
      apiKey: primaryKey || secondaryKey,
      model: PRIMARY_MODEL,
      systemPrompt,
      userPrompt,
    });
  } catch {
    usedModel = FALLBACK_MODEL;
    raw = await callNvidiaChat({
      apiKey: secondaryKey || primaryKey,
      model: FALLBACK_MODEL,
      systemPrompt,
      userPrompt,
    });
  }

  const actions = extractActions(raw);
  if (actions.length > 0) {
    await executeActions(params.userId, actions);
  }

  const text = cleanAssistantText(raw) || 'Done. Mainne tumhari request process kar di ✅';
  const declaredMood = (() => {
    const m = raw.match(/"mood"\s*:\s*"([^"]+)"/i)?.[1] || '';
    return MOODS.includes(m as (typeof MOODS)[number]) ? m : '';
  })();

  return {
    text: `${text}\n\n(model: ${usedModel.split('/').pop()})`,
    mood: declaredMood || inferMoodFromText(text),
  };
}
