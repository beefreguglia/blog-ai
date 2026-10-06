const errorResponse = (description, example) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
      example: { message: example },
    },
  },
});

const invalidApiKey = errorResponse("API key ausente ou inválida", "API key ausente ou inválida");
const postNotFound = errorResponse("Post não encontrado", "Post não encontrado");
const postAlreadyDecided = errorResponse(
  "Post já foi aprovado ou rejeitado",
  "Post já foi aprovado ou rejeitado",
);

const postResponse = (description) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Post" } } },
});

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  description: "Identificador do post",
  schema: { type: "string" },
  example: "V1StGXR8_Z5jdHi6B-myT",
};

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "blog-ia-nodejs",
    version: "1.0.0",
    description:
      "API de blog que gera rascunhos de posts com IA. A partir de uma ideia, um agente escreve " +
      "título e conteúdo em Markdown. O post fica pendente até ser aprovado ou rejeitado, e apenas " +
      "posts aprovados e já publicados aparecem na listagem pública.\n\n" +
      "Rotas protegidas exigem o header `Authorization: Bearer <API_KEY>`.",
  },
  servers: [{ url: "/", description: "Servidor atual" }],
  tags: [{ name: "Posts", description: "Criação, moderação e consulta de posts" }],
  paths: {
    "/posts": {
      get: {
        tags: ["Posts"],
        summary: "Lista posts",
        description:
          "Por padrão, retorna apenas posts aprovados e já publicados (`published_at` menor ou " +
          "igual a agora), do mais recente ao mais antigo.\n\n" +
          "Com `include=all`, retorna todos os posts, inclusive pendentes, rejeitados e " +
          "agendados. Neste caso a API key é obrigatória.",
        security: [{}, { bearerAuth: [] }],
        parameters: [
          {
            name: "include",
            in: "query",
            required: false,
            description: "Use `all` para incluir posts pendentes e rejeitados (requer API key).",
            schema: { type: "string", enum: ["all"] },
          },
        ],
        responses: {
          200: {
            description: "Lista de posts",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Post" } },
              },
            },
          },
          403: invalidApiKey,
        },
      },
    },
    "/posts/draft": {
      post: {
        tags: ["Posts"],
        summary: "Gera um rascunho de post com IA",
        description:
          "Gera título e conteúdo a partir de uma ideia e salva o post como pendente " +
          "(`approved_at`, `rejected_at` e `published_at` nulos).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["idea"],
                properties: {
                  idea: {
                    type: "string",
                    minLength: 1,
                    description: "Ideia que o agente usa para escrever o post",
                    example: "Como começar com testes automatizados em Node.js",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: postResponse("Rascunho criado"),
          400: errorResponse(
            "`idea` ausente, vazia ou não é string, ou body com JSON inválido",
            "O campo idea é obrigatório",
          ),
        },
      },
    },
    "/posts/{id}": {
      get: {
        tags: ["Posts"],
        summary: "Busca um post pelo id",
        description: "Retorna o post em qualquer estado, inclusive pendente ou rejeitado.",
        parameters: [idParameter],
        responses: {
          200: postResponse("Post encontrado"),
          404: postNotFound,
        },
      },
    },
    "/posts/{id}/approve": {
      patch: {
        tags: ["Posts"],
        summary: "Aprova um post pendente",
        description:
          "Aprova apenas posts ainda pendentes. O body é opcional: `published_at` permite " +
          "agendar a publicação; sem ele, assume a data atual.",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  published_at: {
                    type: "string",
                    format: "date-time",
                    description: "Data de publicação (padrão: agora)",
                    example: "2026-12-01T09:00:00Z",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: postResponse("Post aprovado"),
          400: errorResponse(
            "`published_at` inválido, ou body com JSON inválido",
            "O campo published_at deve ser uma data válida",
          ),
          403: invalidApiKey,
          404: postNotFound,
          409: postAlreadyDecided,
        },
      },
    },
    "/posts/{id}/reject": {
      delete: {
        tags: ["Posts"],
        summary: "Rejeita um post pendente",
        description: "Rejeita apenas posts ainda pendentes.",
        security: [{ bearerAuth: [] }],
        parameters: [idParameter],
        responses: {
          200: postResponse("Post rejeitado"),
          403: invalidApiKey,
          404: postNotFound,
          409: postAlreadyDecided,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Valor da variável de ambiente `API_KEY`, enviado como `Bearer <API_KEY>`.",
      },
    },
    schemas: {
      Post: {
        type: "object",
        required: [
          "id",
          "title",
          "content",
          "published_at",
          "approved_at",
          "rejected_at",
          "created_at",
        ],
        properties: {
          id: { type: "string", example: "V1StGXR8_Z5jdHi6B-myT" },
          title: { type: "string", example: "Testes automatizados em Node.js" },
          content: {
            type: "string",
            description: "Conteúdo do post em Markdown",
            example: "## Introdução\n\nTestar cedo evita dor de cabeça...",
          },
          published_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Data de publicação; nula enquanto o post está pendente",
          },
          approved_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Preenchida quando o post é aprovado",
          },
          rejected_at: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Preenchida quando o post é rejeitado",
          },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        required: ["message"],
        properties: { message: { type: "string" } },
      },
    },
  },
};
