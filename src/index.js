import { createServer } from 'node:http';
import { createPostDraft } from './services/create-post-draft.js';
import { listPosts } from './services/list-posts.js';

const { API_HOST, API_PORT, API_PROTOCOL } = process.env


const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
};

// Req = Request (Requisição)
// Res = Response (Resposta)
const server = createServer(async (req, res) => {
  const { method, url } = req;
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };

  const paths = url.split('/').filter(Boolean);
  const path = paths.at(0) || '/';

  if (method === 'GET' && path === 'posts') {
    try {
      const posts = await listPosts();

      res.writeHead(200, headers);
      return res.end(JSON.stringify(posts));
    } catch (error) {
      console.error(error);
      res.writeHead(500, headers);
      return res.end(JSON.stringify({ message: 'Erro ao listar posts' }));
    }
  }

  if (method === 'POST' && path === 'posts' && paths.at(1) === 'draft') {
    try {
      const body = await readJsonBody(req);

      if (typeof body.idea !== 'string' || !body.idea.trim()) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ message: 'O campo idea é obrigatório' }));
      }

      const draftPost = await createPostDraft(body.idea);

      res.writeHead(201, headers);
      return res.end(JSON.stringify(draftPost));
    } catch (error) {
      console.error(error);
      res.writeHead(500, headers);
      return res.end(JSON.stringify({ message: 'Erro ao criar post draft' }));
    }
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ message: 'Rota não encontrada' }));
});

server.listen(API_PORT, API_HOST, () => {
  console.log(`Servidor rodando em ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);
  console.log('Aperte CTRL+C para parar o servidor')
});
