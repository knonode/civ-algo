import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText } from 'ai';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const origin = (req.headers.origin as string | undefined) ?? '';
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'https://civ-algo.vercel.app',
  ]);
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { messages } = req.body as { messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> };
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid body: { messages } required' });
      return;
    }

    const hasGateway = Boolean(process.env.AI_GATEWAY_API_KEY);
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    if (!hasGateway && !hasOpenAI) {
      res.status(500).json({ error: 'Missing API configuration. Set AI_GATEWAY_API_KEY (recommended) or OPENAI_API_KEY.' });
      return;
    }

    // Build a plain prompt from messages for simplicity
    const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
    const convoParts = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role.toUpperCase()}: ${m.content}`);
    const prompt = `${systemParts.join('\n\n')}${systemParts.length ? '\n\n' : ''}${convoParts.join('\n')}`;

    // Choose model via env or default. For Anthropic keys, use an Anthropic model.
    const modelId = process.env.AI_MODEL || 'anthropic/claude-4-sonnet';
    const result = await generateText({ model: modelId, prompt });

    res.status(200).json({ message: result.text });
  } catch (err) {
    const expose = process.env.NODE_ENV !== 'production' || process.env.DEBUG_AI_ERRORS === 'true';
    console.error('AI chat error', err);
    res.status(500).json({ error: expose ? String(err) : 'Internal Server Error' });
  }
}


