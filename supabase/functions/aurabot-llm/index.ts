// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const PRIMARY_MODEL = 'meta/llama-3.1-70b-instruct';
const VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function callNvidia(apiKey: string, model: string, messages: any[]) {
  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1024,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`NVIDIA ${model} failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const json = await response.json();
  return String(json?.choices?.[0]?.message?.content || '').trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, hasImage } = (await req.json());
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid messages array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('NVIDIA_API_KEY') || Deno.env.get('NVIDIA_API_KEY_PRIMARY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'NVIDIA_API_KEY missing in Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const model = hasImage ? VISION_MODEL : PRIMARY_MODEL;
    
    const content = await callNvidia(apiKey, model, messages);
    return new Response(
      JSON.stringify({ text: content, model }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
    
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
