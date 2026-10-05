import { Agent } from '@mastra/core/agent';
import { z } from 'zod';

export const generatedPostSchema = z.object({
  title: z.string().describe('Título atrativo e objetivo do post'),
  content: z.string().describe('Conteúdo completo do post em Markdown'),
});

export const postWriterAgent = new Agent({
  id: 'post-writer',
  name: 'Post Writer',
  instructions: `
    Você é um redator de blog experiente. A partir de uma ideia fornecida,
    escreva um post completo em Português Brasil.
    - Crie um título claro e atrativo.
    - Escreva o conteúdo em Markdown, com introdução, seções com subtítulos (##) e conclusão.
    - Não inclua o título dentro do conteúdo.
  `,
  model: 'openai/gpt-4o-mini',
});

export async function generatePostFromIdea(idea) {
  const result = await postWriterAgent.generate(
    `Ideia de post: ${idea}`,
    { structuredOutput: { schema: generatedPostSchema } },
  );

  return result.object;
}
