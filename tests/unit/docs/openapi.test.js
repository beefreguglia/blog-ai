import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openapi } from "../../../src/docs/openapi.js";

const operations = Object.entries(openapi.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({ path, method, operation })),
);

const collectRefs = (value) => {
  if (Array.isArray(value)) return value.flatMap(collectRefs);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      key === "$ref" ? [child] : collectRefs(child),
    );
  }
  return [];
};

describe("especificação OpenAPI", () => {
  it("usa OpenAPI 3.0", () => {
    assert.match(openapi.openapi, /^3\.0\./);
  });

  it("documenta todos os endpoints da API", () => {
    const documented = operations.map(({ method, path }) => `${method.toUpperCase()} ${path}`);

    assert.deepEqual(documented.sort(), [
      "DELETE /posts/{id}/reject",
      "GET /posts",
      "GET /posts/{id}",
      "PATCH /posts/{id}/approve",
      "POST /posts/draft",
    ]);
  });

  it("exige API key nos endpoints protegidos", () => {
    const secured = operations
      .filter(({ operation }) => operation.security?.some((item) => item.bearerAuth))
      .map(({ method, path }) => `${method.toUpperCase()} ${path}`);

    assert.deepEqual(secured.sort(), [
      "DELETE /posts/{id}/reject",
      "GET /posts",
      "PATCH /posts/{id}/approve",
    ]);
  });

  it("declara 403 em todo endpoint que usa API key", () => {
    for (const { path, method, operation } of operations) {
      if (operation.security?.some((item) => item.bearerAuth)) {
        assert.ok(operation.responses[403], `${method} ${path} sem resposta 403`);
      }
    }
  });

  it("declara todos os parâmetros de rota presentes no path", () => {
    for (const { path, operation } of operations) {
      const placeholders = [...path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      const declared = (operation.parameters ?? [])
        .filter((parameter) => parameter.in === "path")
        .map((parameter) => parameter.name);

      assert.deepEqual(declared, placeholders, `parâmetros de ${path}`);
    }
  });

  it("resolve todos os $ref internos", () => {
    const refs = collectRefs(openapi);

    assert.ok(refs.length > 0);

    for (const ref of refs) {
      const target = ref
        .replace("#/", "")
        .split("/")
        .reduce((node, key) => node?.[key], openapi);

      assert.ok(target, `$ref sem destino: ${ref}`);
    }
  });
});
