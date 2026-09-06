import { goBase, goHeaders, missingBackend } from '@/lib/go-proxy';

const DISCLAIMER = 'As respostas são orientativas e devem ser validadas pelas áreas de Privacidade, Segurança, Risco e Jurídico.';

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
  const base = goBase();
  if (!base) return missingBackend();

  const payload = {
    message: message.trim(),
    question: message.trim(),
    agent: typeof data.agent === 'string' ? data.agent : 'sinval',
    conversationId: typeof data.conversationId === 'string' ? data.conversationId : '',
    domain: typeof data.domain === 'string' ? data.domain : 'Todos',
    context: data.context && typeof data.context === 'object' ? data.context : { currentPage: typeof data.domain === 'string' ? data.domain : 'Visão geral' },
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
    return Response.json({ error: 'Não foi possível consultar o Seu Sinval', disclaimer: DISCLAIMER }, { status: 502 });
  }
}
