import { goBase, goHeaders } from '@/lib/go-proxy';
import { agentById, DISCLAIMER } from '@/lib/agents';
import { analyze, indicators } from '@/lib/indicators';

function simulatedReply(message: string, agentId: string) {
  const agent = agentById(agentId);
  return {
    agent: { id: agent.id, name: agent.name, role: agent.role },
    message: `Resposta demonstrativa de ${agent.name} (simulação local, sem motor OpenAI).\n\n${analyze(message, indicators)}`,
    suggestedActions: agent.questions.slice(0, 2),
    disclaimer: DISCLAIMER,
    simulated: true,
  };
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const message = typeof data.message === 'string' ? data.message : typeof data.question === 'string' ? data.question : '';
  if (!message.trim() || message.length > 2000) {
    return Response.json({ error: 'Pergunta deve conter de 1 a 2000 caracteres' }, { status: 400 });
  }
  const agent = typeof data.agent === 'string' ? data.agent : 'sinval';
  const base = goBase();
  if (!base) return Response.json(simulatedReply(message.trim(), agent));

  const payload = {
    message: message.trim(),
    question: message.trim(),
    agent,
    conversationId: typeof data.conversationId === 'string' ? data.conversationId : '',
    domain: typeof data.domain === 'string' ? data.domain : 'Todos',
    context: data.context && typeof data.context === 'object' ? data.context : { currentPage: typeof data.domain === 'string' ? data.domain : 'Governança' },
    stream: data.stream !== false,
  };

  try {
    const upstream = await fetch(base + '/api/chat', {
      method: 'POST',
      headers: goHeaders({ 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000),
    });
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ error: 'Não foi possível consultar o Seu Sinval' }));
      return Response.json({ error: err.error ?? 'Não foi possível consultar o Seu Sinval', disclaimer: DISCLAIMER }, { status: upstream.status });
    }
    if (upstream.headers.get('content-type')?.includes('text/event-stream') && upstream.body) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store',
          Connection: 'keep-alive',
        },
      });
    }
    return Response.json(await upstream.json());
  } catch {
    return Response.json(simulatedReply(message.trim(), agent));
  }
}
