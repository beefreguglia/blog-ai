// Carregado com --import antes de qualquer teste.
// DATABASE_URL é sempre sobrescrita para apontar a um banco dedicado,
// evitando que os testes apaguem dados do ambiente de desenvolvimento.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://blog:blog@localhost:5433/blog_test";

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.API_KEY = "test-api-key";
process.env.OPENAI_API_KEY = "test-openai-key";
