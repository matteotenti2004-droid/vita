import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "VYRA_AI_API_KEY",
    "VYRA_AI_MODEL",
    "VYRA_AI_PROVIDER",
    "GEMINI_API_KEY",
    "VYRA_GEMINI_MODEL",
  ])
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  return {
    plugins: [
      {
        name: "local-netlify-functions",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const name = req.url
              ?.split("?")[0]
              .match(
                /^\/\.netlify\/functions\/(config|assistant|product)$/,
              )?.[1];
            if (!name) return next();
            try {
              let body = "";
              for await (const chunk of req) {
                body += chunk;
                if (body.length > 32000) {
                  res.statusCode = 413;
                  res.end("Request too large");
                  return;
                }
              }
              const { handler } = await import(
                `./netlify/functions/${name}.js`
              );
              const result = await handler({
                httpMethod: req.method,
                headers: req.headers,
                body,
                isBase64Encoded: false,
              });
              res.writeHead(result.statusCode, result.headers);
              res.end(result.body);
            } catch {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Servizio temporaneamente non disponibile.",
                }),
              );
            }
          });
        },
      },
    ],
  };
});
