import { json, requestBody, rateLimit } from "../lib/http.js";
import { productPreview } from "../lib/products.js";
export async function handler(event) {
  try {
    const body = requestBody(event, 4000);
    if (typeof body.url !== "string" || body.url.length > 2000)
      return json(400, { error: "Inserisci un link valido." });
    rateLimit(
      "product:" + (event.headers?.["x-nf-client-connection-ip"] || "local"),
      20,
      300000,
    );
    return json(200, await productPreview(body.url));
  } catch (err) {
    return json(err.status || 422, {
      error: err.status
        ? err.message
        : err.message.startsWith("getaddrinfo")
          ? "Negozio non raggiungibile: inserisci i dettagli a mano."
          : err.message || "Anteprima non disponibile.",
    });
  }
}
