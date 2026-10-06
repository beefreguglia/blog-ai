import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { pool } from "../../../src/db/pool.js";
import { approvePost } from "../../../src/services/approve-post.js";
import { createPostDraft } from "../../../src/services/create-post-draft.js";
import { getPost } from "../../../src/services/get-post.js";
import { listPosts } from "../../../src/services/list-posts.js";
import { rejectPost } from "../../../src/services/reject-post.js";
import { mockPostWriter } from "../../helpers/agent.js";

// O pool é substituído por um mock: nenhum acesso real ao banco nestes testes.
describe("services (com pool mockado)", () => {
  let query;

  beforeEach(() => {
    query = mock.method(pool, "query", async () => ({ rows: [] }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("getPost", () => {
    it("retorna a primeira linha encontrada", async () => {
      query.mock.mockImplementation(async () => ({ rows: [{ id: "a" }] }));

      assert.deepEqual(await getPost("a"), { id: "a" });
      assert.deepEqual(query.mock.calls[0].arguments[1], ["a"]);
    });

    it("retorna null quando o post não existe", async () => {
      assert.equal(await getPost("inexistente"), null);
    });
  });

  describe("listPosts", () => {
    it("filtra aprovados e publicados por padrão", async () => {
      await listPosts();

      const [sql] = query.mock.calls[0].arguments;

      assert.match(sql, /WHERE approved_at IS NOT NULL AND published_at <= now\(\)/);
    });

    it("não aplica filtro com includeAll", async () => {
      await listPosts({ includeAll: true });

      const [sql] = query.mock.calls[0].arguments;

      assert.doesNotMatch(sql, /WHERE/);
    });

    it("retorna as linhas da consulta", async () => {
      query.mock.mockImplementation(async () => ({ rows: [{ id: "1" }, { id: "2" }] }));

      assert.deepEqual(await listPosts(), [{ id: "1" }, { id: "2" }]);
    });
  });

  describe("approvePost", () => {
    it("envia id e data de publicação", async () => {
      const publishedAt = "2026-12-01T09:00:00Z";

      await approvePost("abc", publishedAt);

      assert.deepEqual(query.mock.calls[0].arguments[1], ["abc", publishedAt]);
    });

    it("usa null como data de publicação quando não informada", async () => {
      await approvePost("abc");

      assert.deepEqual(query.mock.calls[0].arguments[1], ["abc", null]);
    });

    it("retorna o post aprovado", async () => {
      query.mock.mockImplementation(async () => ({ rows: [{ id: "abc" }] }));

      assert.deepEqual(await approvePost("abc"), { id: "abc" });
    });

    it("retorna null quando nenhum post foi atualizado", async () => {
      assert.equal(await approvePost("abc"), null);
    });
  });

  describe("rejectPost", () => {
    it("envia o id do post", async () => {
      await rejectPost("abc");

      assert.deepEqual(query.mock.calls[0].arguments[1], ["abc"]);
    });

    it("retorna o post rejeitado", async () => {
      query.mock.mockImplementation(async () => ({ rows: [{ id: "abc" }] }));

      assert.deepEqual(await rejectPost("abc"), { id: "abc" });
    });

    it("retorna null quando nenhum post foi atualizado", async () => {
      assert.equal(await rejectPost("abc"), null);
    });
  });

  describe("createPostDraft", () => {
    it("gera o conteúdo com o agente e persiste o rascunho", async () => {
      const generate = mockPostWriter({ title: "Meu título", content: "Meu conteúdo" });

      query.mock.mockImplementation(async () => ({ rows: [{ id: "novo" }] }));

      const draft = await createPostDraft("uma ideia");
      const [prompt] = generate.mock.calls[0].arguments;
      const [, params] = query.mock.calls[0].arguments;

      assert.match(prompt, /uma ideia/);
      assert.deepEqual(draft, { id: "novo" });
      assert.equal(params.length, 3);
      assert.equal(typeof params[0], "string");
      assert.deepEqual(params.slice(1), ["Meu título", "Meu conteúdo"]);
    });
  });
});
