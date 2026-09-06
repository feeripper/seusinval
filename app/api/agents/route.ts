import { AGENTS, DISCLAIMER } from '@/lib/agents';
import { goBase, goHeaders } from '@/lib/go-proxy';

export async function GET() {
  const base = goBase();
  if (base) {
    try {
      const r = await fetch(base + '/api/agents', { headers: goHeaders(), signal: AbortSignal.timeout(8000) });
      if (r.ok) return Response.json(await r.json());
    } catch { /* fallback local catalog */ }
  }
  return Response.json({
    agents: AGENTS.map(a => ({ id: a.id, name: a.name, role: a.role, status: 'indisponível' })),
    disclaimer: DISCLAIMER,
  });
}
