import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { createApp } from "../../../src/lib/app.js";

describe("createApp (roteador)", () => {
  const app = createApp();
  let baseUrl;

  app.get("/items", async (req, res) => res.json({ query: req.query }));
  app.get("/items/:id", async (req, res) => res.json({ params: req.params }));
  app.get("/items/:id/tags/:tag", async (req, res) => res.json({ params: req.params }));
  app.post("/items", async (req, res) => res.status(201).json({ body: req.body }));
  app.get("/no-body", async (req, res) => res.json({ body: req.body ?? null }));
  app.get("/boom", async () => {
    throw new Error("falha inesperada");
  });

  before(async () => {
    await new Promise((resolve) => app.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${app.server.address().port}`;
  });

  after(() => new Promise((resolve) => app.server.close(resolve)));

  it("extrai parâmetros de rota", async () => {
    const res = await fetch(`${baseUrl}/items/abc123`);

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { params: { id: "abc123" } });
  });

  it("extrai múltiplos parâmetros", async () => {
    const res = await fetch(`${baseUrl}/items/1/tags/node`);

    assert.deepEqual(await res.json(), { params: { id: "1", tag: "node" } });
  });

  it("decodifica parâmetros com caracteres escapados", async () => {
    const res = await fetch(`${baseUrl}/items/a%20b`);

    assert.deepEqual(await res.json(), { params: { id: "a b" } });
  });

  it("aceita barra final na URL", async () => {
    const res = await fetch(`${baseUrl}/items/abc/`);

    assert.equal(res.status, 200);
  });

  it("expõe a query string em req.query", async () => {
    const res = await fetch(`${baseUrl}/items?include=all&page=2`);

    assert.deepEqual(await res.json(), { query: { include: "all", page: "2" } });
  });

  it("faz o parse do body JSON em métodos com body", async () => {
    const res = await fetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: "teste" }),
    });

    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { body: { nome: "teste" } });
  });

  it("usa objeto vazio quando o body está vazio", async () => {
    const res = await fetch(`${baseUrl}/items`, { method: "POST" });

    assert.deepEqual(await res.json(), { body: {} });
  });

  it("não lê body em métodos sem body", async () => {
    const res = await fetch(`${baseUrl}/no-body`);

    assert.deepEqual(await res.json(), { body: null });
  });

  it("responde 400 para JSON inválido", async () => {
    const res = await fetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalido",
    });

    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { message: "JSON inválido" });
  });

  it("responde 404 para rota inexistente", async () => {
    const res = await fetch(`${baseUrl}/nao-existe`);

    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { message: "Rota não encontrada" });
  });

  it("responde 404 quando o método não corresponde à rota", async () => {
    const res = await fetch(`${baseUrl}/items/abc`, { method: "DELETE" });

    assert.equal(res.status, 404);
  });

  it("responde 500 e registra o erro quando o handler lança exceção", async (t) => {
    const consoleError = t.mock.method(console, "error", mock.fn());
    const res = await fetch(`${baseUrl}/boom`);

    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { message: "Erro interno do servidor" });
    assert.equal(consoleError.mock.callCount(), 1);
  });
});
