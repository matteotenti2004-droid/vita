import { json, publicConfig } from "../lib/http.js";
export async function handler(event) {
  if (event.httpMethod !== "GET")
    return json(405, { error: "Metodo non supportato." });
  return json(200, publicConfig());
}
