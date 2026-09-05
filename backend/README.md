# Seu Sinval — backend Go

Serviço Go independente do frontend React. API de indicadores e chat contextual, com autenticação de serviço, limites de entrada, timeouts e desligamento gracioso. A base embarcada é demonstrativa e não contém dados do Itaú. Sem banco de dados ou histórico persistente.

## Executar

Requer Go 1.22 ou superior. Defina `API_TOKEN` com segredo aleatório de ao menos 24 caracteres no ambiente e execute `go run .` nesta pasta. Porta padrão: 8080. Alternativamente, construa a imagem com `docker build -t seu-sinval .` e injete as variáveis no container por seu gerenciador de segredos.

- `GET /healthz`: prontidão, sem autenticação.
- `GET /api/indicators`: indicadores. Header `Authorization: Bearer <API_TOKEN>`.
- `POST /api/chat`: JSON `{"question":"Analise IA-001", "domain":"Todos"}`; mesmo header.
- Domínios: `Todos`, `Privacidade de dados`, `Proteção de dados`, `Riscos de IA`.

## Conectar a React

Configure `GO_API_URL` (origem HTTPS do serviço Go) e `GO_API_TOKEN` no servidor do frontend. As rotas React `/api/indicators` e `/api/chat` encaminham as solicitações ao Go. Nunca coloque segredos em variáveis NEXT_PUBLIC. Sem GO_API_URL, o frontend fornece uma demonstração local por regras. Com Go indisponível, o painel informa a falha e mantém a base demonstrativa local; o chat informa erro.

## Modelo de IA

Configure no Go `LLM_API_URL` (endpoint HTTPS de chat completions), `LLM_API_KEY` e `LLM_MODEL`. O contrato esperado recebe model e messages e retorna choices[0].message.content. Integre um gateway corporativo autorizado que exponha esse contrato; Amazon Bedrock nativo usa outro contrato e requer um adaptador, ainda não implementado. Sem todas essas variáveis, o Go responde com resumo determinístico da base e sinaliza modo demo. As respostas do modelo usam dados fictícios e precisam de avaliação humana.

## Próxima implantação corporativa

A hospedagem demonstrativa executa React e rotas de demonstração em JavaScript. Ela não executa o binário Go. O Go deve ser implantado separadamente (por exemplo, ECS/Fargate com balanceador HTTPS). Ainda faltam conexão aos indicadores reais, SSO/RBAC, autorização por domínio no Go, persistência, auditoria, rate limiting no gateway, observabilidade e avaliação formal do assistente. O token atual identifica o serviço; não fornece autorização de usuários finais.

O CSS é inspirado na marca solicitada. Não utiliza biblioteca interna homologada nem representa produto oficial do Itaú.

## Validação

O ambiente de criação não disponibiliza compilador Go. O frontend passa pelo build de produção; o backend deve ser compilado e seus testes executados no CI antes de implantação.
