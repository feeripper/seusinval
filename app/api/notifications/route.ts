import { goBase, goHeaders } from '@/lib/go-proxy';

export async function POST(request: Request) {
  const base = goBase();
  if (!base) return Response.json({ error: 'Backend não configurado' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const r = await fetch(base + '/api/notifications/simulate', {
    method: 'POST',
    headers: goHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return new Response(r.body, { status: r.status, headers: r.headers });
}
