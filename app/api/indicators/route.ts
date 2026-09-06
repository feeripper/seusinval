import { indicators } from '@/lib/indicators';
import { goBase, goHeaders } from '@/lib/go-proxy';

export async function GET() {
  const base = goBase();
  if (!base) return Response.json({ indicators, mode: 'demo' });
  try {
    const r = await fetch(base + '/api/indicators', { headers: goHeaders(), signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw Error();
    const data = await r.json();
    return Response.json({ indicators: data.indicators ?? indicators, mode: data.mode === 'llm' ? 'llm' : 'demo' });
  } catch {
    return Response.json({ indicators, mode: 'demo', error: 'Backend indisponível' }, { status: 200 });
  }
}
