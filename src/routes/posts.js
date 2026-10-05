import { createPostDraft } from "../services/create-post-draft.js";
import { getPost } from "../services/get-post.js";
import { listPosts } from "../services/list-posts.js";

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
}
