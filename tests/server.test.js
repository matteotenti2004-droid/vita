import test from "node:test";
import assert from "node:assert/strict";
import { publicIP, validateURL, metadata } from "../netlify/lib/products.js";
import { handler as assistant } from "../netlify/functions/assistant.js";
import { handler as config } from "../netlify/functions/config.js";
import { handler as product } from "../netlify/functions/product.js";
import { requestBody, rateLimit } from "../netlify/lib/http.js";
const event = (body) => ({
  httpMethod: "POST",
  headers: { origin: "https://vyra.example", host: "vyra.example" },
  body: JSON.stringify(body),
});
test("Product fetching blocks private, loopback, link-local, mapped IPv6 and reserved addresses", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.1.2",
    "192.168.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "198.18.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
  ])
    assert.equal(publicIP(ip), false, ip);
  assert.equal(publicIP("8.8.8.8"), true);
  assert.equal(publicIP("2606:4700:4700::1111"), true);
});
test("Product endpoint rejects non-HTTPS, IP and local destinations before any fetch", async () => {
  for (const url of [
    "http://example.com",
    "https://127.0.0.1",
    "https://[::1]",
    "https://host.local",
    "https://user:pass@example.com",
    "file:///etc/passwd",
  ])
    await assert.rejects(validateURL(url));
});
test("Structured Product metadata extracts real price, currency and image", () => {
  const html =
    '<script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Cuffie","image":["/photo.jpg"],"offers":{"price":"49.90","priceCurrency":"EUR"}}]}</script>';
  assert.deepEqual(metadata(html, "https://shop.example/p"), {
    name: "Cuffie",
    price: 49.9,
    currency: "EUR",
    image: "https://shop.example/photo.jpg",
  });
});
test("OpenGraph fallback preserves missing prices and rejects script images", () => {
  const html =
    '<meta content="Un prodotto &amp; un nome" property="og:title"><meta property="og:image" content="javascript:alert(1)">';
  const result = metadata(html, "https://shop.example");
  assert.equal(result.name, "Un prodotto & un nome");
  assert.equal(result.price, null);
  assert.equal(result.image, "");
});
test("Same-origin restriction, body size and methods are enforced for server functions", () => {
  assert.throws(
    () =>
      requestBody({
        ...event({}),
        headers: { origin: "https://evil.example", host: "vyra.example" },
      }),
    /non consentita/,
  );
  assert.throws(
    () => requestBody({ ...event({}), httpMethod: "GET" }),
    /Metodo/,
  );
  assert.throws(
    () => requestBody({ ...event({}), body: "a".repeat(16001) }),
    /troppo lunga/,
  );
  assert.throws(
    () => requestBody({ ...event({}), body: "not json" }),
    /non valida/,
  );
});
test("Rate limiting stops repeated requests in the same worker", () => {
  rateLimit("test", 1);
  assert.throws(
    () => rateLimit("test", 1),
    (e) => e.status === 429,
  );
});
test("Missing OpenAI credentials return an explicit setup requirement, no fake answer", async () => {
  const key = process.env.VYRA_AI_API_KEY;
  delete process.env.VYRA_AI_API_KEY;
  const r = await assistant(event({ question: "Organizza la giornata" }));
  assert.equal(r.statusCode, 503);
  assert.match(JSON.parse(r.body).error, /attivato/);
  if (key) process.env.VYRA_AI_API_KEY = key;
});
test("Runtime config never exposes an AI key or Supabase service role key", async () => {
  const prev = { ...process.env };
  process.env.VYRA_AI_API_KEY = "test-only-key";
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "sb_secret_test";
  const r = await config({ httpMethod: "GET" }),
    data = JSON.parse(r.body);
  assert.equal(data.supabaseKey, "");
  assert.equal(data.aiConfigured, true);
  assert.ok(!r.body.includes("test-only-key"));
  for (const key of ["VYRA_AI_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"]) {
    if (prev[key]) process.env[key] = prev[key];
    else delete process.env[key];
  }
});
test("AI validates authentication, context limits and real upstream replies, preserving confirmation tasks", async () => {
  const oldFetch = global.fetch,
    old = { ...process.env };
  process.env.VYRA_AI_API_KEY = "test-only-key";
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "sb_publishable_test";
  try {
    let calls = 0;
    global.fetch = async (url, opts) => {
      calls++;
      if (String(url).includes("/auth/"))
        return new Response(JSON.stringify({ id: "test-owner" }), {
          status: 200,
        });
      const payload = JSON.parse(opts.body);
      assert.equal(payload.model, "gpt-4o-mini");
      assert.equal(payload.messages.at(-1).content, "Organizza");
      assert.ok(payload.response_format.json_schema.strict);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  reply: "Comincia dalla priorità più vicina.",
                  tasks: [
                    {
                      title: "Studiare",
                      date: "",
                      priority: "Alta",
                      minutes: 30,
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    };
    const unauth = await assistant(event({ question: "Organizza" }));
    assert.equal(unauth.statusCode, 401);
    assert.equal(calls, 0);
    const r = await assistant({
      ...event({ question: "Organizza" }),
      headers: {
        ...event({}).headers,
        authorization: "Bearer " + "x".repeat(25),
      },
    });
    assert.equal(r.statusCode, 200);
    assert.equal(JSON.parse(r.body).tasks[0].minutes, 30);
    assert.equal(calls, 2);
  } finally {
    global.fetch = oldFetch;
    for (const key of [
      "VYRA_AI_API_KEY",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
    ]) {
      if (old[key]) process.env[key] = old[key];
      else delete process.env[key];
    }
  }
});
test("Product requests reject untrusted origins and localhost links", async () => {
  const r = await product({
    ...event({ url: "https://127.0.0.1" }),
    headers: { origin: "https://other.example", host: "vyra.example" },
  });
  assert.equal(r.statusCode, 403);
  const blocked = await product(event({ url: "https://127.0.0.1" }));
  assert.equal(blocked.statusCode, 422);
});

test("Config diagnostics distinguish missing variables, malformed URL and wrong key without exposing rejected values", async () => {
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const previous = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  try {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    let data = JSON.parse((await config({ httpMethod: "GET" })).body);
    assert.equal(data.diagnostics.status, "missing_variables");
    assert.deepEqual(data.diagnostics.missingVariables, names);
    process.env.SUPABASE_URL = "project-id-only";
    process.env.SUPABASE_ANON_KEY = "sb_publishable_test";
    data = JSON.parse((await config({ httpMethod: "GET" })).body);
    assert.equal(data.diagnostics.status, "invalid_url");
    assert.equal(data.supabaseKey, "");
    process.env.SUPABASE_URL = "https://project.supabase.co";
    process.env.SUPABASE_ANON_KEY = "sb_secret_do-not-expose";
    const reply = (await config({ httpMethod: "GET" })).body;
    data = JSON.parse(reply);
    assert.equal(data.diagnostics.status, "invalid_key");
    assert.equal(reply.includes("do-not-expose"), false);
  } finally {
    for (const key of names) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("Copied public configuration tolerates whitespace and a trailing slash, normalizing the project origin", async () => {
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const previous = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  try {
    process.env.SUPABASE_URL = "  https://project.supabase.co/\n";
    process.env.SUPABASE_ANON_KEY = " sb_publishable_test \n";
    const data = JSON.parse((await config({ httpMethod: "GET" })).body);
    assert.equal(data.diagnostics.status, "ready");
    assert.equal(data.supabaseUrl, "https://project.supabase.co");
    assert.equal(data.supabaseKey, "sb_publishable_test");
  } finally {
    for (const key of names) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("Legacy anon JWT is supported while service_role JWT is rejected without leaking it", async () => {
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const previous = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  try {
    process.env.SUPABASE_URL = "https://project.supabase.co";
    const token = (role) =>
      "test." +
      Buffer.from(JSON.stringify({ role })).toString("base64url") +
      ".test";
    process.env.SUPABASE_ANON_KEY = token("anon");
    let data = JSON.parse((await config({ httpMethod: "GET" })).body);
    assert.equal(data.diagnostics.status, "ready");
    process.env.SUPABASE_ANON_KEY = token("service_role");
    data = JSON.parse((await config({ httpMethod: "GET" })).body);
    assert.equal(data.diagnostics.status, "invalid_key");
    assert.equal(data.supabaseKey, "");
  } finally {
    for (const key of names) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("Gemini uses a server-only key, structured replies and never falls back to paid OpenAI", async () => {
  const oldFetch = global.fetch;
  const keys = ["GEMINI_API_KEY", "VYRA_AI_PROVIDER", "VYRA_AI_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const old = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, {GEMINI_API_KEY:"gemini-secret-test", VYRA_AI_PROVIDER:"gemini", VYRA_AI_API_KEY:"paid-key-test", SUPABASE_URL:"https://project.supabase.co", SUPABASE_ANON_KEY:"sb_publishable_test"});
  try {
    const c = JSON.parse((await config({httpMethod:"GET"})).body);
    assert.equal(c.aiProvider, "Gemini");
    assert.ok(!JSON.stringify(c).includes("gemini-secret-test"));
    let exhausted = false, calls = 0;
    global.fetch = async (url, options) => {
      if (String(url).includes("/auth/")) return new Response(JSON.stringify({id:"gemini-owner"}));
      calls++;
      assert.ok(String(url).startsWith("https://generativelanguage.googleapis.com/"));
      assert.ok(!String(url).includes("gemini-secret-test"));
      assert.equal(options.headers["x-goog-api-key"], "gemini-secret-test");
      const body = JSON.parse(options.body);
      assert.equal(body.contents.at(-1).parts[0].text, "Organizza");
      assert.equal(body.generationConfig.responseMimeType, "application/json");
      if (exhausted) return new Response("{}", {status:429});
      return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({reply:"Inizia da qui",tasks:[{title:"Studia",date:"",priority:"Alta",minutes:30}]})}]}}]}));
    };
    const req = {...event({question:"Organizza"}), headers:{...event({}).headers,authorization:"Bearer " + "x".repeat(25)}};
    const reply = await assistant(req);
    assert.equal(reply.statusCode, 200);
    assert.equal(JSON.parse(reply.body).tasks[0].title, "Studia");
    exhausted = true;
    const limited = await assistant(req);
    assert.equal(limited.statusCode, 429);
    assert.match(JSON.parse(limited.body).error, /non viene usato OpenAI/);
    assert.equal(calls, 2);
  } finally {
    global.fetch = oldFetch;
    for (const key of keys) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; }
  }
});
