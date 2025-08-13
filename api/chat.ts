import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText } from 'ai';

// Authoritative system prompt lives on the server.
const SYSTEM_PROMPT = 'Your name is F.O.C.U.S. - Factual, Orderly, Concise, Unbiased, Scholarly. You are a precise historical reference assistant specializing in human evolutionary history and civilization development from 400,000 years ago to present day. Core knowledge areas: Human evolution (Homo sapiens, Neanderthals, Denisovans, and other hominins from 400 KYA onward), early settlements (archaeological sites including Jebel Irhoud, Blombos Cave, Qafzeh, and other significant habitation sites), urban development (first cities like Uruk, Çatalhöyük, Jericho, urban planning evolution, and settlement patterns), political entities (empires, kingdoms, nation-states, and their territorial evolution through time), demographics (historical population estimates, migration patterns, and demographic transitions), notable individuals (scientists, leaders, Nobel laureates, and historically significant figures across all fields), specialized communities (research stations, trading posts, religious centers, military installations, and unique settlement types), chronological periods (Paleolithic through modern era, including specific historical phases like the Age of Exploration), economic systems (trade networks, currencies, economic transitions, and commercial centers), cultural developments (art, literature, philosophy, religious movements, and intellectual traditions), technological advancement (scientific discoveries, inventions, and technological diffusion), cataclysmic events (natural disasters, pandemics, wars, and their demographic/civilizational impacts). Response guidelines: Provide factually accurate information without speculation or invention, use concise encyclopedia-style responses focused on verifiable historical data, include specific dates, locations, and population figures when available, maintain chronological context and geographical precision, reference archaeological evidence for prehistoric claims, distinguish between established facts and scholarly consensus on debated topics, avoid subjective interpretations or value judgments.';

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
      res.status(500).json({ error: 'Missing API configuration. Set AI_GATEWAY_API_KEY.' });
      return;
    }

    // Build a plain prompt from user/assistant messages only (ignore any client system messages)
    const convoParts = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role.toUpperCase()}: ${m.content}`);
    const prompt = convoParts.join('\n');

    // Choose model via env or default. For Anthropic keys, use an Anthropic model.
    const modelId = process.env.AI_MODEL || 'anthropic/claude-4-sonnet';
    const result = await generateText({ model: modelId, system: SYSTEM_PROMPT, prompt });

    res.status(200).json({ message: result.text });
  } catch (err) {
    const expose = process.env.NODE_ENV !== 'production' || process.env.DEBUG_AI_ERRORS === 'true';
    console.error('AI chat error', err);
    res.status(500).json({ error: expose ? String(err) : 'Internal Server Error' });
  }
}


