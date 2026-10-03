import { createServer } from 'node:http';

const { API_HOST, API_PORT, API_PROTOCOL } = process.env

// Req = Request (Requisição)
// Res = Response (Resposta)
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ message: 'Hello World' }));
});

server.listen(API_PORT, API_HOST, () => {
  console.log(`Servidor rodando em ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);
  console.log('Aperte CTRL+C para parar o servidor')
});
