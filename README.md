# blog-ia-nodejs

API de blog em Node.js que gera rascunhos de posts com IA. A partir de uma ideia, um agente (Mastra + OpenAI) escreve título e conteúdo em Markdown. O post fica pendente até ser aprovado ou rejeitado, e só posts aprovados e já publicados aparecem na listagem pública.

## Sumário

- [Stack](#stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Setup local](#setup-local)
- [Scripts](#scripts)
- [Testes](#testes)
- [Endpoints](#endpoints)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Modelo de dados](#modelo-de-dados)
- [Build da imagem Docker](#build-da-imagem-docker)
- [Publicação para produção](#publicação-para-produção)
- [Qualidade de código e commits](#qualidade-de-código-e-commits)

## Stack

- **Node.js 24+** (ESM, sem framework HTTP: o roteador mínimo fica em `src/lib/app.js`)
- **PostgreSQL 16** (driver `pg`)
- **Mastra** (`@mastra/core`) + **AI SDK da OpenAI** para o agente redator (modelo `gpt-4o-mini`)
- **postgrator-cli** para migrations
- **pnpm** como gerenciador de pacotes
- **oxlint / oxfmt**, **lefthook**, **commitlint** e **lint-staged** para qualidade e padronização

## Estrutura do projeto

```
src/
├── index.js                # entrypoint: sobe o servidor
├── build-app.js            # monta o app e registra as rotas (usado também nos testes)
├── agents/
│   └── post-writer.js      # agente que gera título e conteúdo a partir de uma ideia
├── db/
│   ├── pool.js             # pool de conexões do PostgreSQL
│   └── migrations/         # migrations SQL (postgrator)
├── docs/
│   └── openapi.js          # especificação OpenAPI 3 da API
├── lib/
│   ├── app.js              # roteador HTTP mínimo (params, query, body JSON, erros)
│   └── api-key.js          # validação do header Authorization: Bearer <API_KEY>
├── routes/
│   ├── posts.js            # rotas de /posts
│   └── docs.js             # /docs (Swagger UI) e /openapi.json
└── services/               # regras de negócio e acesso ao banco
    ├── approve-post.js
    ├── create-post-draft.js
    ├── get-post.js
    ├── list-posts.js
    └── reject-post.js
tests/
├── helpers/                # setup de ambiente, banco de testes e mock do agente
├── unit/
├── integration/
└── e2e/
```

## Variáveis de ambiente

Veja o modelo em `.env.example`.

| Variável         | Descrição                                                    | Exemplo (local)                              |
| ---------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `API_HOST`       | Host em que o servidor escuta                                | `localhost` (use `0.0.0.0` em container)     |
| `API_PORT`       | Porta do servidor                                            | `8080`                                       |
| `API_PROTOCOL`   | Protocolo, usado apenas na mensagem de log                   | `http`                                       |
| `OPENAI_API_KEY` | Chave da OpenAI usada pelo agente redator                    | `sk-...`                                     |
| `DATABASE_URL`   | String de conexão do PostgreSQL                              | `postgresql://blog:blog@localhost:5433/blog` |
| `API_KEY`        | Chave exigida nas rotas protegidas (`Authorization: Bearer`) | `change-me`                                  |

> Sem `API_KEY` configurada, nenhuma chave é considerada válida e as rotas protegidas respondem `403`. Em produção, use um valor longo e aleatório.

## Setup local

**Pré-requisitos:** Node.js 24+ (há um `.nvmrc`), pnpm e Docker com Docker Compose.

```bash
# 1. Instalar dependências
pnpm install

# 2. Criar o .env.local, subir o PostgreSQL e rodar as migrations
pnpm run local:setup

# 3. Editar o .env.local e preencher OPENAI_API_KEY (e trocar API_KEY)

# 4. Subir a API em modo desenvolvimento (com --watch)
pnpm run dev
```

O `local:setup` executa em sequência `env:setup` (copia `.env.example` para `.env.local`), `infra:up` (PostgreSQL via `docker-compose.yml`, exposto na porta `5433`) e `db:migrate`.

A API fica disponível em `http://localhost:8080`.

Para derrubar a infraestrutura local: `pnpm run infra:down`.

## Scripts

| Script                                                 | O que faz                                            |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `pnpm run dev`                                         | Sobe a API com `--watch`, lendo `.env.local`         |
| `pnpm run build`                                       | Gera a imagem Docker `blog-ia-nodejs:latest`         |
| `pnpm test`                                            | Roda todos os testes (unitários, integração e E2E)   |
| `pnpm run test:unit` / `test:integration` / `test:e2e` | Roda cada tipo de teste isoladamente                 |
| `pnpm run db:migrate`                                  | Aplica as migrations pendentes                       |
| `pnpm run db:migrate:undo`                             | Desfaz todas as migrations (migra para a versão `0`) |
| `pnpm run infra:up`                                    | Sobe o PostgreSQL local e aguarda ficar saudável     |
| `pnpm run infra:down`                                  | Derruba a infraestrutura local                       |
| `pnpm run env:setup`                                   | Copia `.env.example` para `.env.local`               |
| `pnpm run local:setup`                                 | Setup completo do ambiente local                     |
| `pnpm run lint` / `lint:fix`                           | Executa o oxlint (com ou sem correção automática)    |
| `pnpm run format` / `format:check`                     | Formata ou verifica a formatação com o oxfmt         |

## Testes

Os testes usam o test runner nativo do Node (`node --test`) e o **supertest** para o E2E. Ficam em `tests/`:

| Tipo       | Pasta               | O que cobre                                                                     | Precisa de banco |
| ---------- | ------------------- | ------------------------------------------------------------------------------- | :--------------: |
| Unitário   | `tests/unit`        | `hasValidApiKey`, roteador (`createApp`) e services com o `pool` mockado        |       não        |
| Integração | `tests/integration` | Services contra um PostgreSQL real (regras de aprovação, rejeição, listagem)    |       sim        |
| E2E        | `tests/e2e`         | A API inteira via HTTP com supertest, incluindo autenticação e fluxos completos |       sim        |

```bash
pnpm run infra:up        # PostgreSQL local (necessário para integração e E2E)
pnpm test                # todos os testes
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

- Os testes **nunca usam o banco de desenvolvimento**: `tests/helpers/setup.js` força `DATABASE_URL` para `postgresql://blog:blog@localhost:5433/blog_test` (ajustável com `TEST_DATABASE_URL`). O banco `blog_test` e a tabela são criados automaticamente na primeira execução.
- A chamada à OpenAI é sempre mockada (`tests/helpers/agent.js`): os testes não consomem créditos nem precisam de `OPENAI_API_KEY` real.
- Os arquivos rodam em série (`--test-concurrency=1`), pois integração e E2E compartilham o mesmo banco.

## Endpoints

Rotas marcadas com 🔒 exigem o header `Authorization: Bearer <API_KEY>`. Sem a chave, ou com chave inválida, a resposta é `403`.

| Método | Rota                 | Auth | Descrição                                              |
| ------ | -------------------- | :--: | ------------------------------------------------------ |
| GET    | `/posts`             |  —   | Lista posts aprovados e já publicados                  |
| GET    | `/posts?include=all` |  🔒  | Lista todos os posts, inclusive pendentes e rejeitados |
| GET    | `/posts/:id`         |  —   | Detalhe de um post                                     |
| POST   | `/posts/draft`       |  —   | Gera um rascunho de post com IA a partir de uma ideia  |
| PATCH  | `/posts/:id/approve` |  🔒  | Aprova um post pendente                                |
| DELETE | `/posts/:id/reject`  |  🔒  | Rejeita um post pendente                               |

### `GET /posts`

Retorna posts com `approved_at` preenchido e `published_at` menor ou igual a agora, ordenados por `published_at` decrescente. Com `?include=all` (e API key válida), retorna todos, ordenados por `published_at` decrescente (nulos por último) e depois por `created_at`.

```bash
curl http://localhost:8080/posts

curl -H "Authorization: Bearer $API_KEY" "http://localhost:8080/posts?include=all"
```

### `GET /posts/:id`

Retorna o post ou `404` (`Post não encontrado`). Atenção: esta rota retorna o post em qualquer estado, inclusive pendente ou rejeitado.

### `POST /posts/draft`

Gera título e conteúdo com o agente e salva o post como pendente (`approved_at`, `rejected_at` e `published_at` nulos).

```bash
curl -X POST http://localhost:8080/posts/draft \
  -H "Content-Type: application/json" \
  -d '{"idea": "Como começar com testes automatizados em Node.js"}'
```

- `201`: post criado.
- `400`: `idea` ausente, vazia ou não é string.

### `PATCH /posts/:id/approve` 🔒

Aprova um post pendente. O body é opcional e aceita `published_at` (data válida) para agendar a publicação. Sem ele, assume a data atual.

```bash
curl -X PATCH http://localhost:8080/posts/<id>/approve \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"published_at": "2026-12-01T09:00:00Z"}'
```

- `200`: post aprovado.
- `400`: `published_at` inválido.
- `403`: API key ausente ou inválida.
- `404`: post não encontrado.
- `409`: post já foi aprovado ou rejeitado.

### `DELETE /posts/:id/reject` 🔒

Rejeita um post pendente.

```bash
curl -X DELETE http://localhost:8080/posts/<id>/reject \
  -H "Authorization: Bearer $API_KEY"
```

- `200`: post rejeitado.
- `403`: API key ausente ou inválida.
- `404`: post não encontrado.
- `409`: post já foi aprovado ou rejeitado.

### Erros gerais

| Status | Quando                 | Body                                        |
| ------ | ---------------------- | ------------------------------------------- |
| `400`  | Body com JSON inválido | `{ "message": "JSON inválido" }`            |
| `404`  | Rota inexistente       | `{ "message": "Rota não encontrada" }`      |
| `500`  | Erro não tratado       | `{ "message": "Erro interno do servidor" }` |

## Documentação da API (Swagger)

A API publica a própria documentação interativa:

| Rota                | Descrição                                       |
| ------------------- | ----------------------------------------------- |
| `GET /docs`         | Swagger UI, para explorar e testar os endpoints |
| `GET /openapi.json` | Especificação OpenAPI 3.0 em JSON               |

Local: <http://localhost:8080/docs>.

Para testar rotas protegidas no Swagger UI, clique em **Authorize** e informe o valor de `API_KEY` (o UI envia como `Authorization: Bearer <API_KEY>`).

A especificação é escrita à mão em `src/docs/openapi.js`. **Ao criar ou alterar um endpoint, atualize esse arquivo**; os testes em `tests/unit/docs` garantem que todos os endpoints estão documentados, que os `$ref` resolvem e que as rotas protegidas declaram `403`.

> O Swagger UI carrega seus arquivos (CSS e JS) de um CDN (jsDelivr), então o navegador precisa de acesso à internet. A rota `/openapi.json` não depende disso.

## Modelo de dados

Tabela `posts` (migration `001.do.create-posts.sql`):

| Coluna         | Tipo          | Descrição                                  |
| -------------- | ------------- | ------------------------------------------ |
| `id`           | `TEXT` (PK)   | Identificador gerado com `nanoid`          |
| `title`        | `TEXT`        | Título gerado pelo agente                  |
| `content`      | `TEXT`        | Conteúdo em Markdown                       |
| `published_at` | `TIMESTAMPTZ` | Data de publicação (definida na aprovação) |
| `approved_at`  | `TIMESTAMPTZ` | Preenchida quando o post é aprovado        |
| `rejected_at`  | `TIMESTAMPTZ` | Preenchida quando o post é rejeitado       |
| `created_at`   | `TIMESTAMPTZ` | Data de criação do rascunho                |

Ciclo de vida: **rascunho** (todas as datas de decisão nulas) → **aprovado** ou **rejeitado**. Um post só pode ser decidido uma vez.

## Build da imagem Docker

O projeto é JavaScript puro, sem etapa de compilação. O "build" gera a imagem Docker:

```bash
pnpm run build
# equivale a: docker build -t blog-ia-nodejs:latest .
```

O `Dockerfile` é multi-stage (`node:24-alpine`): um estágio instala apenas as dependências de produção com `pnpm --frozen-lockfile --ignore-scripts`, e o estágio final copia só `node_modules`, `package.json` e `src`, rodando como usuário `node` (não root). O `.dockerignore` mantém `.env*`, `.git` e `node_modules` fora do contexto de build.

Para testar a imagem localmente:

```bash
docker run --rm -p 8080:8080 \
  -e DATABASE_URL=postgresql://blog:blog@host.docker.internal:5433/blog \
  -e OPENAI_API_KEY=sk-... \
  -e API_KEY=uma-chave-forte \
  blog-ia-nodejs:latest
```

A imagem já define `API_HOST=0.0.0.0`, `API_PORT=8080` e `API_PROTOCOL=http` por padrão.

## Publicação para produção

O fluxo é: construir a imagem, publicá-la em um registry, preparar o banco, rodar as migrations e subir o container com as variáveis de ambiente.

### 1. Construir e publicar a imagem

```bash
# Gera a imagem com tag de versão e envia ao registry de sua escolha
docker build -t <registry>/blog-ia-nodejs:<versao> .
docker push <registry>/blog-ia-nodejs:<versao>
```

Prefira tags versionadas (por exemplo, o hash do commit) em vez de apenas `latest`, para facilitar rollback.

### 2. Preparar o banco de dados

Use um PostgreSQL gerenciado ou próprio e obtenha a `DATABASE_URL` de produção.

### 3. Rodar as migrations

A imagem de produção **não inclui** o `postgrator-cli` (é devDependency), então as migrations devem rodar fora dela, a partir do repositório, em uma etapa de deploy ou job de CI/CD:

```bash
pnpm install --frozen-lockfile
DATABASE_URL=<url-de-producao> pnpm exec postgrator
```

> O script `db:migrate` usa `--env-file=.env.local`. Para produção, chame o `postgrator` diretamente com a `DATABASE_URL` exportada, como acima.

### 4. Subir o container

Configure as variáveis de ambiente no seu orquestrador ou plataforma (segredos nunca vão para a imagem nem para o repositório):

| Variável         | Obrigatória | Observação                           |
| ---------------- | :---------: | ------------------------------------ |
| `DATABASE_URL`   |     sim     | Conexão com o PostgreSQL de produção |
| `OPENAI_API_KEY` |     sim     | Necessária para `POST /posts/draft`  |
| `API_KEY`        |     sim     | Use um valor longo e aleatório       |
| `API_PORT`       |     não     | Padrão `8080`                        |
| `API_HOST`       |     não     | Padrão `0.0.0.0` na imagem           |
| `API_PROTOCOL`   |     não     | Apenas para o log de inicialização   |

```bash
docker run -d --name blog-ia-nodejs --restart unless-stopped \
  -p 8080:8080 \
  -e DATABASE_URL=... \
  -e OPENAI_API_KEY=... \
  -e API_KEY=... \
  <registry>/blog-ia-nodejs:<versao>
```

### Checklist de produção

- [ ] `API_KEY` forte e diferente da de desenvolvimento
- [ ] Segredos injetados via variáveis de ambiente ou gerenciador de segredos
- [ ] HTTPS terminado em um proxy reverso ou load balancer (a API fala HTTP puro)
- [ ] Migrations aplicadas antes de subir a nova versão
- [ ] Backup do PostgreSQL configurado
- [ ] Considerar proteger `POST /posts/draft`, que hoje é público e consome créditos da OpenAI

## Qualidade de código e commits

O `lefthook` instala hooks no `pnpm install` (script `prepare`):

- **pre-commit**: `lint-staged` roda `oxlint --fix` e `oxfmt` nos arquivos em stage.
- **commit-msg**: `commitlint` valida a mensagem no padrão [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:` etc.).
