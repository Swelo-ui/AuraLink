// api/ai/chat.ts
// ─────────────────────────────────────────────────────────────────────────────
// AuraBot backend route — proxies to NVIDIA API with system prompt injection.
// Keeping API key server-side so it is never exposed to the client.
// ─────────────────────────────────────────────────────────────────────────────

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const PRIMARY_MODEL = 'stepfun-ai/step-3.5-flash';
const VISION_MODEL = 'mistralai/mistral-large-3-675b-instruct-2512';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function callNvidia(apiKey: string, model: string, messages: any[]) {
  const isMistral = model.includes('mistral');
  const payload: any = {
    model,
    messages,
    temperature: isMistral ? 0.15 : 1.0,
    top_p: isMistral ? 1.0 : 0.9,
    max_tokens: isMistral ? 2048 : 16384,
    stream: false,
  };

  if (isMistral) {
    payload.frequency_penalty = 0.0;
    payload.presence_penalty = 0.0;
  }

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    return { error: true, status: response.status, message: errText };
  }

  const json = await response.json();
  const msg = json.choices?.[0]?.message || {};
  const reasoning = msg.reasoning_content || '';
  const content = msg.content || '';
  
  // Combine reasoning and content if reasoning exists
  const text = reasoning ? `${reasoning}\n\n${content}` : content;
  
  return { error: false, content: { ...json, choices: [{ ...json.choices[0], message: { ...msg, content: text } }] } };
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

  // Get all potential keys
  const keyNames = [
    'NVIDIA_API_KEY',
    'NVIDIA_API_KEY_PRIMARY',
    'NVIDIA_API_KEY_SECONDARY',
    'NVIDIA_API_KEY_BACKUP',
    'NVIDIA_API_KEY_AUX',
    'NVIDIA_API_KEY_1',
    'NVIDIA_API_KEY_2',
    'NVIDIA_API_KEY_3'
  ];

  const availableKeys = keyNames
    .map(name => process.env[name])
    .filter(key => !!key) as string[];

  if (availableKeys.length === 0) {
    return res.status(500).json({ error: 'No NVIDIA API keys configured in environment' });
  }

  try {
    // 1. Detect if any message contains an image
    const hasImage = messages.some(m => 
      Array.isArray(m.content) && m.content.some(part => (part as any).type === 'image_url')
    );

    // 2. Select model based on content
    const selectedModel = hasImage 
      ? VISION_MODEL 
      : PRIMARY_MODEL;

    // 3. Format messages
    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : m.role,
      content: m.content
    }));

    if (systemPrompt) {
      formattedMessages.unshift({ role: 'system', content: systemPrompt } as any);
    }

    let lastError = '';
    const modelsToTry = [selectedModel];
    if (selectedModel !== VISION_MODEL) {
      modelsToTry.push(VISION_MODEL);
    }
    
    // 4. Try models and keys until success
    for (const targetModel of modelsToTry) {
      for (const apiKey of availableKeys) {
        try {
          const result = await callNvidia(apiKey, targetModel, formattedMessages);
          
          if (!result.error) {
            const data = result.content;
            const text = data.choices?.[0]?.message?.content || '';

            if (!text) {
              return res.status(200).json({ text: "Mujhe samajh nahi aaya, dobara try karo." });
            }

            return res.status(200).json({ text });
          }
          
          lastError = `${targetModel} key failed (${result.status}): ${result.message.slice(0, 100)}`;
          console.warn(`[NVIDIA API] Key failed, trying next...`, lastError);
        } catch (err: any) {
          lastError = err.message;
          console.error(`[NVIDIA API] Exception:`, lastError);
        }
      }
    }

    return res.status(500).json({
      error: `All ${availableKeys.length} keys failed. Last error: ${lastError}`,
    });

  } catch (err: any) {
    console.error('[Chat API Error]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
