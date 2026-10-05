import { createApp } from "./lib/app.js";
import { postsRoutes } from "./routes/posts.js";

const { API_HOST, API_PORT, API_PROTOCOL } = process.env;

const app = createApp();

postsRoutes(app);

app.listen(API_PORT, API_HOST, () => {
  console.log(`Servidor rodando em ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);
  console.log("Aperte CTRL+C para parar o servidor");
});
