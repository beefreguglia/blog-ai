import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { hasValidApiKey } from "../../../src/lib/api-key.js";

const requestWith = (authorization) => ({ headers: authorization ? { authorization } : {} });

describe("hasValidApiKey", () => {
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    process.env.API_KEY = originalApiKey;
  });

  it("aceita o token Bearer correto", () => {
    assert.equal(hasValidApiKey(requestWith("Bearer test-api-key")), true);
  });

  it("rejeita quando o header Authorization está ausente", () => {
    assert.equal(hasValidApiKey(requestWith()), false);
  });

  it("rejeita esquema diferente de Bearer", () => {
    assert.equal(hasValidApiKey(requestWith("Basic test-api-key")), false);
  });

  it("rejeita Bearer sem token", () => {
    assert.equal(hasValidApiKey(requestWith("Bearer")), false);
  });

  it("rejeita token incorreto de mesmo tamanho", () => {
    assert.equal(hasValidApiKey(requestWith("Bearer test-api-kex")), false);
  });

  it("rejeita token incorreto de tamanho diferente", () => {
    assert.equal(hasValidApiKey(requestWith("Bearer curto")), false);
  });

  it("rejeita qualquer token quando API_KEY não está configurada", () => {
    delete process.env.API_KEY;

    assert.equal(hasValidApiKey(requestWith("Bearer test-api-key")), false);
    assert.equal(hasValidApiKey(requestWith("Bearer ")), false);
  });
});
