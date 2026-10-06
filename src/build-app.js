import { createApp } from "./lib/app.js";
import { postsRoutes } from "./routes/posts.js";

export function buildApp() {
  const app = createApp();

  postsRoutes(app);

  return app;
}
