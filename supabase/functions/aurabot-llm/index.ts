// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const PRIMARY_MODEL = 'mistralai/devstral-2-123b-instruct-2512';
const FALLBACK_MODEL = 'minimaxai/minimax-m2.7';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ReqBody = {
  systemPrompt: string;
  userPrompt: string;
};

async function callNvidia(apiKey: string, model: string, systemPrompt: string, userPrompt: string) {
  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: model === PRIMARY_MODEL ? 0.15 : 1,
      top_p: 0.95,
      max_tokens: 1200,
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
    const { systemPrompt, userPrompt } = (await req.json()) as ReqBody;
    if (!systemPrompt || !userPrompt) {
      return new Response(
        JSON.stringify({ error: 'Missing systemPrompt/userPrompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const primaryKey = Deno.env.get('NVIDIA_API_KEY_PRIMARY') || '';
    const secondaryKey = Deno.env.get('NVIDIA_API_KEY_SECONDARY') || '';
    if (!primaryKey && !secondaryKey) {
      return new Response(
        JSON.stringify({ error: 'NVIDIA keys missing in Supabase secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    try {
      const content = await callNvidia(primaryKey || secondaryKey, PRIMARY_MODEL, systemPrompt, userPrompt);
      return new Response(
        JSON.stringify({ content, model: PRIMARY_MODEL }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (primaryErr) {
      const content = await callNvidia(secondaryKey || primaryKey, FALLBACK_MODEL, systemPrompt, userPrompt);
      return new Response(
        JSON.stringify({
          content,
          model: FALLBACK_MODEL,
          primaryError: (primaryErr as Error)?.message || 'primary failed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error)?.message || 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
