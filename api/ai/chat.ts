// api/ai/chat.ts
// ─────────────────────────────────────────────────────────────────────────────
// AuraBot backend route — proxies to NVIDIA API with system prompt injection.
// Keeping API key server-side so it is never exposed to the client.
// ─────────────────────────────────────────────────────────────────────────────

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY_PRIMARY;
const NVIDIA_BASE    = 'https://integrate.api.nvidia.com/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface RequestBody {
  systemPrompt?: string;
  messages: ChatMessage[];
  model?: string;
  userId: string;
  partnerId: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { systemPrompt, messages, userId }: RequestBody = req.body;

  if (!messages || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!NVIDIA_API_KEY) {
    return res.status(500).json({ error: 'NVIDIA_API_KEY not configured in environment' });
  }

  try {
    // 1. Detect if any message contains an image
    const hasImage = messages.some(m => 
      Array.isArray(m.content) && m.content.some(part => (part as any).type === 'image_url')
    );

    // 2. Select model based on content (Vision vs Text)
    // Using the 11B Vision model specified in user snippet for multimodal tasks
    const selectedModel = hasImage 
      ? 'meta/llama-3.2-11b-vision-instruct' 
      : 'meta/llama-3.1-70b-instruct';

    // 3. Format messages for NVIDIA (OpenAI compatible)
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : m.role,
      content: m.content
    }));

    // 4. Inject system prompt at the start
    if (systemPrompt) {
      formattedMessages.unshift({ role: 'system', content: systemPrompt } as any);
    }

    // 5. Call NVIDIA API
    const nvidiaRes = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: formattedMessages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!nvidiaRes.ok) {
      const errBody = await nvidiaRes.json().catch(() => ({}));
      console.error('[NVIDIA API Error]', errBody);
      return res.status(nvidiaRes.status).json({
        error: errBody?.error?.message || 'NVIDIA API error',
      });
    }

    const data = await nvidiaRes.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      return res.status(200).json({ text: "Mujhe samajh nahi aaya, dobara try karo." });
    }

    return res.status(200).json({ text });

  } catch (err: any) {
    console.error('[Chat API Error]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
