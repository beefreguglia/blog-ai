import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it, mock } from "node:test";
import { approvePost } from "../../src/services/approve-post.js";
import { createPostDraft } from "../../src/services/create-post-draft.js";
import { getPost } from "../../src/services/get-post.js";
import { listPosts } from "../../src/services/list-posts.js";
import { rejectPost } from "../../src/services/reject-post.js";
import { mockPostWriter } from "../helpers/agent.js";
import { closePool, insertPost, prepareTestDatabase, resetPosts } from "../helpers/db.js";

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY);

describe("services (com PostgreSQL real)", () => {
  before(prepareTestDatabase);
  beforeEach(resetPosts);
  afterEach(() => mock.restoreAll());
  after(closePool);

  describe("createPostDraft", () => {
    it("persiste o rascunho gerado como pendente", async () => {
      mockPostWriter({ title: "Título IA", content: "Conteúdo IA" });

      const draft = await createPostDraft("ideia");

      assert.equal(draft.title, "Título IA");
      assert.equal(draft.content, "Conteúdo IA");
      assert.equal(draft.approved_at, null);
      assert.equal(draft.rejected_at, null);
      assert.equal(draft.published_at, null);
      assert.ok(draft.created_at instanceof Date);
      assert.deepEqual(await getPost(draft.id), draft);
    });

    it("gera ids diferentes para cada rascunho", async () => {
      mockPostWriter();

      const [a, b] = await Promise.all([createPostDraft("a"), createPostDraft("b")]);

      assert.notEqual(a.id, b.id);
    });
  });

  describe("getPost", () => {
    it("retorna o post em qualquer estado", async () => {
      await insertPost({ id: "pendente" });

      assert.equal((await getPost("pendente")).id, "pendente");
    });

    it("retorna null quando não existe", async () => {
      assert.equal(await getPost("inexistente"), null);
    });
  });

  describe("approvePost", () => {
    it("aprova um post pendente com published_at na data atual", async () => {
      await insertPost({ id: "p1" });

      const approved = await approvePost("p1");

      assert.ok(approved.approved_at instanceof Date);
      assert.ok(approved.published_at instanceof Date);
      assert.ok(Math.abs(approved.published_at - Date.now()) < 5000);
      assert.equal(approved.rejected_at, null);
    });

    it("respeita a data de publicação informada", async () => {
      await insertPost({ id: "p1" });

      const approved = await approvePost("p1", "2030-01-15T12:00:00Z");

      assert.equal(approved.published_at.toISOString(), "2030-01-15T12:00:00.000Z");
    });

    it("não aprova um post já aprovado", async () => {
      await insertPost({ id: "p1" });
      await approvePost("p1");

      assert.equal(await approvePost("p1"), null);
    });

    it("não aprova um post rejeitado", async () => {
      await insertPost({ id: "p1" });
      await rejectPost("p1");

      assert.equal(await approvePost("p1"), null);
    });

    it("retorna null para post inexistente", async () => {
      assert.equal(await approvePost("inexistente"), null);
    });
  });

  describe("rejectPost", () => {
    it("rejeita um post pendente", async () => {
      await insertPost({ id: "p1" });

      const rejected = await rejectPost("p1");

      assert.ok(rejected.rejected_at instanceof Date);
      assert.equal(rejected.approved_at, null);
    });

    it("não rejeita um post já aprovado", async () => {
      await insertPost({ id: "p1" });
      await approvePost("p1");

      assert.equal(await rejectPost("p1"), null);
    });

    it("não rejeita um post já rejeitado", async () => {
      await insertPost({ id: "p1" });
      await rejectPost("p1");

      assert.equal(await rejectPost("p1"), null);
    });

    it("retorna null para post inexistente", async () => {
      assert.equal(await rejectPost("inexistente"), null);
    });
  });

  describe("listPosts", () => {
    beforeEach(async () => {
      await insertPost({
        id: "antigo",
        approvedAt: daysFromNow(-10),
        publishedAt: daysFromNow(-9),
      });
      await insertPost({
        id: "recente",
        approvedAt: daysFromNow(-2),
        publishedAt: daysFromNow(-1),
      });
      await insertPost({
        id: "agendado",
        approvedAt: daysFromNow(-1),
        publishedAt: daysFromNow(5),
      });
      await insertPost({ id: "pendente" });
      await insertPost({ id: "rejeitado", rejectedAt: daysFromNow(-1) });
    });

    it("retorna apenas aprovados e já publicados, do mais recente ao mais antigo", async () => {
      const posts = await listPosts();

      assert.deepEqual(
        posts.map((post) => post.id),
        ["recente", "antigo"],
      );
    });

    it("com includeAll retorna todos, com os sem data de publicação por último", async () => {
      const posts = await listPosts({ includeAll: true });
      const ids = posts.map((post) => post.id);

      assert.equal(ids.length, 5);
      assert.deepEqual(ids.slice(0, 3), ["agendado", "recente", "antigo"]);
      assert.deepEqual(ids.slice(3).sort(), ["pendente", "rejeitado"]);
    });
  });
});
