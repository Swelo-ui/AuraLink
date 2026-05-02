import { supabase } from './supabaseClient';

// ─── Constants & Types ─────────────────────────────────────────────────────────

// Updated Models (User can toggle between Pro and Flash)
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

interface BotResponse {
  text: string;
  mood: Mood;
}

// ─── Utility: Mood Inference ───────────────────────────────────────────────────

/**
 * Advanced keyword matching including Hinglish for real-time mood sync.
 * This ensures the bot's avatar matches its task (e.g. coding, searching).
 */
export function inferMoodFromText(text: string): Mood {
  const t = text.toLowerCase();
  
  if (/search|find|look for|dhund|khoj|talaash/.test(t)) return 'searching';
  if (/upload|bhej|share kar|send kar/.test(t)) return 'uploading';
  if (/code|debug|function|script|fix kar|program|error/.test(t)) return 'writing_code';
  if (/book|read|padh|study/.test(t)) return 'reading_book';
  if (/game|play|khel|pubg|valorant/.test(t)) return 'playing_games';
  if (/music|song|gaana|suno|listen/.test(t)) return 'listening_music';
  if (/party|celebrate|wow|party kar|nacho/.test(t)) return 'celebrating';
  if (/hot|garam|pasina/.test(t)) return 'hot';
  if (/cold|thand|freeze|baraf/.test(t)) return 'freezing';
  if (/coffee|chai|break|tea/.test(t)) return 'coffee_break';
  if (/run|bhag|fast|jaldi/.test(t)) return 'running';
  if (/ghost|gayab|invisible/.test(t)) return 'ghost';
  if (/mind blown|shock|impossible|unbelievable/.test(t)) return 'mind_blown';
  
  if (/happy|smile|khush|maza|best|love|amazing/.test(t)) return 'happy';
  if (/sad|cry|dukh|sorry|bad|rona/.test(t)) return 'sad';
  if (/angry|gussa|hate|shut up/.test(t)) return 'angry';
  if (/confused|what|kyu|why|huh|pata nahi/.test(t)) return 'confused';
  if (/surprised|oh|wow|shock|kya/.test(t)) return 'surprised';
  if (/magic|super|power|shakti/.test(t)) return 'magic';
  if (/cool|swag|style|hero/.test(t)) return 'cool';
  
  return 'thinking';
}

// ─── Memory & Context Fetching ─────────────────────────────────────────────────

async function fetchMemoryContext(userId: string, partnerId: string) {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('content, sender_id, created_at')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    
    // Reverse to chronological order
    return (messages || []).reverse().map(m => ({
      role: m.sender_id === partnerId ? 'user' : 'assistant',
      content: m.content
    }));
  } catch (err) {
    console.error('[MemoryFetchError]', err);
    return [];
  }
}

// ─── Action Execution ──────────────────────────────────────────────────────────

/**
 * Sanitizes and executes tool calls found in the bot's response.
 * Blocks non-descriptive or generic titles.
 */
async function executeActions(text: string) {
  const actionRegex = /\[ACTION:\s*(.*?)\s*\]/g;
  let match;
  
  while ((match = actionRegex.exec(text)) !== null) {
    const actionStr = match[1];
    try {
      const action = JSON.parse(actionStr);
      
      // Safety: Ignore generic tool names
      if (!action.title || /task|new|action|thing/.test(action.title.toLowerCase())) {
        continue;
      }

      // Execute based on action type
      if (action.type === 'timetable') {
        // Logic to update user's timetable
        console.log('[BotAction] Updating Timetable:', action.title);
      } else if (action.type === 'note') {
        // Logic to save a note
        console.log('[BotAction] Saving Note:', action.title);
      }
    } catch (e) {
      // Not valid JSON, skip
    }
  }
}

// ─── Main AI Response Entry ────────────────────────────────────────────────────

/**
 * Fetches AI response with robust error handling and retry logic.
 */
export async function getAuraBotResponse(
  userId: string,
  partnerId: string,
  userMessage: string,
  model: string = MODELS.FLASH
): Promise<BotResponse> {
  
  const MAX_RETRIES = 1;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const history = await fetchMemoryContext(userId, partnerId);
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: userMessage }],
          model: model,
          userId,
          partnerId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.text || '';
      
      // 1. Execute any actions detected in text
      executeActions(rawText);

      // 2. Extract mood (from JSON block if provided, else infer)
      let mood: Mood = 'thinking';
      const moodMatch = /"mood":\s*"(\w+)"/.exec(rawText);
      
      if (moodMatch && MOODS.includes(moodMatch[1] as Mood)) {
        mood = moodMatch[1] as Mood;
      } else {
        mood = inferMoodFromText(rawText);
      }

      // 3. Clean text (strip JSON/Metadata blocks)
      const cleanText = rawText
        .replace(/```json[\s\S]*?```/g, '') // Remove JSON blocks
        .replace(/\[ACTION:.*?\]/g, '')     // Remove Action tags
        .trim();

      return { text: cleanText || "I'm thinking...", mood };

    } catch (error: any) {
      console.error(`[AuraBot] Attempt ${attempt + 1} failed:`, error.message);
      attempt++;
      
      if (attempt > MAX_RETRIES) {
        return {
          text: "Mera brain thoda slow chal raha hai abhi. Can you try again in a second? 😅",
          mood: 'confused'
        };
      }
      
      // Exponential backoff
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }

  return { text: "Something went wrong...", mood: 'sad' };
}
