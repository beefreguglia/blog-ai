import { approvePost } from "../services/approve-post.js";
import { createPostDraft } from "../services/create-post-draft.js";
import { getPost } from "../services/get-post.js";
import { listPosts } from "../services/list-posts.js";
import { rejectPost } from "../services/reject-post.js";

export function postsRoutes(app) {
  app.get("/posts", async (req, res) => {
    const posts = await listPosts();

    res.json(posts);
  });

  app.get("/posts/:id", async (req, res) => {
    const post = await getPost(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post não encontrado" });
    }

    res.json(post);
  });

  app.post("/posts/draft", async (req, res) => {
    const { idea } = req.body;

    if (typeof idea !== "string" || !idea.trim()) {
      return res.status(400).json({ message: "O campo idea é obrigatório" });
    }

    const draftPost = await createPostDraft(idea);

    res.status(201).json(draftPost);
  });

  app.patch("/posts/:id/approve", async (req, res) => {
    const { published_at: publishedAt } = req.body;

    if (publishedAt !== undefined && Number.isNaN(Date.parse(publishedAt))) {
      return res.status(400).json({ message: "O campo published_at deve ser uma data válida" });
    }

    const approvedPost = await approvePost(req.params.id, publishedAt);

    if (approvedPost) {
      return res.json(approvedPost);
    }

    const post = await getPost(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post não encontrado" });
    }

    res.status(409).json({ message: "Post já foi aprovado ou rejeitado" });
  });

  app.delete("/posts/:id/reject", async (req, res) => {
    const rejectedPost = await rejectPost(req.params.id);

    if (rejectedPost) {
      return res.json(rejectedPost);
    }

    const post = await getPost(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post não encontrado" });
    }

    res.status(409).json({ message: "Post já foi aprovado ou rejeitado" });
  });
}
