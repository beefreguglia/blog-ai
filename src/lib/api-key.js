import { timingSafeEqual } from "node:crypto";

// Valida o header "Authorization: Bearer <token>" contra a variável de ambiente API_KEY.
// Sem API_KEY configurada, nenhuma chave é considerada válida.
export function hasValidApiKey(req) {
  const apiKey = process.env.API_KEY;
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");

  if (!apiKey || scheme !== "Bearer" || !token) {
    return false;
  }

  const expected = Buffer.from(apiKey);
  const received = Buffer.from(token);

  return expected.length === received.length && timingSafeEqual(expected, received);
}
