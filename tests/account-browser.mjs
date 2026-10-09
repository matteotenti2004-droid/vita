import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.TEST_BASE_URL || "http://localhost:5173",
  host = "https://vyra-test.supabase.co",
  db = new Map(),
  users = new Map(),
  errors = [];
const uidA = "11111111-1111-4111-8111-111111111111",
  uidB = "22222222-2222-4222-8222-222222222222";
function user(email) {
  return {
    id: email === "a@example.test" ? uidA : uidB,
    email,
    aud: "authenticated",
    user_metadata: {
      name: email === "a@example.test" ? "Utente A" : "Utente B",
    },
    app_metadata: { provider: "email" },
    created_at: new Date().toISOString(),
  };
}
const jwt = (u) =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: u.id,
        aud: "authenticated",
        role: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url"),
    "testsignature",
  ].join(".");
async function setup() {
  const c = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
  });
  await c.route("**/.netlify/functions/config", (r) =>
    r.fulfill({
      json: {
        supabaseUrl: host,
        supabaseKey: "sb_publishable_test",
        aiConfigured: true,
      },
    }),
  );
  await c.route(host + "/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      method = req.method(),
      headers = req.headers();
    if (url.pathname.includes("/auth/v1/token")) {
      const input = req.postDataJSON(),
        u = user(input.email);
      users.set(u.id, u);
      return route.fulfill({
        json: {
          access_token: jwt(u),
          refresh_token: "test-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user: u,
        },
      });
    }
    if (url.pathname.includes("/auth/v1/logout"))
      return route.fulfill({ json: {} });
    const authorization = headers.authorization || "";
    let uid;
    try {
      uid = JSON.parse(
        Buffer.from(authorization.split(".")[1], "base64url").toString(),
      ).sub;
    } catch {
      return route.fulfill({ status: 401, json: { message: "Unauthorized" } });
    }
    if (url.pathname.includes("/auth/v1/user"))
      return route.fulfill({ json: users.get(uid) });
    if (url.pathname.includes("/rest/v1/user_spaces")) {
      const filter = url.searchParams.get("id");
      if (filter)
        assert.equal(
          filter,
          "eq." + uid,
          "Owner isolation enforced by request filter",
        );
      let row = db.get(uid);
      if (method === "GET") return route.fulfill({ json: row ? [row] : [] });
      const body = req.postDataJSON();
      if (method === "POST") {
        assert.equal(body.id, uid);
        if (row)
          return route.fulfill({
            status: 409,
            json: { code: "23505", message: "Duplicate" },
          });
        row = { ...body };
        db.set(uid, row);
        return route.fulfill({ status: 201, json: row });
      }
      if (method === "PATCH") {
        if (!row || url.searchParams.get("revision") !== `eq.${row.revision}`)
          return route.fulfill({ json: [] });
        row = { ...row, ...body };
        db.set(uid, row);
        return route.fulfill({
          json: headers.accept?.includes("object") ? row : [row],
        });
      }
    }
    return route.fulfill({ status: 404, json: { message: "Missing fixture" } });
  });
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  return { c, p };
}
async function go(p, route) {
  await p.evaluate((route) => (location.hash = route), route);
  await p.waitForTimeout(100);
}
async function login(p, email) {
  await go(p, "profile");
  await p
    .locator("#auth-form")
    .getByLabel("Email", { exact: true })
    .fill(email);
  await p
    .locator("#auth-form")
    .getByLabel("Password", { exact: true })
    .fill("test-password");
  await p.locator('#auth-form button[type="submit"]').click();
  await p
    .getByRole("button", { name: "Esci dall’account", exact: true })
    .waitFor();
  await p.waitForFunction(
    () =>
      document.querySelector("[data-sync-status]")?.textContent ===
      "Sincronizzato",
  );
}
let a, b;
try {
  a = await setup();
  await a.p.addInitScript(() => {
    if (!localStorage.getItem("vita-v1"))
      localStorage.setItem(
        "vita-v1",
        JSON.stringify({
          tasks: [{ id: 1, title: "Dati ospite", done: false }],
          habits: [],
          goals: [],
          notes: "Nota locale",
        }),
      );
  });
  await a.p.goto(base);
  await login(a.p, "a@example.test");
  await go(a.p, "tasks");
  assert.equal(
    await a.p.getByText("Dati ospite", { exact: true }).count(),
    0,
    "Guest data is not implicitly uploaded",
  );
  await go(a.p, "notes");
  await a.p.locator("#notes").fill("Prima nota cloud");
  await a.p.waitForTimeout(1100);
  assert.equal(db.get(uidA).data.notes, "Prima nota cloud");
  b = await setup();
  await b.p.goto(base);
  await login(b.p, "a@example.test");
  await go(b.p, "notes");
  assert.equal(await b.p.locator("#notes").inputValue(), "Prima nota cloud");
  await b.p.locator("#notes").fill("Nota dal dispositivo B");
  await b.p.waitForTimeout(1100);
  assert.equal(db.get(uidA).data.notes, "Nota dal dispositivo B");
  await a.p.locator("#notes").fill("Nota dal dispositivo A");
  await a.p.waitForTimeout(1100);
  await a.p.waitForFunction(
    () =>
      document.querySelector("[data-sync-status]")?.dataset.state ===
      "conflict",
  );
  assert.equal(
    db.get(uidA).data.notes,
    "Nota dal dispositivo B",
    "Concurrent update never silently overwrites",
  );
  await go(a.p, "profile");
  await a.p
    .getByRole("button", { name: "Ricarica i dati cloud", exact: true })
    .click();
  await go(a.p, "notes");
  assert.equal(
    await a.p.locator("#notes").inputValue(),
    "Nota dal dispositivo B",
  );
  await go(a.p, "profile");
  await a.p
    .getByRole("button", { name: "Esci dall’account", exact: true })
    .click();
  await a.p.locator("#auth-form").waitFor();
  await go(a.p, "notes");
  assert.equal(
    await a.p.locator("#notes").inputValue(),
    "Nota locale",
    "Logout restores guest space",
  );
  await login(a.p, "b@example.test");
  await go(a.p, "notes");
  assert.equal(
    await a.p.locator("#notes").inputValue(),
    "",
    "Account B never sees account A",
  );
  await a.p.locator("#notes").fill("Solo B");
  await a.p.waitForTimeout(1100);
  assert.equal(db.get(uidB).data.notes, "Solo B");
  assert.equal(db.get(uidA).data.notes, "Nota dal dispositivo B");
  await go(a.p, "assistant");
  await a.p.route("**/.netlify/functions/assistant", async (route) => {
    const data = route.request().postDataJSON();
    assert.equal(data.question, "Organizza la mia giornata");
    assert.match(route.request().headers().authorization, /^Bearer /);
    return route.fulfill({
      json: {
        reply: "Inizia con una sessione breve.",
        tasks: [
          {
            title: "Studiare inglese",
            date: "",
            priority: "Normale",
            minutes: 25,
          },
        ],
      },
    });
  });
  await a.p.locator("#ai-question").fill("Organizza la mia giornata");
  await a.p.getByRole("button", { name: "Invia domanda", exact: true }).click();
  await a.p
    .getByText("Inizia con una sessione breve.", { exact: true })
    .waitFor();
  assert.equal(
    db.get(uidB).data.tasks.length,
    0,
    "AI suggestions require confirmation",
  );
  await a.p.getByRole("button", { name: "Aggiungi", exact: true }).click();
  await a.p.waitForTimeout(1100);
  assert.equal(db.get(uidB).data.tasks[0].title, "Studiare inglese");
  await go(a.p, "tasks");
  await a.p
    .getByRole("button", { name: "Completa Studiare inglese", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: email login via Supabase SDK, guest isolation, account isolation, cloud insert/update, cross-device loading, revision conflicts, explicit conflict recovery, logout, authenticated AI proposal and confirmed task. Services mocked; production credentials still required.",
  );
} finally {
  await a?.c.close();
  await b?.c.close();
  await browser.close();
}
