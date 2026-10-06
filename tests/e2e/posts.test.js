import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it, mock } from "node:test";
import request from "supertest";
import { buildApp } from "../../src/build-app.js";
import { mockPostWriter } from "../helpers/agent.js";
import { closePool, insertPost, prepareTestDatabase, resetPosts } from "../helpers/db.js";

const auth = { Authorization: `Bearer ${process.env.API_KEY}` };
const wrongAuth = { Authorization: "Bearer chave-errada" };

describe("E2E: API de posts", () => {
  const { server } = buildApp();

  before(prepareTestDatabase);
  beforeEach(resetPosts);
  afterEach(() => mock.restoreAll());
  after(closePool);

  describe("POST /posts/draft", () => {
    it("cria um rascunho pendente gerado pelo agente", async () => {
      const generate = mockPostWriter({ title: "Testes em Node", content: "## Intro" });

      const res = await request(server)
        .post("/posts/draft")
        .send({ idea: "testes em Node.js" })
        .expect(201);

      assert.equal(res.body.title, "Testes em Node");
      assert.equal(res.body.content, "## Intro");
      assert.equal(res.body.approved_at, null);
      assert.equal(res.body.rejected_at, null);
      assert.equal(generate.mock.callCount(), 1);
    });

    it("responde 400 quando idea está ausente", async () => {
      const generate = mockPostWriter();

      const res = await request(server).post("/posts/draft").send({}).expect(400);

      assert.equal(res.body.message, "O campo idea é obrigatório");
      assert.equal(generate.mock.callCount(), 0);
    });

    it("responde 400 quando idea é vazia ou não é string", async () => {
      mockPostWriter();

      await request(server).post("/posts/draft").send({ idea: "   " }).expect(400);
      await request(server).post("/posts/draft").send({ idea: 123 }).expect(400);
    });

    it("responde 400 para JSON inválido", async () => {
      const res = await request(server)
        .post("/posts/draft")
        .set("Content-Type", "application/json")
        .send("{invalido")
        .expect(400);

      assert.equal(res.body.message, "JSON inválido");
    });
  });

  describe("GET /posts/:id", () => {
    it("retorna o post", async () => {
      await insertPost({ id: "p1", title: "Olá" });

      const res = await request(server).get("/posts/p1").expect(200);

      assert.equal(res.body.id, "p1");
      assert.equal(res.body.title, "Olá");
    });

    it("responde 404 quando não existe", async () => {
      const res = await request(server).get("/posts/inexistente").expect(404);

      assert.equal(res.body.message, "Post não encontrado");
    });
  });

  describe("GET /posts", () => {
    beforeEach(async () => {
      await insertPost({
        id: "publicado",
        approvedAt: new Date(Date.now() - 2000),
        publishedAt: new Date(Date.now() - 1000),
      });
      await insertPost({
        id: "agendado",
        approvedAt: new Date(),
        publishedAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      await insertPost({ id: "pendente" });
      await insertPost({ id: "rejeitado", rejectedAt: new Date() });
    });

    it("lista só os posts aprovados e publicados, sem autenticação", async () => {
      const res = await request(server).get("/posts").expect(200);

      assert.deepEqual(
        res.body.map((post) => post.id),
        ["publicado"],
      );
    });

    it("ignora include diferente de all", async () => {
      const res = await request(server).get("/posts?include=outro").expect(200);

      assert.equal(res.body.length, 1);
    });

    it("responde 403 com include=all sem API key", async () => {
      const res = await request(server).get("/posts?include=all").expect(403);

      assert.equal(res.body.message, "API key ausente ou inválida");
    });

    it("responde 403 com include=all e API key inválida", async () => {
      await request(server).get("/posts?include=all").set(wrongAuth).expect(403);
    });

    it("lista todos os posts com include=all e API key válida", async () => {
      const res = await request(server).get("/posts?include=all").set(auth).expect(200);

      assert.deepEqual(res.body.map((post) => post.id).sort(), [
        "agendado",
        "pendente",
        "publicado",
        "rejeitado",
      ]);
    });
  });

  describe("PATCH /posts/:id/approve", () => {
    it("responde 403 sem API key e não altera o post", async () => {
      await insertPost({ id: "p1" });

      await request(server).patch("/posts/p1/approve").expect(403);
      await request(server).patch("/posts/p1/approve").set(wrongAuth).expect(403);

      const res = await request(server).get("/posts/p1").expect(200);

      assert.equal(res.body.approved_at, null);
    });

    it("aprova o post com a data atual", async () => {
      await insertPost({ id: "p1" });

      const res = await request(server).patch("/posts/p1/approve").set(auth).expect(200);

      assert.ok(res.body.approved_at);
      assert.ok(Math.abs(Date.parse(res.body.published_at) - Date.now()) < 5000);
    });

    it("aprova o post com a data de publicação informada", async () => {
      await insertPost({ id: "p1" });

      const res = await request(server)
        .patch("/posts/p1/approve")
        .set(auth)
        .send({ published_at: "2030-01-15T12:00:00Z" })
        .expect(200);

      assert.equal(res.body.published_at, "2030-01-15T12:00:00.000Z");
    });

    it("responde 400 para published_at inválido", async () => {
      await insertPost({ id: "p1" });

      const res = await request(server)
        .patch("/posts/p1/approve")
        .set(auth)
        .send({ published_at: "não é data" })
        .expect(400);

      assert.equal(res.body.message, "O campo published_at deve ser uma data válida");
    });

    it("responde 404 quando o post não existe", async () => {
      const res = await request(server).patch("/posts/inexistente/approve").set(auth).expect(404);

      assert.equal(res.body.message, "Post não encontrado");
    });

    it("responde 409 quando o post já foi aprovado", async () => {
      await insertPost({ id: "p1" });
      await request(server).patch("/posts/p1/approve").set(auth).expect(200);

      const res = await request(server).patch("/posts/p1/approve").set(auth).expect(409);

      assert.equal(res.body.message, "Post já foi aprovado ou rejeitado");
    });

    it("responde 409 quando o post já foi rejeitado", async () => {
      await insertPost({ id: "p1" });
      await request(server).delete("/posts/p1/reject").set(auth).expect(200);

      await request(server).patch("/posts/p1/approve").set(auth).expect(409);
    });
  });

  describe("DELETE /posts/:id/reject", () => {
    it("responde 403 sem API key e não altera o post", async () => {
      await insertPost({ id: "p1" });

      await request(server).delete("/posts/p1/reject").expect(403);
      await request(server).delete("/posts/p1/reject").set(wrongAuth).expect(403);

      const res = await request(server).get("/posts/p1").expect(200);

      assert.equal(res.body.rejected_at, null);
    });

    it("rejeita o post pendente", async () => {
      await insertPost({ id: "p1" });

      const res = await request(server).delete("/posts/p1/reject").set(auth).expect(200);

      assert.ok(res.body.rejected_at);
      assert.equal(res.body.approved_at, null);
    });

    it("responde 404 quando o post não existe", async () => {
      await request(server).delete("/posts/inexistente/reject").set(auth).expect(404);
    });

    it("responde 409 quando o post já foi aprovado ou rejeitado", async () => {
      await insertPost({ id: "aprovado" });
      await insertPost({ id: "rejeitado" });
      await request(server).patch("/posts/aprovado/approve").set(auth).expect(200);
      await request(server).delete("/posts/rejeitado/reject").set(auth).expect(200);

      await request(server).delete("/posts/aprovado/reject").set(auth).expect(409);
      await request(server).delete("/posts/rejeitado/reject").set(auth).expect(409);
    });
  });

  describe("rotas inexistentes", () => {
    it("responde 404", async () => {
      const res = await request(server).get("/nao-existe").expect(404);

      assert.equal(res.body.message, "Rota não encontrada");
    });
  });

  describe("fluxo completo", () => {
    it("rascunho → aprovação → aparece na listagem pública", async () => {
      mockPostWriter({ title: "Fluxo completo", content: "Texto" });

      const { body: draft } = await request(server)
        .post("/posts/draft")
        .send({ idea: "fluxo" })
        .expect(201);

      const before = await request(server).get("/posts").expect(200);

      assert.deepEqual(before.body, []);

      await request(server).patch(`/posts/${draft.id}/approve`).set(auth).expect(200);

      const afterApproval = await request(server).get("/posts").expect(200);

      assert.deepEqual(
        afterApproval.body.map((post) => post.id),
        [draft.id],
      );
    });

    it("rascunho → rejeição → nunca aparece na listagem pública", async () => {
      mockPostWriter();

      const { body: draft } = await request(server)
        .post("/posts/draft")
        .send({ idea: "fluxo" })
        .expect(201);

      await request(server).delete(`/posts/${draft.id}/reject`).set(auth).expect(200);

      const res = await request(server).get("/posts").expect(200);

      assert.deepEqual(res.body, []);
    });
  });
});
