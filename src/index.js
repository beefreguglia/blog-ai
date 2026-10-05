import { createServer } from "node:http";
import { createPostDraft } from "./services/create-post-draft.js";
import { getPost } from "./services/get-post.js";
import { listPosts } from "./services/list-posts.js";

const { API_HOST, API_PORT, API_PROTOCOL } = process.env;

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
};

// Req = Request (Requisição)
// Res = Response (Resposta)
const server = createServer(async (req, res) => {
  const { method } = req;
  const { pathname } = new URL(req.url, "http://localhost");
  const headers = { "Content-Type": "application/json; charset=utf-8" };

  if (method === "GET" && /^\/posts\/?$/.test(pathname)) {
    try {
      const posts = await listPosts();

      res.writeHead(200, headers);
      return res.end(JSON.stringify(posts));
    } catch (error) {
      console.error(error);
      res.writeHead(500, headers);
      return res.end(JSON.stringify({ message: "Erro ao listar posts" }));
    }
  }

  const postMatch = pathname.match(/^\/posts\/(?<id>[^/]+)\/?$/);

  if (method === "GET" && postMatch) {
    try {
      const post = await getPost(postMatch.groups.id);

      if (!post) {
        res.writeHead(404, headers);
        return res.end(JSON.stringify({ message: "Post não encontrado" }));
      }

      res.writeHead(200, headers);
      return res.end(JSON.stringify(post));
    } catch (error) {
      console.error(error);
      res.writeHead(500, headers);
      return res.end(JSON.stringify({ message: "Erro ao buscar post" }));
    }
  }

  if (method === "POST" && /^\/posts\/draft\/?$/.test(pathname)) {
    try {
      const body = await readJsonBody(req);

      if (typeof body.idea !== "string" || !body.idea.trim()) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ message: "O campo idea é obrigatório" }));
      }

      const draftPost = await createPostDraft(body.idea);

      res.writeHead(201, headers);
      return res.end(JSON.stringify(draftPost));
    } catch (error) {
      console.error(error);
      res.writeHead(500, headers);
      return res.end(JSON.stringify({ message: "Erro ao criar post draft" }));
    }
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ message: "Rota não encontrada" }));
});

server.listen(API_PORT, API_HOST, () => {
  console.log(`Servidor rodando em ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);
  console.log("Aperte CTRL+C para parar o servidor");
});
