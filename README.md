# Governança de dados e IA · Seu Sinval

Protótipo React com identidade visual inspirada no Itaú Unibanco, indicadores de privacidade, proteção de dados e riscos de IA. Inclui panorama executivo, filtros, detalhes, alertas, histórico, projeção ilustrativa e chat com quatro agentes. A chave da OpenAI vive apenas no backend Go.

## Arquitetura

- Frontend Next.js na Vercel: painel, rotas `/api/*` como proxy.
- Backend Go separado: indicadores, agentes e motor OpenAI (Responses API).
- Sem `OPENAI_API_KEY` no browser. Sem `VITE_` / `NEXT_PUBLIC_` para a chave.

```
React (Vercel)  --GO_API_URL / GO_API_TOKEN-->  Go  --OPENAI_API_KEY-->  OpenAI Responses API
```

## Estrutura

- `app/page.tsx`: telas (Governança, visão geral, domínios, central de alertas) e estado.
- `app/globals.css`: design system.
- `lib/indicators.ts`: regras de negócio dos indicadores.
- `lib/presentation.ts`: apresentação (rótulos, ordenação, textos, gráfico).
- `lib/agents.ts`: catálogo dos quatro bots no frontend.
- `components/governance/`: painel, filtros, tabela, chat, sidebar.
- `backend/internal/ai/`: cliente OpenAI, roteamento, prompts e serviço.
- `backend/indicators.json`: nove indicadores fictícios.
- `app/api/chat`, `app/api/indicators`, `app/api/agents`: proxy de servidor para o Go.

## Agentes

| Bot | Papel |
| --- | --- |
| Seu Sinval | Coordenador geral |
| Aurora | Risco de IA |
| Octave | Proteção de dados |
| Sherlock | Privacidade de dados |

## Variáveis

Backend Go: `API_TOKEN`, `OPENAI_API_KEY`, `OPENAI_MODEL` (opcional, padrão `gpt-4.1-mini`), `PORT`.

Frontend Vercel: `GO_API_URL`, `GO_API_TOKEN`. Nunca coloque a chave da OpenAI no Vercel.

Detalhes em `backend/README.md`.

## Execução local

Frontend:

```powershell
npm install
npx next dev
```

Backend (outra janela):

```powershell
cd backend
$env:API_TOKEN="um-segredo-com-pelo-menos-24-chars"
$env:OPENAI_API_KEY="sk-..."
go test ./...
go run .
```

## Deploy

1. Publique o Go em um host HTTPS com `API_TOKEN` e `OPENAI_API_KEY`.
2. No Vercel, defina `GO_API_URL` e `GO_API_TOKEN`.
3. `npx vercel --prod` ou push em `main`.

O site em [seusinval.vercel.app](https://seusinval.vercel.app) continua no ar sem o Go (painel demonstrativo). O chat só responde com IA depois que o backend estiver publicado.

## Escopo e metodologia

Referência: agosto de 2026. Percentuais: maior é melhor. Meta atingida = na meta; déficit até 10 p.p. = atenção; acima disso ou qualquer incidente = crítico. Projeção de setembro: agosto + (agosto − junho)/2, limitada a 0–100%. Cenário ilustrativo, sem validação preditiva. Dados e metas são fictícios.

## Interações revisadas

| Elemento | Ação |
| --- | --- |
| Menu / marca **Governança** | Abre a visão Governança de dados e IA |
| Visão geral, Privacidade, Proteção, Riscos de IA, Central de alertas | Navegam e marcam o item ativo |
| Breadcrumb `Governança > …` | Volta à visão Governança |
| Filtros de situação | Atualizam tabela e alertas; **Limpar filtro** restaura Todos |
| Cards de domínio | Abrem o domínio |
| KPIs com CTA | Filtram ou abrem a central de alertas; KPIs sem ação não parecem clicáveis |
| Linhas da tabela, alertas, prioridades | Abrem o detalhe do indicador |
| Gráfico | Alterna histórico/cenário e mostra/oculta domínios |
| Chat | Quatro bots, streaming, histórico da sessão, limpar conversa, falha amigável |

## Verificação

```powershell
npx next build
cd backend
go test ./...
```

Testes automatizados cobrem menu Governança, domínios, filtros, breadcrumbs, abertura do chat, troca de bots e proxy sem chave no frontend.
