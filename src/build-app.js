import { createApp } from "./lib/app.js";
import { docsRoutes } from "./routes/docs.js";
import { postsRoutes } from "./routes/posts.js";

export function buildApp() {
  const app = createApp();

  postsRoutes(app);
  docsRoutes(app);

  return app;
}
