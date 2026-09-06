# Governança de dados e IA · Seu Sinval

Protótipo React com identidade visual inspirada no Itaú Unibanco, indicadores de privacidade, proteção de dados e riscos de IA. Inclui panorama executivo, filtros, detalhes com fonte e responsável, alertas, histórico, projeção ilustrativa e chat demonstrativo fundamentado na base fictícia.

## Estrutura

- `app/page.tsx`: composição das telas (visão geral, domínios, central de alertas) e estado da aplicação.
- `app/globals.css`: design system — tokens de cor (marca, azul de inteligência, neutros, status), tipografia, raios, sombras e utilitários (`surface`, `num`, `eyebrow`, `ink-gradient`).
- `lib/indicators.ts`: cálculo de situação, projeção e análise demonstrativa (regras de negócio).
- `lib/presentation.ts`: helpers exclusivamente de apresentação (rótulos, ordenação por severidade, textos de contexto, série do gráfico, perguntas sugeridas e estruturação da resposta do assistente). Não altera regras nem dados.
- `components/governance/`: componentes reutilizáveis da plataforma.
  - `status-badge.tsx` (situação com ícone + texto), `kpi-card.tsx`, `panel.tsx`, `status-filter.tsx`, `sparkline.tsx`, `sinval-mark.tsx`.
  - `action-now.tsx` (exige ação agora), `priorities.tsx` (ações recomendadas), `domain-cards.tsx`, `trend-chart.tsx` (histórico × cenário).
  - `indicator-table.tsx` (tabela + cards mobile), `alert-list.tsx` (alertas acionáveis), `indicator-detail.tsx` (análise executiva), `sinval-chat.tsx` (assistente com respostas estruturadas), `app-sidebar.tsx`.
- `backend/indicators.json`: base única de nove indicadores fictícios.
- `app/api/*`: demonstração e proxy de servidor para o Go.
- `backend/`: serviço Go independente, Dockerfile e instruções de integração com IA.

### Direção visual

Workspace executivo de governança e IA: superfícies claras, laranja reservado a CTAs e destaques, azul profundo para a área de inteligência (Seu Sinval), neutros frios no restante. Situação sempre comunicada por ícone + texto, não apenas por cor. Projeções aparecem como "cenário ilustrativo" e os dados como fictícios em todas as superfícies.

O frontend publicado funciona sem credenciais, em modo demonstrativo. O backend Go foi escrito, mas não compilado neste ambiente (Go indisponível) nem hospedado. A integração real com o modelo requer configuração de endpoint e credenciais no Go. Veja `backend/README.md`.

## Escopo e metodologia

Referência fixa: agosto de 2026. Para indicadores percentuais, maior é melhor. Meta atingida: na meta; déficit de até 10 pontos percentuais: atenção; déficit superior: crítico. Incidentes acima de zero: crítico. São critérios fictícios internos, sem pretensão de certificar conformidade regulatória.

O gráfico compara médias simples dos indicadores percentuais de cada domínio; a contagem de incidentes fica fora dessa média. A projeção de setembro usa agosto + (agosto − junho)/2, limitada ao intervalo 0–100% para percentuais. Não é um modelo preditivo validado.

Os filtros, a seleção de domínio e o histórico da conversa duram a sessão React; não há persistência, autenticação corporativa, integração de dados nem envio de alertas externos. A publicação é privada, sob acesso do proprietário no Sites.

## Verificação

Build de produção validado. O `tsc --noEmit` isolado encontra declarações de tipos Cloudflare ausentes no starter (`cloudflare:workers`, `Fetcher`, `D1Database`); o pipeline do Sites conclui o build. Não foi realizada inspeção de navegador. Compile e valide o serviço Go em CI antes de uso.
