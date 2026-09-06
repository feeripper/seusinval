# Seu Sinval — backend Go

Serviço Go independente do frontend React. API de indicadores e chat com quatro agentes, autenticação de serviço, limites de entrada, rate limit por IP, timeouts e desligamento gracioso. A base embarcada é demonstrativa e não contém dados do Itaú. Sem banco de dados persistente; o histórico de conversa vive em memória na sessão do processo.

## Arquitetura de IA

```
internal/ai
  types.go      agentes, contratos de request/response
  prompts.go    prompts versionados (2026-04)
  router.go     roteamento inteligente
  client.go     OpenAI Chat Completions API
  service.go    orquestração, evidência e histórico
  ratelimit.go  limite por IP
```

Agentes:

- **Seu Sinval** (`sinval`): coordenador geral
- **Aurora** (`aurora`): risco de IA
- **Octave** (`octave`): proteção de dados
- **Sherlock** (`sherlock`): privacidade de dados

Se o usuário escolhe um especialista, a seleção é respeitada. Com Seu Sinval, a pergunta é classificada e encaminhada a um único especialista quando o assunto é claro; perguntas multidisciplinares permanecem com o coordenador.

## Variáveis de ambiente

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `API_TOKEN` | sim | Bearer token do serviço (mínimo 24 caracteres) |
| `PORT` | não | Porta HTTP, padrão `8080` |
| `OPENAI_API_KEY` | para o chat | Chave da OpenAI. Nunca exponha no frontend. |
| `OPENAI_MODEL` | não | Modelo da Chat Completions API. Padrão `gpt-4o-mini`. |

A chave **não** deve existir em `VITE_`, `NEXT_PUBLIC_` ou no código do React. O frontend na Vercel só conhece `GO_API_URL` e `GO_API_TOKEN`.

## Executar

Requer Go 1.22 ou superior.

```powershell
$env:API_TOKEN="um-segredo-com-pelo-menos-24-chars"
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_MODEL="gpt-4o-mini"
go test ./...
go run .
```

Imagem:

```powershell
docker build -t seu-sinval .
```

Injete as variáveis no container pelo gerenciador de segredos. Porta padrão: 8080.

## Endpoints

- `GET /healthz`: prontidão, sem autenticação. `mode` é `llm` quando a OpenAI está configurada.
- `GET /api/indicators`: indicadores. Header `Authorization: Bearer <API_TOKEN>`.
- `GET /api/agents`: catálogo dos quatro bots e status.
- `POST /api/chat`: chat. Aceita `message` ou `question`. Com `Accept: text/event-stream` ou `"stream": true`, responde em SSE (`meta`, `delta`, `done`, `error`).

Payload:

```json
{
  "message": "Quais são os riscos de usar IA generativa no atendimento?",
  "agent": "sinval",
  "conversationId": "uuid-opcional",
  "domain": "Todos",
  "context": { "selectedIndicator": "IA-001", "currentPage": "Governança" }
}
```

Domínios: `Todos`, `Privacidade de dados`, `Proteção de dados`, `Riscos de IA`.

Limites: 2000 caracteres por mensagem, 20 requisições por IP por minuto, timeout de 40s na OpenAI. Falhas devolvem mensagem amigável, sem vazar a chave.

## Conectar ao frontend (Vercel)

No projeto Vercel, configure apenas:

- `GO_API_URL`: origem HTTPS do serviço Go
- `GO_API_TOKEN`: o mesmo valor de `API_TOKEN`

As rotas Next.js `/api/indicators`, `/api/chat` e `/api/agents` fazem proxy. Sem `GO_API_URL`, o painel continua com a base demonstrativa e o chat informa indisponibilidade.

## Deploy

1. Publique este serviço em um host com HTTPS (Railway, Fly.io, ECS/Fargate, Cloud Run).
2. Defina `API_TOKEN`, `OPENAI_API_KEY` e `OPENAI_MODEL` só nesse host.
3. Aponte `GO_API_URL` / `GO_API_TOKEN` no Vercel e faça um novo deploy do frontend.
4. Confirme `GET /healthz` com `"mode":"llm"` e uma pergunta no chat.

O frontend na Vercel **não** executa o binário Go e **não** deve receber a chave da OpenAI.

## Validação

```powershell
go test ./...
```

Cobre roteamento, prompts, validação do endpoint, histórico e autenticação. Compile o serviço no CI antes da implantação.
