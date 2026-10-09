export const json = (statusCode, data) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
  body: JSON.stringify(data),
});
export function requestBody(event, max = 16000) {
  if (event.httpMethod !== "POST")
    throw Object.assign(Error("Metodo non supportato."), { status: 405 });
  if (event.isBase64Encoded)
    throw Object.assign(Error("Formato non supportato."), { status: 400 });
  if ((event.body || "").length > max)
    throw Object.assign(Error("Richiesta troppo lunga."), { status: 413 });
  const origin = event.headers?.origin;
  if (!origin)
    throw Object.assign(Error("Origine della richiesta mancante."), {
      status: 403,
    });
  try {
    const u = new URL(origin),
      host = event.headers?.host;
    if (u.host !== host) throw Error();
  } catch {
    throw Object.assign(Error("Origine della richiesta non consentita."), {
      status: 403,
    });
  }
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    throw Object.assign(Error("Richiesta non valida."), { status: 400 });
  }
}
export function publicConfig() {
  const url = process.env.SUPABASE_URL || "",
    key = process.env.SUPABASE_ANON_KEY || "";
  let valid = false;
  try {
    const u = new URL(url);
    valid =
      u.protocol === "https:" &&
      u.hostname.endsWith(".supabase.co") &&
      !u.username &&
      !u.password &&
      u.pathname === "/" &&
      Boolean(key) &&
      !key.startsWith("sb_secret_");
    if (key.split(".").length === 3) {
      const claims = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      );
      if (claims.role !== "anon") valid = false;
    }
  } catch {}
  return {
    supabaseUrl: valid ? url : "",
    supabaseKey: valid ? key : "",
    aiConfigured: Boolean(process.env.VYRA_AI_API_KEY),
  };
}
export async function authenticatedUser(event) {
  const c = publicConfig();
  if (!c.supabaseUrl)
    throw Object.assign(
      Error("Il servizio account deve ancora essere configurato."),
      { status: 503 },
    );
  const token = event.headers?.authorization || "";
  if (!/^Bearer .{20,6000}$/.test(token))
    throw Object.assign(
      Error("Accedi al tuo account per usare l’assistente."),
      { status: 401 },
    );
  const r = await fetch(`${c.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: c.supabaseKey, Authorization: token },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok)
    throw Object.assign(Error("La sessione è scaduta. Accedi di nuovo."), {
      status: 401,
    });
  const user = await r.json();
  if (!user.id)
    throw Object.assign(Error("Sessione non valida."), { status: 401 });
  return user;
}
const limits = new Map();
export function rateLimit(key, limit = 10, windowMs = 600000) {
  const now = Date.now();
  if (limits.size > 2000)
    for (const [k, v] of limits) if (v.reset < now) limits.delete(k);
  const bucket = limits.get(key);
  if (!bucket || bucket.reset < now) {
    limits.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (++bucket.count > limit)
    throw Object.assign(
      Error("Hai inviato diverse richieste. Riprova tra qualche minuto."),
      { status: 429 },
    );
}
