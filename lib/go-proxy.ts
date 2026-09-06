const DISCLAIMER = 'As respostas são orientativas e devem ser validadas pelas áreas de Privacidade, Segurança, Risco e Jurídico.';

export function goBase() {
  return process.env.GO_API_URL?.replace(/\/$/, '') ?? '';
}

export function goHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = process.env.GO_API_TOKEN;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export function missingBackend() {
  return Response.json({ error: 'Backend de IA indisponível. Configure GO_API_URL no servidor.', disclaimer: DISCLAIMER }, { status: 503 });
}

export async function proxyGo(path: string, init: RequestInit, timeoutMs: number) {
  const base = goBase();
  if (!base) return missingBackend();
  try {
    const r = await fetch(base + path, { ...init, headers: goHeaders(init.headers), signal: AbortSignal.timeout(timeoutMs) });
    return r;
  } catch {
    return Response.json({ error: 'Não foi possível consultar o Seu Sinval', disclaimer: DISCLAIMER }, { status: 502 });
  }
}
