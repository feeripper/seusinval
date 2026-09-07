import { goBase, goHeaders } from '@/lib/go-proxy';

export async function GET(request: Request) {
  const base = goBase();
  if (!base) return Response.json({ error: 'Backend não configurado' }, { status: 503 });
  const { searchParams } = new URL(request.url);
  const path = searchParams.has('history') ? '/api/subscriptions/history' : '/api/subscriptions';
  const r = await fetch(base + path, { headers: goHeaders() });
  return new Response(r.body, { status: r.status, headers: r.headers });
}

export async function POST(request: Request) {
  const base = goBase();
  if (!base) return Response.json({ error: 'Backend não configurado' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (body.action) {
    const actionPath = body.action === 'pause' || body.action === 'resume'
      ? `/api/subscriptions/${encodeURIComponent(body.id)}/${body.action}`
      : `/api/subscriptions/${encodeURIComponent(body.id)}`;
    const method = body.action === 'delete' ? 'DELETE' : 'POST';
    const r = await fetch(base + actionPath, { method, headers: goHeaders({ 'Content-Type': 'application/json' }) });
    return new Response(r.body, { status: r.status, headers: r.headers });
  }
  const r = await fetch(base + '/api/subscriptions', {
    method: 'POST',
    headers: goHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return new Response(r.body, { status: r.status, headers: r.headers });
}

export async function PATCH(request: Request) {
  const base = goBase();
  if (!base) return Response.json({ error: 'Backend não configurado' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const r = await fetch(base + `/api/subscriptions/${encodeURIComponent(body.id)}`, {
    method: 'PATCH',
    headers: goHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return new Response(r.body, { status: r.status, headers: r.headers });
}

export async function DELETE(request: Request) {
  const base = goBase();
  if (!base) return Response.json({ error: 'Backend não configurado' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const r = await fetch(base + `/api/subscriptions/${encodeURIComponent(body.id)}`, {
    method: 'DELETE',
    headers: goHeaders(),
  });
  return new Response(r.body, { status: r.status, headers: r.headers });
}
