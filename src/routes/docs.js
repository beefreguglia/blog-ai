import { openapi } from "../docs/openapi.js";

// Swagger UI carregado via CDN; a spec é servida pela própria API em /openapi.json.
const swaggerUiHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>blog-ia-nodejs - Documentação da API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger-ui" });
    </script>
  </body>
</html>
`;

export function docsRoutes(app) {
  app.get("/openapi.json", async (req, res) => {
    res.json(openapi);
  });

  app.get("/docs", async (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(swaggerUiHtml);
  });
}
