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
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    timezoneId: "Europe/Rome",
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (err) => errors.push(err.message));
page.on("dialog", (d) => d.accept());
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Europe/Rome",
});
async function go(route) {
  await page.evaluate((route) => (location.hash = route), route);
  await page.waitForTimeout(80);
}
const input = (name) =>
  page.locator("#entry").getByLabel(name, { exact: true });
const submit = () => page.locator('#entry button[type="submit"]').click();
try {
  await page.addInitScript(() => {
    if (!localStorage.getItem("vita-v1"))
      localStorage.setItem(
        "vita-v1",
        JSON.stringify({
          tasks: [
            {
              id: 1,
              title: "Attività da Vita",
              done: false,
              category: "Personale",
              date: "",
              priority: "Normale",
            },
          ],
          habits: [{ id: 2, name: "Leggere", days: ["2026-10-01"] }],
          goals: [{ id: 3, name: "Obiettivo da Vita", progress: 30 }],
          notes: "Appunti da conservare",
        }),
      );
  });
  await page.goto(base);
  await page.getByText("Attività da Vita", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("vita-v1")).notes,
    ),
    "Appunti da conservare",
  );
  await go("projects");
  await page.locator('.page-heading [data-action="new-project"]').click();
  await input("Nome progetto").fill("La mia formazione");
  await input("Descrizione").fill("Competenze per il futuro");
  await submit();
  await go("tasks");
  await page.locator('.page-heading [data-action="new-task"]').click();
  await input("Cosa vuoi fare?").fill("Preparare la settimana");
  await input("Tempo dedicato (minuti)").fill("45");
  await input("Scadenza").fill(today);
  await input("Orario").fill("09:00");
  await input("Progetto").selectOption({ label: "La mia formazione" });
  await submit();
  await page
    .getByRole("button", {
      name: "Completa Preparare la settimana",
      exact: true,
    })
    .click();
  await page.reload();
  await go("tasks");
  await page.locator('[data-action="task-filter"][data-value="done"]').click();
  await page
    .getByRole("button", { name: "Riapri Preparare la settimana", exact: true })
    .waitFor();
  await go("goals");
  await page
    .getByLabel("Progresso Obiettivo da Vita", { exact: true })
    .fill("65");
  await page
    .getByLabel("Progresso Obiettivo da Vita", { exact: true })
    .dispatchEvent("change");
  await page.getByText("65%", { exact: true }).waitFor();
  await go("habits");
  await page
    .getByRole("button", { name: "Completa Leggere oggi", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Annulla Leggere oggi", exact: true })
    .waitFor();
  await go("finance");
  await page
    .getByRole("button", { name: "Budget e risparmi", exact: true })
    .click();
  await page
    .locator("#budget-form")
    .getByLabel("Budget mensile (€)", { exact: true })
    .fill("600");
  await page
    .locator("#budget-form")
    .getByLabel("Obiettivo di risparmio (€)", { exact: true })
    .fill("3000");
  await page.locator("#budget-form button.primary").click();
  for (const [name, type, amount] of [
    ["Stipendio", "income", "2400"],
    ["Spesa", "expense", "120"],
    ["Fondo viaggi", "saving", "300"],
  ]) {
    await page.locator('.page-heading [data-action="new-transaction"]').click();
    await input("Descrizione").fill(name);
    await input("Tipo").selectOption(type);
    await input("Importo (€)").fill(amount);
    await submit();
  }
  const values = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("vyra-v2"));
    return { tx: s.transactions, budget: s.budget };
  });
  assert.equal(values.tx.length, 3);
  assert.equal(values.budget, 600);
  assert.match(await page.locator(".metrics").innerText(), /1[.]?980/);
  await go("nutrition");
  await page.locator('.page-heading [data-action="new-meal"]').click();
  await input("Alimento").fill("Yogurt greco 0%");
  await input("Quantità (grammi)").fill("200");
  await input("Pasto").selectOption("Colazione");
  assert.match(await page.locator("#meal-preview").innerText(), /118 kcal/);
  await submit();
  assert.match(await page.locator(".metrics").innerText(), /118 kcal/);
  await page.locator('.page-heading [data-action="new-meal"]').click();
  await input("Alimento").fill("Il mio prodotto");
  await input("Quantità (grammi)").fill("50");
  await input("Calorie / 100 g").fill("200");
  await input("Proteine / 100 g").fill("10");
  await input("Carboidrati / 100 g").fill("20");
  await input("Grassi / 100 g").fill("5");
  await submit();
  assert.match(await page.locator(".metrics").innerText(), /218 kcal/);
  await go("health");
  await page.locator('.page-heading [data-action="new-workout"]').click();
  await input("Allenamento").fill("Camminata");
  await input("Durata (minuti)").fill("40");
  await submit();
  await page.getByText("Camminata", { exact: true }).waitFor();
  await go("study");
  await page.locator('.page-heading [data-action="new-study"]').click();
  await input("Argomento").fill("Inglese");
  await input("Durata (minuti)").fill("30");
  await submit();
  await go("wishlist");
  await page.route("**/.netlify/functions/product", (route) =>
    route.fulfill({
      json: {
        name: "Cuffie wireless",
        price: 49.9,
        currency: "EUR",
        image: "https://shop.example/image.jpg",
      },
    }),
  );
  await page.locator('.page-heading [data-action="new-wish"]').click();
  await input("Link del prodotto").fill("https://shop.example/product");
  await page
    .getByRole("button", { name: "Recupera informazioni dal link" })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector('#entry [name="name"]').value ===
      "Cuffie wireless",
  );
  await submit();
  await page.getByText("Cuffie wireless", { exact: true }).waitFor();
  await page.locator('[data-action="wish-status"]').click();
  await page.getByRole("button", { name: "Acquistato", exact: true }).waitFor();
  await go("trips");
  await page.locator('.page-heading [data-action="new-trip"]').click();
  await input("Destinazione").fill("Dolomiti");
  await input("Partenza").fill(today);
  await input("Ritorno").fill(today);
  await input("Budget (€)").fill("500");
  await input("Speso (€)").fill("150");
  await input("Itinerario e appunti").fill("Due giorni in montagna");
  await submit();
  await page.getByRole("button", { name: "Aggiungi alla checklist" }).click();
  await page
    .locator("#trip-check-form")
    .getByLabel("Cosa vuoi ricordare?")
    .fill("Prenotare alloggio");
  await page.locator("#trip-check-form button.primary").click();
  await page
    .getByRole("button", { name: "Completa Prenotare alloggio", exact: true })
    .click();
  await go("calendar");
  await page
    .getByText("Preparare la settimana", { exact: true })
    .first()
    .waitFor();
  await page.getByText("Dolomiti", { exact: true }).first().waitFor();
  await go("notes");
  assert.equal(
    await page.locator("#notes").inputValue(),
    "Appunti da conservare",
  );
  await page.locator("#notes").fill("I miei nuovi appunti");
  await page.reload();
  assert.equal(
    await page.locator("#notes").inputValue(),
    "I miei nuovi appunti",
  );
  await go("stats");
  assert.match(await page.locator(".metrics").innerText(), /1,3 h/);
  assert.equal(await page.locator("svg.chart").count(), 5);
  await page.locator('[data-action="stats-range"][data-days="30"]').click();
  await go("profile");
  await page
    .locator("#profile-form")
    .getByLabel("Nome", { exact: true })
    .fill("Matteo");
  await page
    .locator("#profile-form")
    .getByLabel("Una frase che ti rappresenta")
    .fill("Un passo alla volta.");
  await page.locator('#profile-form button[type="submit"]').click();
  await go("settings");
  await page.getByRole("button", { name: "Scuro", exact: true }).click();
  await page.getByRole("button", { name: "Lavanda", exact: true }).click();
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(
    await page.locator("html").getAttribute("data-palette"),
    "violet",
  );
  await page.getByRole("button", { name: "Chiaro", exact: true }).click();
  await page.getByRole("button", { name: "Oceano", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Esporta una copia dei dati" })
    .click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^vyra-/);
  await page.locator('#import-file').setInputFiles(await download.path());
  await page.getByText('Copia importata.', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('vyra-v2')).notes), 'I miei nuovi appunti');
  await go('tasks');
  await page.locator('[data-action="task-filter"][data-value="all"]').click();
  await page.getByRole('button', {name:'Modifica Preparare la settimana',exact:true}).click();
  await input('Categoria').selectOption('Lavoro');
  await submit();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('vyra-v2')).tasks.find(t=>t.title==='Preparare la settimana').category), 'Lavoro');
  await page.evaluate(() => {window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='vyra-v2')throw new Error('Quota exceeded');window.savedSetItem.call(this,key,value)}});
  await page.locator('.page-heading [data-action="new-task"]').click();
  await input('Cosa vuoi fare?').fill('Verifica salvataggio');
  await submit();
  await page.getByText('Quota exceeded', {exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vyra-v2')).tasks.filter(t=>t.title==='Verifica salvataggio').length),0);
  await page.evaluate(()=>{Storage.prototype.setItem=window.savedSetItem});
  await submit();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vyra-v2')).tasks.filter(t=>t.title==='Verifica salvataggio').length),1);
  await page.getByRole('button',{name:'Elimina Verifica salvataggio',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('vyra-v2')).tasks.filter(t=>t.title==='Verifica salvataggio').length),0);
  await page
    .getByRole("button", { name: "Cerca attività, obiettivi, viaggi…" })
    .click();
  await page.locator("#global-search").fill("Dolomiti");
  await page.locator(".search-result").getByText("Dolomiti").waitFor();
  await page.locator(".search-result").click();
  assert.equal(await page.locator("h1").textContent(), "Viaggi");
  await go("dashboard");
  await page.screenshot({ path: "/tmp/vyra-desktop.png", fullPage: true });
  for (const width of [390, 760, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "dashboard",
      "calendar",
      "tasks",
      "goals",
      "projects",
      "finance",
      "health",
      "nutrition",
      "habits",
      "wishlist",
      "trips",
      "study",
      "notes",
      "stats",
      "profile",
      "settings",
      "assistant",
    ]) {
      await go(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, `Overflow ${route} at ${width}`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go("dashboard");
  await page.getByRole("button", { name: "Apri menu", exact: true }).click();
  await page.locator('.sidebar [data-page="stats"]').click();
  assert.equal(await page.locator("h1").textContent(), "Statistiche");
  await go("dashboard");
  await page.screenshot({ path: "/tmp/vyra-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: migration, tasks/projects, goals/habits, finances, food/macros, workouts/study, wishlist, trips/checklist, calendar, notes, statistics, profile, themes, export, search, 51 responsive route checks.",
  );
} finally {
  await context.close();
  await browser.close();
}
