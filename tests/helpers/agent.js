import { mock } from "node:test";
import { postWriterAgent } from "../../src/agents/post-writer.js";

// Substitui a chamada à OpenAI por uma resposta fixa.
// Retorna o mock para permitir asserts sobre as chamadas.
export function mockPostWriter({ title = "Título gerado", content = "## Conteúdo gerado" } = {}) {
  return mock.method(postWriterAgent, "generate", async () => ({
    object: { title, content },
  }));
}
