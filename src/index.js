import { buildApp } from "./build-app.js";

const { API_HOST, API_PORT, API_PROTOCOL } = process.env;

const app = buildApp();

app.listen(API_PORT, API_HOST, () => {
  console.log(`Servidor rodando em ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);
  console.log("Aperte CTRL+C para parar o servidor");
});
