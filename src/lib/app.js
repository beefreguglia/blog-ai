import { createServer } from "node:http";

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH"]);

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// "/posts/:id" -> /^\/posts\/(?<id>[^/]+)\/?$/
const compilePath = (path) => {
  const source = path
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment.startsWith(":")
        ? `(?<${segment.slice(1)}>[^/]+)`
        : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("\\/");

  return new RegExp(`^\\/${source}${source ? "\\/?" : ""}$`);
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
};

export function createApp() {
  const routes = [];

  const route = (method, path, handler) => {
    routes.push({ method, pattern: compilePath(path), handler });
  };

  const decorateResponse = (res) => {
    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };

    res.json = (data) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(data));
    };
  };

  const server = createServer(async (req, res) => {
    decorateResponse(res);

    try {
      const url = new URL(req.url, "http://localhost");
      const matched = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));

      if (!matched) {
        return res.status(404).json({ message: "Rota não encontrada" });
      }

      const { groups } = url.pathname.match(matched.pattern);

      req.params = Object.fromEntries(
        Object.entries(groups ?? {}).map(([key, value]) => [key, decodeURIComponent(value)]),
      );
      req.query = Object.fromEntries(url.searchParams);
      req.body = METHODS_WITH_BODY.has(req.method) ? await readJsonBody(req) : undefined;

      await matched.handler(req, res);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      console.error(error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  return {
    server,
    get: (path, handler) => route("GET", path, handler),
    post: (path, handler) => route("POST", path, handler),
    put: (path, handler) => route("PUT", path, handler),
    patch: (path, handler) => route("PATCH", path, handler),
    delete: (path, handler) => route("DELETE", path, handler),
    listen: (port, host, callback) => server.listen(port, host, callback),
  };
}
