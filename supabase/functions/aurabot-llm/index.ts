// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const PRIMARY_MODEL = 'moonshotai/kimi-k2.6';
const VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function callNvidia(apiKey: string, model: string, messages: any[]) {
  const isKimi = model.includes('kimi');
  const payload: any = {
    model,
    messages,
    temperature: 1.0,
    top_p: 1.0,
    max_tokens: 16384,
    stream: false,
  };

  if (isKimi) {
    payload.chat_template_kwargs = { thinking: true };
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
    // Return status so we can handle retries
    return { error: true, status: response.status, message: errText };
  }

  const json = await response.json();
  return { error: false, content: String(json?.choices?.[0]?.message?.content || '').trim() };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, hasImage, model: reqModel } = (await req.json());
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid messages array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // List of potential API keys in order of priority
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
      .map(name => Deno.env.get(name))
      .filter(key => !!key);

    if (availableKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No NVIDIA API keys found in Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const model = hasImage ? VISION_MODEL : (reqModel || PRIMARY_MODEL);
    let lastError = '';
    
    // Try each available key
    for (const apiKey of availableKeys) {
      try {
        const result = await callNvidia(apiKey, model, messages);
        if (!result.error) {
          return new Response(
            JSON.stringify({ text: result.content, model }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        lastError = `Key failed (${result.status}): ${result.message.slice(0, 100)}`;
        console.warn(`[AuraBot] Key failed, trying next...`, lastError);
      } catch (err) {
        lastError = (err as Error).message;
        console.error(`[AuraBot] Exception with key:`, lastError);
      }
    }

    return new Response(
      JSON.stringify({ error: `All ${availableKeys.length} keys failed. Last error: ${lastError}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
    
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
