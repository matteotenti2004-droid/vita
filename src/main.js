import "./style.css";
import {
  load,
  initial,
  normalize,
  dayKey,
  id,
  finance,
  nutrition,
  history,
  safeURL,
} from "./store.js";
import {
  cloud,
  initCloud,
  saveData,
  authenticate,
  resetPassword,
  newPassword,
  signOut,
  resolveCloud,
  bearer,
} from "./cloud.js";
import { icon, logo } from "./icons.js";
import { e, decimal, money, bars, ring, donut } from "./charts.js";
import { foods, portion } from "./foods.js";
let state = load(),
  page = location.hash.slice(1) || "dashboard",
  month = new Date().getMonth(),
  year = new Date().getFullYear();
const ui = {
  selectedDate: dayKey(),
  nutritionDate: dayKey(),
  financeMonth: dayKey().slice(0, 7),
  taskFilter: "open",
  taskQuery: "",
  project: "",
  statsDays: 7,
  more: false,
  menu: false,
  authMode: "login",
  messages: [],
  aiBusy: false,
};
const routes = {
  dashboard: ["Panoramica", "home"],
  calendar: ["Calendario", "calendar"],
  tasks: ["Attività", "tasks"],
  goals: ["Obiettivi", "goals"],
  projects: ["Progetti", "projects"],
  finance: ["Finanze", "finance"],
  health: ["Salute e fitness", "health"],
  study: ["Studio e formazione", "study"],
  notes: ["Note e archivio", "notes"],
  stats: ["Statistiche", "stats"],
  settings: ["Impostazioni", "settings"],
  habits: ["Abitudini", "leaf"],
  nutrition: ["Alimentazione", "food"],
  wishlist: ["Lista desideri", "bag"],
  trips: ["Viaggi", "plane"],
  assistant: ["Assistente AI", "spark"],
  profile: ["Profilo personale", "user"],
};
const summaries = {
  dashboard:
    "Una vita più intenzionale. Tutto ciò che conta, in un unico spazio.",
  tasks: "Dai una direzione alla tua giornata, un’attività alla volta.",
  calendar: "Trova spazio per le tue priorità e per te.",
  goals: "Piccoli passi, una direzione chiara.",
  finance: "Le tue entrate, le tue scelte, il tuo futuro.",
  health: "Prenditi cura della tua energia.",
  nutrition: "Il tuo diario alimentare, un pasto alla volta.",
  habits: "La costanza comincia dalle piccole cose.",
  wishlist: "Meno acquisti impulsivi, più desideri consapevoli.",
  trips: "La prossima avventura inizia qui.",
  stats: "Uno sguardo ai tuoi progressi, basato sui tuoi dati.",
  profile: "Uno spazio che parla di te.",
  settings: "Rendi VYRA il tuo spazio.",
  projects: "Dalle idee alle cose fatte.",
  study: "Investi nel tuo domani, una sessione alla volta.",
  notes: "Un posto per liberare la mente.",
  assistant: "Più chiarezza, meno pensieri sparsi.",
};
const fmtDate = (s) =>
  s
    ? new Date(s + "T12:00:00").toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
      })
    : "Senza scadenza";
const today = () => dayKey();
const button = (text, action, ic = "plus", cls = "primary", extra = "") =>
  `<button class="${cls}" data-action="${action}" ${extra}>${icon(ic)}${text}</button>`;
const link = (text, target) =>
  `<button class="text-button" data-page="${target}">${text}${icon("chevron")}</button>`;
const empty = (title, text, ic = "leaf") =>
  `<div class="empty">${icon(ic)}<strong>${title}</strong><p>${text}</p></div>`;
const panel = (title, body, aside = "", cls = "") =>
  `<article class="panel ${cls}"><div class="panel-title"><h2>${title}</h2>${aside}</div>${body}</article>`;
const progress = (n) =>
  `<div class="progress"><span style="width:${Math.min(100, Math.max(0, n))}%"></span></div>`;
const metric = (label, value, sub, ic, cls = "", target = "") =>
  `<${target ? "button" : "article"} class="metric ${cls}" ${target ? `data-page="${target}"` : ""}><span class="metric-icon">${icon(ic)}</span><div><span>${label}</span><strong>${value}</strong><small>${sub}</small></div></${target ? "button" : "article"}>`;
const statusText = () =>
  ui.saveError
    ? "Salvataggio non riuscito · esporta i dati"
    : {
        local: "Salvato sul dispositivo",
        loading: "Caricamento account…",
        synced: "Sincronizzato",
        pending: "Sincronizzazione…",
        offline: "Salvato sul dispositivo · offline",
        conflict: "Sincronizzazione da risolvere",
        error: "Account non disponibile",
      }[cloud.status];
function save() {
  try {
    saveData(state);
    ui.saveError = false;
    updateStatus();
    return true;
  } catch (err) {
    ui.saveError = true;
    updateStatus();
    toast(
      err.message ||
        "Impossibile salvare. Esporta i dati prima di chiudere il sito.",
      "error",
    );
    return false;
  }
}
function toast(message, type = "") {
  let el = document.querySelector("#toast");
  el.textContent = message;
  el.className = `toast visible ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = "toast"), 6000);
}
function go(target) {
  if (!routes[target]) return;
  page = target;
  ui.menu = false;
  ui.more =
    ["wishlist", "trips", "assistant", "profile"].includes(page) || ui.more;
  location.hash = target;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function updateStatus() {
  document.querySelectorAll("[data-sync-status]").forEach((el) => {
    el.textContent = statusText();
    el.dataset.state = cloud.status;
  });
}
function applyTheme() {
  document.documentElement.dataset.theme =
    state.settings.theme === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : state.settings.theme;
  document.documentElement.dataset.palette = state.settings.palette;
}
function avatar(size = "") {
  const src = safeURL(state.profile.photo, true);
  return `<span class="avatar ${size}">${
    src
      ? `<img src="${e(src)}" alt="Foto profilo" referrerpolicy="no-referrer">`
      : e(
          state.profile.name
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase(),
        )
  }</span>`;
}
function navItem(target) {
  return `<button data-page="${target}" class="nav-item ${page === target ? "active" : ""}" ${page === target ? 'aria-current="page"' : ""}>${icon(routes[target][1])}<span>${routes[target][0]}</span>${target === "tasks" && state.tasks.some((t) => !t.done) ? `<b>${state.tasks.filter((t) => !t.done).length}</b>` : ""}</button>`;
}
function render() {
  if (!routes[page]) page = "dashboard";
  applyTheme();
  document.title = `${routes[page][0]} · VYRA`;
  document.querySelector("#app").innerHTML =
    `<button class="menu-shade ${ui.menu ? "show" : ""}" data-action="menu" aria-label="Chiudi menu"></button><aside class="sidebar ${ui.menu ? "show" : ""}"><button class="brand" data-page="dashboard">${logo()}<span>VYRA<small>La vita, organizzata.</small></span></button><div class="nav-caption">IL TUO LIFE OS</div><nav aria-label="Menu principale">${["dashboard", "calendar", "tasks", "goals", "projects", "finance", "health", "study", "notes"].map(navItem).join("")}<button class="nav-item ${["wishlist", "trips", "assistant", "profile"].includes(page) ? "section-active" : ""}" data-action="more" aria-expanded="${ui.more}">${icon("grid")}<span>Altre sezioni</span>${icon("chevronDown", "chevron " + (ui.more ? "rotated" : ""))}</button>${ui.more ? `<div class="subnav">${["wishlist", "trips", "assistant", "profile"].map(navItem).join("")}</div>` : ""}${navItem("stats")}</nav><div class="sidebar-bottom">${navItem("settings")}<div class="sidebar-quote"><p>Piccoli passi oggi.<br>Una vita più tua,<br>domani.</p><span></span></div><button class="sidebar-profile" data-page="profile">${avatar()}<span>${e(state.profile.name)}<small>${cloud.user ? "Account connesso" : "Spazio personale"}</small></span>${icon("chevron")}</button></div></aside><div class="main-shell"><header class="topbar"><button class="icon-button mobile-menu" data-action="menu" aria-label="Apri menu">${icon("menu")}</button><button class="search-trigger" data-action="search">${icon("search")}<span>Cerca attività, obiettivi, viaggi…</span><kbd>Ctrl K</kbd></button><div class="topbar-right"><span class="top-date">${icon("calendar")}${new Date().toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}</span><button class="icon-button notification" data-action="notifications" aria-label="Scadenze e promemoria">${icon("bell")}${state.tasks.some((t) => !t.done && t.date && t.date <= today()) ? "<i></i>" : ""}</button><button class="profile-button" data-page="profile" aria-label="Apri il tuo profilo">${avatar()}${icon("chevronDown")}</button></div></header><main><div class="breadcrumb">Il mio spazio ${icon("chevron")} ${routes[page][0]}<span data-sync-status data-state="${cloud.status}">${statusText()}</span></div>${page !== "dashboard" ? `<section class="page-heading"><div><p class="eyebrow">IL TUO LIFE OS</p><h1>${routes[page][0]}</h1><p>${summaries[page]}</p></div>${pageAction()}</section>` : ""}${cloud.status === "loading" ? '<div class="notice">Caricamento sicuro dei dati dell’account. Attendi prima di apportare modifiche.</div>' : ""}${["offline", "conflict", "error"].includes(cloud.status) ? `<div class="notice warn">${e(cloud.error)} ${link("Apri profilo", "profile")}</div>` : ""}<div id="page-content">${view()}</div><footer><span>${logo()} VYRA · La vita, organizzata.</span><span>Un passo alla volta.</span></footer></main></div><dialog id="dialog"></dialog><div id="toast" class="toast" role="status"></div>`;
  document.querySelectorAll("img").forEach(
    (img) =>
      (img.onerror = () => {
        img.hidden = true;
        img.parentElement.classList.add("image-unavailable");
      }),
  );
}
function pageAction() {
  const mapping = {
    tasks: ["Nuova attività", "new-task"],
    goals: ["Nuovo obiettivo", "new-goal"],
    projects: ["Nuovo progetto", "new-project"],
    finance: ["Nuovo movimento", "new-transaction"],
    health: ["Registra allenamento", "new-workout"],
    nutrition: ["Aggiungi alimento", "new-meal"],
    habits: ["Nuova abitudine", "new-habit"],
    wishlist: ["Aggiungi desiderio", "new-wish"],
    trips: ["Nuovo viaggio", "new-trip"],
    study: ["Registra sessione", "new-study"],
  };
  return mapping[page] ? button(...mapping[page]) : "";
}
function taskList(items, compact = false) {
  return items.length
    ? `<div class="task-list">${items.map((t) => `<div class="task-row"><button class="check ${t.done ? "checked" : ""}" data-action="toggle-task" data-id="${e(t.id)}" aria-label="${t.done ? "Riapri" : "Completa"} ${e(t.title)}">${t.done ? icon("check") : ""}</button><div class="task-copy ${t.done ? "done" : ""}"><strong>${e(t.title)}</strong><small>${e(t.category)}${t.date ? ` · <span class="${!t.done && t.date < today() ? "overdue" : ""}">${fmtDate(t.date)}</span>` : ""}${t.time ? " · " + e(t.time) : ""}${t.minutes ? " · " + t.minutes + " min" : ""}</small></div><span class="tag ${t.priority === "Alta" ? "danger" : t.priority === "Bassa" ? "neutral" : "amber"}">${e(t.priority)}</span><button class="icon-button row-edit" data-action="edit-task" data-id="${e(t.id)}" aria-label="Modifica ${e(t.title)}">${icon("edit")}</button>${!compact ? `<button class="icon-button" data-action="delete" data-kind="tasks" data-id="${e(t.id)}" aria-label="Elimina ${e(t.title)}">${icon("trash")}</button>` : ""}</div>`).join("")}</div>`
    : empty(
        "Spazio alle tue priorità",
        "Aggiungi un’attività e inizia dal prossimo piccolo passo.",
        "tasks",
      );
}
function habitList(limit = 100) {
  return state.habits.length
    ? state.habits
        .slice(0, limit)
        .map(
          (h) =>
            `<div class="habit-row"><span class="soft-icon">${icon("leaf")}</span><div><strong>${e(h.name)}</strong><small>${h.days.length} giorni registrati</small></div><button class="check ${h.days.includes(today()) ? "checked" : ""}" data-action="toggle-habit" data-id="${e(h.id)}" aria-label="${h.days.includes(today()) ? "Annulla" : "Completa"} ${e(h.name)} oggi">${h.days.includes(today()) ? icon("check") : ""}</button>${page === "habits" ? `<button class="icon-button" data-action="edit-habit" data-id="${e(h.id)}" aria-label="Modifica ${e(h.name)}">${icon("edit")}</button><button class="icon-button" data-action="delete" data-kind="habits" data-id="${e(h.id)}" aria-label="Elimina ${e(h.name)}">${icon("trash")}</button>` : ""}</div>`,
        )
        .join("")
    : empty(
        "Il tuo prossimo rituale",
        "Scegli qualcosa di piccolo da ripetere ogni giorno.",
        "leaf",
      );
}
function goalList(compact = false) {
  return state.goals.length
    ? state.goals
        .slice(0, compact ? 3 : 10000)
        .map(
          (g) =>
            `<div class="goal-row"><span class="soft-icon blue">${icon("goals")}</span><div><strong>${e(g.name)}</strong><small>${g.date ? "Entro il " + fmtDate(g.date) : "Ogni passo conta"}</small><div class="goal-progress">${progress(g.progress)}<span>${decimal(g.progress)}%</span></div>${!compact ? `<label class="sr-only" for="goal-${e(g.id)}">Progresso ${e(g.name)}</label><input class="goal-slider" id="goal-${e(g.id)}" type="range" min="0" max="100" value="${g.progress}" data-goal="${e(g.id)}">` : ""}</div>${!compact ? `<button class="icon-button" data-action="edit-goal" data-id="${e(g.id)}" aria-label="Modifica ${e(g.name)}">${icon("edit")}</button><button class="icon-button" data-action="delete" data-kind="goals" data-id="${e(g.id)}" aria-label="Elimina ${e(g.name)}">${icon("trash")}</button>` : ""}</div>`,
        )
        .join("")
    : empty(
        "Dove vuoi arrivare?",
        "Scegli una meta: la strada comincia da qui.",
        "goals",
      );
}
function weekDates() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setDate(x.getDate() + i);
    return {
      key: dayKey(x),
      day: x.toLocaleDateString("it-IT", { weekday: "short" }),
      number: x.getDate(),
    };
  });
}
function dashboard() {
  const f = finance(state),
    todayTasks = state.tasks
      .filter((t) => !t.done && (!t.date || t.date <= today()))
      .sort((a, b) => (a.priority === "Alta" ? -1 : 1));
  const habitsDone = state.habits.filter((h) =>
      h.days.includes(today()),
    ).length,
    week = weekDates(),
    workouts = state.workouts.filter(
      (w) => w.date >= week[0].key && w.date <= today(),
    ).length;
  const hourly = new Date().getHours(),
    greeting =
      hourly < 12
        ? "Buongiorno"
        : hourly < 18
          ? "Buon pomeriggio"
          : "Buonasera";
  return `<section class="welcome"><div><p class="eyebrow">IL TUO SPAZIO, IL TUO RITMO</p><h1>${greeting}, ${e(state.profile.name.split(" ")[0])}.</h1><p>${summaries.dashboard}</p><button class="welcome-ai" data-page="assistant">${icon("spark")} Pianifica con il tuo assistente ${icon("arrow")}</button></div><span class="welcome-motto">YOUR LIFE OS<br>ALL IN ONE PLACE.<i></i></span></section><section class="metrics five">${metric("Attività da fare", todayTasks.length, "Oggi e da pianificare", "goals", "blue", "tasks")}${metric("Obiettivi", `${state.goals.filter((g) => g.progress === 100).length}<small> / ${state.goals.length}</small>`, "Completati", "stats", "", "goals")}${metric("Budget mensile", state.budget ? decimal(f.budgetUsed) + "%" : "—", state.budget ? "Utilizzato · " + money(state.budget) : "Imposta il tuo budget", "finance", "", "finance")}${metric("Allenamenti", workouts, "Questa settimana", "health", "coral", "health")}${metric("Abitudini", `${habitsDone}<small> / ${state.habits.length}</small>`, "Completate oggi", "leaf", "", "habits")}</section><section class="dashboard-grid">${panel("La tua settimana", `<div class="week-strip">${week.map((d) => `<button class="${d.key === ui.selectedDate ? "selected" : ""}" data-action="select-day" data-date="${d.key}"><span>${d.day}</span><strong>${d.number}</strong></button>`).join("")}</div><div class="agenda">${agenda(ui.selectedDate, true)}</div>`, link("Calendario", "calendar"))}${panel("Le tue priorità", taskList(todayTasks.slice(0, 4), true) + button("Nuova attività", "new-task", "plus", "add-inline"), link("Tutte", "tasks"))}${panel("Le tue finanze", `<div class="finance-highlight"><span>Disponibile questo mese</span><strong>${money(f.available)}</strong><small>Entrate − uscite − risparmio accantonato</small></div>${bars(lastMonths(), "income", { unit: "€", height: 145 })}<div class="chart-caption"><i></i>Entrate degli ultimi 4 mesi</div>`, link("Dettagli", "finance"))}${panel("Verso i tuoi obiettivi", goalList(true), link("Tutti", "goals"))}${panel("Benessere e abitudini", `<div class="health-summary">${ring(habitsDone, state.habits.length, "Oggi")}<div>${habitList(3)}</div></div>`, link("Tutte", "habits"))}<article class="inspiration-card">${icon("leaf")}<h2>Piccoli passi oggi.<br>Una vita più tua,<br>domani.</h2><i></i></article></section>`;
}
function lastMonths() {
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3 + i, 1);
    const f = finance(state, dayKey(d).slice(0, 7));
    return {
      label: d.toLocaleDateString("it-IT", { month: "short" }),
      income: f.income,
      expense: f.expense,
    };
  });
}
function agenda(date, compact = false) {
  const ts = state.tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.time.localeCompare(b.time));
  const trips = state.trips.filter(
    (t) => t.start && date >= t.start && date <= (t.end || t.start),
  );
  return ts.length || trips.length
    ? `${ts.map((t) => `<button class="agenda-event ${t.done ? "done" : ""}" data-action="edit-task" data-id="${e(t.id)}"><time>${t.time || "—"}</time><span><strong>${e(t.title)}</strong>${!compact ? `<small>${e(t.category)} · ${t.minutes} min</small>` : ""}</span></button>`).join("")}${trips.map((t) => `<button class="agenda-event travel" data-action="open-trip" data-id="${e(t.id)}"><time>${icon("plane")}</time><span>${e(t.name)}</span></button>`).join("")}`
    : empty(
        "Una giornata tutta da scrivere",
        "Nessuna attività in programma.",
        "calendar",
      );
}
function calendar() {
  const first = (new Date(year, month, 1).getDay() + 6) % 7,
    days = new Date(year, month + 1, 0).getDate();
  return `<div class="calendar-layout">${panel(
    "Il tuo calendario",
    `<div class="calendar-controls">${button("", "prev-month", "chevron", "icon-button prev", 'aria-label="Mese precedente"')}<h3>${new Date(year, month).toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</h3>${button("", "next-month", "chevron", "icon-button", 'aria-label="Mese successivo"')}${button("Oggi", "calendar-today", "calendar", "secondary")}</div><div class="calendar-grid">${["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"].map((d) => `<span class="weekday">${d.slice(0, 3)}</span>`).join("")}${'<div class="outside"></div>'.repeat(first)}${Array.from(
      { length: days },
      (_, i) => {
        const date = dayKey(new Date(year, month, i + 1)),
          ts = state.tasks.filter((t) => t.date === date),
          trips = state.trips.filter(
            (t) => t.start && date >= t.start && date <= (t.end || t.start),
          );
        return `<button class="calendar-day ${date === today() ? "today" : ""} ${date === ui.selectedDate ? "selected" : ""}" data-action="calendar-day" data-date="${date}"><span>${i + 1}</span>${ts
          .slice(0, 2)
          .map(
            (t) =>
              `<small class="${t.done ? "done" : ""}">${e(t.title)}</small>`,
          )
          .join(
            "",
          )}${trips.length ? `<small class="travel">${e(trips[0].name)}</small>` : ""}${ts.length > 2 ? `<i>+${ts.length - 2}</i>` : ""}${ts.length || trips.length ? '<b class="event-dot"></b>' : ""}</button>`;
      },
    ).join("")}</div>`,
  )}${panel(fmtDate(ui.selectedDate), agenda(ui.selectedDate) + button("Aggiungi attività", "new-task", "plus", "add-inline", `data-date="${ui.selectedDate}"`))}</div>`;
}
function tasks() {
  let items = state.tasks.filter(
    (t) =>
      (ui.taskFilter === "all" ||
        (ui.taskFilter === "done" ? t.done : !t.done)) &&
      (!ui.project || t.project === ui.project) &&
      `${t.title} ${t.category}`
        .toLowerCase()
        .includes(ui.taskQuery.toLowerCase()),
  );
  return panel(
    "Le tue attività",
    `<div class="toolbar"><div class="segmented">${[
      ["open", "Da fare"],
      ["done", "Completate"],
      ["all", "Tutte"],
    ]
      .map(
        ([value, text]) =>
          `<button data-action="task-filter" data-value="${value}" class="${ui.taskFilter === value ? "active" : ""}">${text}</button>`,
      )
      .join(
        "",
      )}</div><label class="inline-search">${icon("search")}<input id="task-query" placeholder="Cerca attività" value="${e(ui.taskQuery)}"></label><label class="sr-only" for="project-filter">Filtra progetto</label><select id="project-filter"><option value="">Tutti i progetti</option>${state.projects.map((p) => `<option value="${e(p.id)}" ${ui.project === p.id ? "selected" : ""}>${e(p.name)}</option>`).join("")}</select></div><div id="task-results">${taskList(items)}</div>`,
  );
}
function finances() {
  const f = finance(state, ui.financeMonth);
  const expenseGroups = Object.entries(
    f.rows
      .filter((t) => t.type === "expense")
      .reduce((a, t) => {
        a[t.category] = (a[t.category] || 0) + t.amount;
        return a;
      }, {}),
  ).map(([label, value]) => ({ label, value }));
  return `<div class="section-toolbar"><label>Mese <input id="finance-month" type="month" value="${ui.financeMonth}"></label>${button("Budget e risparmi", "budget", "settings", "secondary")}</div><section class="metrics four">${metric("Entrate", money(f.income), "Nel mese selezionato", "arrow")}${metric("Uscite", money(f.expense), "Nel mese selezionato", "finance", "coral")}${metric("Disponibile", money(f.available), "Dopo il risparmio accantonato", "finance", "blue")}${metric("Risparmio totale", money(f.savings), "Accantonamenti − prelievi", "goals")}</section><div class="two-columns">${panel("Distribuzione delle uscite", donut(expenseGroups, money))}${panel("Il tuo budget", `<div class="budget-amount"><strong>${money(f.expense)}</strong><span> / ${state.budget ? money(state.budget) : "budget da impostare"}</span></div>${progress(f.budgetUsed)}<p class="muted">${state.budget ? (f.expense > state.budget ? "Budget superato di " + money(f.expense - state.budget) : "Ancora " + money(state.budget - f.expense) + " nel budget") : "Imposta un limite mensile per monitorare le uscite."}</p><hr><h3>Il tuo obiettivo di risparmio</h3><div class="budget-amount"><strong>${money(f.savings)}</strong><span> / ${money(state.savingsTarget)}</span></div>${progress(state.savingsTarget ? (f.savings / state.savingsTarget) * 100 : 0)}<p class="muted">Un accantonamento sposta denaro nei risparmi, senza contarlo come una spesa.</p>`)}</div>${panel(
    "Movimenti",
    table(
      ["Descrizione", "Tipo", "Categoria", "Data", "Importo", ""],
      f.rows
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((t) => [
          `<strong>${e(t.name)}</strong>`,
          `<span class="tag ${t.type === "expense" ? "danger" : ""}">${{ income: "Entrata", expense: "Uscita", saving: "Risparmio", withdrawal: "Prelievo risparmio" }[t.type]}</span>`,
          e(t.category),
          fmtDate(t.date),
          `<strong>${money(t.amount)}</strong>`,
          rowActions("transaction", "transactions", t),
        ]),
    ),
    f.rows.length
      ? '<span class="muted">' + f.rows.length + " movimenti</span>"
      : "",
  )}`;
}
function table(head, rows) {
  return rows.length
    ? `<div class="table-scroll"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : empty(
        "Ancora nessuna registrazione",
        "I tuoi dati appariranno qui quando li aggiungerai.",
        "notes",
      );
}
function rowActions(type, collection, item) {
  return `<div class="row-actions"><button class="icon-button" data-action="edit-${type}" data-id="${e(item.id)}" aria-label="Modifica ${e(item.name)}">${icon("edit")}</button><button class="icon-button" data-action="delete" data-kind="${collection}" data-id="${e(item.id)}" aria-label="Elimina ${e(item.name)}">${icon("trash")}</button></div>`;
}
const healthTabs = () =>
  `<div class="page-tabs">${[
    ["health", "Allenamenti", "workout"],
    ["habits", "Abitudini", "leaf"],
    ["nutrition", "Alimentazione", "food"],
  ]
    .map(
      ([p, text, ic]) =>
        `<button data-page="${p}" class="${page === p ? "active" : ""}">${icon(ic)}${text}</button>`,
    )
    .join("")}</div>`;
function health() {
  const h = history(state, 7);
  return `${healthTabs()}<section class="metrics three">${metric(
    "Allenamenti",
    h.reduce((a, d) => a + d.workouts, 0),
    "Ultimi 7 giorni",
    "workout",
    "blue",
  )}${metric("Tempo in movimento", decimal(state.workouts.filter((w) => w.date >= h[0].date && w.date <= today()).reduce((a, w) => a + w.minutes, 0)) + " min", "Ultimi 7 giorni", "clock")}${metric("Abitudini di oggi", state.habits.filter((h) => h.days.includes(today())).length + " / " + state.habits.length, "Un giorno alla volta", "leaf")}</section><div class="two-columns">${panel("La tua settimana", bars(h, "workouts", { unit: "allenamenti" }))}${panel("I tuoi rituali", habitList(4), link("Tutte le abitudini", "habits"))}</div>${panel(
    "Diario degli allenamenti",
    table(
      ["Allenamento", "Durata", "Data", ""],
      state.workouts
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((w) => [
          e(w.name),
          decimal(w.minutes) + " min",
          fmtDate(w.date),
          rowActions("workout", "workouts", w),
        ]),
    ),
  )}`;
}
function nutritionView() {
  const n = nutrition(state, ui.nutritionDate);
  return `${healthTabs()}<div class="section-toolbar"><label>Giorno <input id="nutrition-date" type="date" value="${ui.nutritionDate}" required></label><span class="muted">Valori indicativi: quantità in grammi e alimento crudo/cotto fanno la differenza.</span></div><section class="metrics four">${metric("Energia", decimal(n.kcal) + " kcal", "Totale giornaliero", "food", "amber")}${metric("Proteine", decimal(n.protein, 1) + " g", "Totale giornaliero", "workout", "blue")}${metric("Carboidrati", decimal(n.carbs, 1) + " g", "Totale giornaliero", "leaf")}${metric("Grassi", decimal(n.fat, 1) + " g", "Totale giornaliero", "health", "coral")}</section><div class="meal-grid">${[
    "Colazione",
    "Pranzo",
    "Cena",
    "Spuntino",
  ]
    .map((meal) => {
      const rows = state.meals.filter(
        (m) => m.date === ui.nutritionDate && m.meal === meal,
      );
      return panel(
        meal,
        rows.length
          ? rows
              .map(
                (m) =>
                  `<div class="meal-row"><div><strong>${e(m.name)}</strong><small>${decimal(m.grams)} g · P ${decimal(m.protein, 1)} / C ${decimal(m.carbs, 1)} / G ${decimal(m.fat, 1)}</small></div><b>${decimal(m.kcal)}<small> kcal</small></b>${rowActions("meal", "meals", m)}</div>`,
              )
              .join("")
          : empty(
              "Cosa hai mangiato?",
              "Registra un alimento e la sua quantità.",
              "food",
            ),
        button(
          "Aggiungi",
          "new-meal",
          "plus",
          "text-button",
          `data-meal="${meal}"`,
        ),
      );
    })
    .join("")}</div>`;
}
function wishlist() {
  return (
    panel(
      "I tuoi desideri",
      table(
        ["Prodotto", "Prezzo", "Stato", "Link", ""],
        state.wishlist.map((w) => [
          `<div class="product"><span class="product-image">${safeURL(w.image, true) ? `<img src="${e(safeURL(w.image, true))}" alt="${e(w.name)}" loading="lazy" referrerpolicy="no-referrer">` : icon("bag")}</span><strong>${e(w.name)}</strong></div>`,
          w.price === null
            ? '<span class="muted">Da verificare</span>'
            : money(w.price, w.currency),
          `<button class="tag ${w.bought ? "" : "amber"}" data-action="wish-status" data-id="${e(w.id)}">${w.bought ? "Acquistato" : "Da acquistare"}</button>`,
          safeURL(w.url)
            ? `<a class="external-link" href="${e(safeURL(w.url))}" target="_blank" rel="noopener noreferrer">Apri ${icon("link")}</a>`
            : "—",
          rowActions("wish", "wishlist", w),
        ]),
      ),
    ) +
    `<div class="notice">Nome, prezzo e immagine vengono proposti dal link quando il negozio li rende disponibili. Puoi sempre correggerli; i prezzi non vengono aggiornati automaticamente.</div>`
  );
}
function trips() {
  return state.trips.length
    ? `<div class="trip-grid">${state.trips.map((t) => `<article class="panel trip-card"><div class="trip-cover">${icon("plane")}<span>${t.start ? fmtDate(t.start) + " → " + fmtDate(t.end || t.start) : "Date da scegliere"}</span></div><div class="panel-title"><h2>${e(t.name)}</h2>${rowActions("trip", "trips", t)}</div><div class="trip-budget"><span>Speso <strong>${money(t.spent)}</strong></span><span>Budget <strong>${money(t.budget)}</strong></span></div>${progress(t.budget ? (t.spent / t.budget) * 100 : 0)}<p class="muted">${t.budget ? (t.spent > t.budget ? "Budget superato di " + money(t.spent - t.budget) : "Disponibili " + money(t.budget - t.spent)) : "Imposta un budget per questo viaggio."}</p><p class="trip-notes">${e(t.notes).replaceAll("\n", "<br>")}</p><div class="trip-checklist">${t.checklist.map((c) => `<div><button class="check ${c.done ? "checked" : ""}" data-action="trip-check" data-id="${e(t.id)}" data-item="${e(c.id)}" aria-label="Completa ${e(c.name)}">${c.done ? icon("check") : ""}</button><span class="${c.done ? "done" : ""}">${e(c.name)}</span><button class="icon-button" data-action="trip-delete-check" data-id="${e(t.id)}" data-item="${e(c.id)}" aria-label="Elimina ${e(c.name)}">${icon("close")}</button></div>`).join("")}</div>${button("Aggiungi alla checklist", "trip-add-check", "plus", "add-inline", `data-id="${e(t.id)}"`)}${safeURL(t.url) ? `<a class="external-link" href="${e(safeURL(t.url))}" target="_blank" rel="noopener noreferrer">Prenotazione o itinerario ${icon("link")}</a>` : ""}</article>`).join("")}</div>`
    : panel(
        "Il mondo ti aspetta",
        empty(
          "Dove vorresti andare?",
          "Aggiungi destinazione, date, budget, appunti e checklist.",
          "plane",
        ),
      );
}
function stats() {
  const data = history(state, ui.statsDays),
    f = finance(state),
    sum = (key) => data.reduce((a, d) => a + d[key], 0),
    completion = state.goals.length
      ? state.goals.reduce((a, g) => a + g.progress, 0) / state.goals.length
      : 0;
  const groups = state.goals.map((g) => ({ label: g.name, value: g.progress }));
  return `<div class="section-toolbar"><div class="segmented">${[7, 30, 90].map((n) => `<button class="${ui.statsDays === n ? "active" : ""}" data-action="stats-range" data-days="${n}">Ultimi ${n} giorni</button>`).join("")}</div><span class="muted">Solo registrazioni effettuate · nessun dato di esempio</span></div><section class="metrics four">${metric("Tempo dedicato", decimal(sum("time") / 60, 1) + " h", "Attività completate + studio", "clock", "blue")}${metric("Risparmio netto", money(sum("savings")), "Accantonamenti − prelievi", "finance")}${metric("Allenamenti", sum("workouts"), "Nel periodo selezionato", "workout", "coral")}${metric("Obiettivi", decimal(completion) + "%", "Progresso medio attuale", "goals")}</section><div class="two-columns">${panel("Tempo dedicato", bars(data, "time", { unit: "minuti" }), '<span class="muted">Minuti registrati</span>')}${panel("Risparmio nel tempo", bars(data, "savings", { unit: "€" }), '<span class="muted">Accantonamenti netti</span>')}${panel("Allenamenti", bars(data, "workouts", { unit: "allenamenti", color: "#3d8bfa" }))}${panel("Costanza nelle abitudini", bars(data, "habits", { unit: "abitudini completate" }))}${panel("Progressi degli obiettivi", state.goals.length ? state.goals.map((g) => `<div class="stat-goal"><span>${e(g.name)}</span><b>${decimal(g.progress)}%</b>${progress(g.progress)}</div>`).join("") : empty("Una direzione da scegliere", "Aggiungi un obiettivo per seguirne i progressi.", "goals"))}${panel("Energia registrata", bars(data, "calories", { unit: "kcal", color: "#efac55" }), '<span class="muted">Calorie nel diario alimentare</span>')}</div><p class="muted">Il tempo delle attività entra nei grafici quando le completi; le attività precedenti senza data di completamento restano escluse finché non le riapri e completi. Il progresso degli obiettivi è quello attuale.</p>`;
}
function projects() {
  return state.projects.length
    ? `<div class="project-grid">${state.projects
        .map((p) => {
          const tasks = state.tasks.filter((t) => t.project === p.id),
            done = tasks.filter((t) => t.done).length;
          return panel(
            e(p.name),
            `<p class="muted">${e(p.description)}</p><p class="project-date">${icon("calendar")}${fmtDate(p.date)}</p>${progress(tasks.length ? (done / tasks.length) * 100 : 0)}<div class="project-bottom"><span>${done} / ${tasks.length} attività</span>${button("Apri attività", "project-tasks", "arrow", "text-button", `data-id="${e(p.id)}"`)}</div>`,
            rowActions("project", "projects", p),
          );
        })
        .join("")}</div>`
    : panel(
        "Dalle idee ai progetti",
        empty(
          "Il tuo prossimo progetto",
          "Raggruppa le attività, stabilisci una scadenza e segui il progresso.",
          "projects",
        ),
      );
}
function study() {
  const rows = state.study.slice().sort((a, b) => b.date.localeCompare(a.date));
  return `<section class="metrics three">${metric("Tempo di studio", decimal(state.study.reduce((a, s) => a + s.minutes, 0) / 60, 1) + " h", "Totale registrato", "study", "blue")}${metric("Sessioni", rows.length, "Una sessione alla volta", "clock")}${metric("Questa settimana", decimal(state.study.filter((s) => s.date >= weekDates()[0].key && s.date <= today()).reduce((a, s) => a + s.minutes, 0)) + " min", "Tempo dedicato", "stats")}</section>${panel(
    "Diario di formazione",
    table(
      ["Argomento", "Durata", "Data", ""],
      rows.map((s) => [
        e(s.name),
        decimal(s.minutes) + " min",
        fmtDate(s.date),
        rowActions("study", "study", s),
      ]),
    ),
  )}`;
}
function profile() {
  return `<div class="profile-layout">${panel("Il tuo profilo", `<div class="profile-hero">${avatar("large")}<div><h2>${e(state.profile.name)}</h2><p>${e(state.profile.bio)}</p><span class="tag">${cloud.user ? "Account connesso" : "Modalità locale"}</span></div></div><form id="profile-form"><label>Nome<input name="name" maxlength="60" required value="${e(state.profile.name)}"></label><label>Una frase che ti rappresenta<textarea name="bio" maxlength="500" rows="3">${e(state.profile.bio)}</textarea></label><label>Foto profilo<input type="file" id="photo" accept="image/png,image/jpeg,image/webp"></label><p class="muted">La foto viene ridimensionata prima del salvataggio.</p><div class="form-actions">${button("Rimuovi foto", "remove-photo", "trash", "secondary")}<button class="primary" type="submit">${icon("check")}Salva profilo</button></div></form>`)}${panel("Il tuo account", accountView())}</div>`;
}
function accountView() {
  if (cloud.user)
    return `<div class="account-connected">${icon("shield")}<h3>Il tuo spazio personale</h3><p>${e(cloud.user.email)}</p><span class="tag" data-sync-status data-state="${cloud.status}">${statusText()}</span></div>${cloud.recovery ? `<form id="password-form"><label>Nuova password<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><button class="primary">Aggiorna password</button></form>` : ""}<p class="muted">Le sezioni vengono sincronizzate nel tuo account. Temi, preferenze e profilo ti seguono sugli altri dispositivi.</p>${["offline", "conflict", "error"].includes(cloud.status) ? `<div class="notice warn">${e(cloud.error)}</div><div class="stack">${button("Ricarica i dati cloud", "cloud-reload", "download", "secondary")}${cloud.status !== "error" ? button("Conserva i dati di questo dispositivo", "cloud-keep", "check", "secondary") : ""}</div>` : ""}<div class="stack">${button("Importa i dati locali di Vita", "import-guest", "download", "secondary")}${button("Esci dall’account", "logout", "logout", "secondary")}</div>`;
  if (!cloud.configured)
    return `<div class="account-connected">${icon("shield")}<h3>Il tuo account, su tutti i dispositivi</h3><p>L’accesso con email e la sincronizzazione sono pronti nel progetto, ma il servizio account deve ancora essere collegato.</p></div><div class="notice">Per ora i tuoi dati restano nel browser. Esportali dalle impostazioni per conservarne una copia.</div>${cloud.error ? `<div class="notice warn" role="status">${e(cloud.error)}</div>` : ""}<p class="muted">Il proprietario del sito può attivare il servizio seguendo la guida nel repository GitHub.</p>`;
  return `<div class="segmented auth-tabs">${[
    ["login", "Accedi"],
    ["signup", "Registrati"],
  ]
    .map(
      ([m, label]) =>
        `<button data-action="auth-mode" data-mode="${m}" class="${ui.authMode === m ? "active" : ""}">${label}</button>`,
    )
    .join(
      "",
    )}</div><form id="auth-form">${ui.authMode === "signup" ? '<label>Nome<input name="name" required maxlength="60" autocomplete="name"></label>' : ""}<label>Email<input name="email" type="email" required autocomplete="email"></label><label>Password<input name="password" type="password" required minlength="8" autocomplete="${ui.authMode === "login" ? "current-password" : "new-password"}"></label><p class="form-error" role="alert"></p><button class="primary" type="submit">${ui.authMode === "signup" ? "Crea il tuo account" : "Accedi al tuo spazio"}</button></form><button class="text-button" data-action="reset-password">Password dimenticata?</button><p class="muted">Alla registrazione potresti ricevere un’email di conferma. I dati locali vengono importati solo quando lo scegli.</p>`;
}
function settings() {
  return `<div class="two-columns">${panel(
    "Aspetto",
    `<h3>Tema</h3><div class="theme-options">${[
      ["light", "Chiaro", "sun"],
      ["dark", "Scuro", "moon"],
      ["system", "Sistema", "settings"],
    ]
      .map(
        ([v, label, ic]) =>
          `<button data-action="theme" data-value="${v}" class="${state.settings.theme === v ? "selected" : ""}" aria-pressed="${state.settings.theme === v}">${icon(ic)}<span>${label}</span>${state.settings.theme === v ? icon("check") : ""}</button>`,
      )
      .join("")}</div><h3>Palette colori</h3><div class="palette-options">${[
      ["ocean", "Oceano", "#06b99b", "#358bfa"],
      ["violet", "Lavanda", "#8a65d9", "#b79bef"],
      ["amber", "Ambra", "#c88822", "#f4bf5c"],
      ["rose", "Rosé", "#d05780", "#f1a1ba"],
    ]
      .map(
        ([value, label, c1, c2]) =>
          `<button data-action="palette" data-value="${value}" class="${state.settings.palette === value ? "selected" : ""}" aria-pressed="${state.settings.palette === value}"><span style="background:linear-gradient(135deg,${c1} 50%,${c2} 50%)"></span>${label}${state.settings.palette === value ? icon("check") : ""}</button>`,
      )
      .join(
        "",
      )}</div><p class="muted">Le preferenze vengono salvate con i tuoi dati.</p>`,
  )}${panel("I tuoi dati", `<p class="muted">${cloud.user ? "Account connesso: dati sincronizzati quando il servizio è disponibile." : "I dati sono salvati in questo browser. Esportali prima di cambiare dispositivo o cancellare la cronologia."}</p><div class="stack">${button("Esporta una copia dei dati", "export", "download", "secondary")}<label class="upload-button">${icon("download")}Importa una copia<input id="import-file" type="file" accept="application/json,.json"></label>${link("Gestisci account e profilo", "profile")}</div><div class="notice">Un’importazione sostituisce i dati dello spazio attuale, dopo la tua conferma. VYRA mantiene intatti i vecchi dati locali di Vita.</div>`)}${panel("Il tuo spazio", `<div class="settings-about">${logo()}<div><h3>VYRA</h3><p>La vita, organizzata.</p><small>Attività, benessere, finanze e idee. Un’unica direzione.</small></div></div>`)}${panel("Assistente AI", `<p class="muted">Le domande vengono inviate a ${e(cloud.aiProvider)} solo quando premi Invia. Puoi scegliere se condividere attività e obiettivi per ottenere suggerimenti più pertinenti.</p>${link("Apri assistente", "assistant")}<p class="muted">L’assistente propone attività: sei tu a decidere se aggiungerle.</p>`)}</div>`;
}
function assistant() {
  return `<div class="assistant-layout"><aside class="assistant-info"><div class="ai-symbol">${icon("spark")}</div><h2>Un po’ di chiarezza.<br>Un passo avanti.</h2><p>Organizza le priorità, scomponi un obiettivo o fai una domanda veloce.</p><div class="suggestions">${["Aiutami a organizzare la giornata", "Dividi un obiettivo in piccoli passi", "Come posso studiare con più costanza?"].map((q) => `<button data-action="ai-suggestion" data-value="${e(q)}">${e(q)}${icon("arrow")}</button>`).join("")}</div><p class="muted">I suggerimenti non modificano i tuoi dati. Le attività proposte si aggiungono solo con la tua conferma.</p></aside><article class="panel chat-panel"><div class="panel-title"><h2>${icon("spark")} Assistente VYRA</h2><span class="tag">${e(cloud.aiProvider)}</span></div>${!cloud.user ? `<div class="notice">${cloud.configured ? "Accedi al tuo account per utilizzare l’assistente." : "L’assistente richiede l’attivazione del servizio account e dell’AI."} ${link("Apri profilo", "profile")}</div>` : ""}<div class="messages" id="messages" aria-live="polite">${ui.messages.length ? ui.messages.map((m, index) => `<div class="message ${m.role}"><small>${m.role === "user" ? "Tu" : "VYRA"}</small><p>${e(m.text).replaceAll("\n", "<br>")}</p>${m.tasks?.map((t, i) => `<div class="ai-task"><div><strong>${e(t.title)}</strong><small>${e(t.date || "Da pianificare")} · ${t.minutes} min</small></div><button class="secondary" data-action="accept-ai-task" data-message="${index}" data-task="${i}" ${t.added ? "disabled" : ""}>${t.added ? "Aggiunta" : "Aggiungi"}</button></div>`).join("") || ""}</div>`).join("") : `<div class="chat-empty">${icon("spark")}<h3>Da dove vuoi iniziare?</h3><p>Una domanda può essere il primo passo.</p></div>`}${ui.aiBusy ? '<div class="message assistant"><small>VYRA</small><p class="loading-dots">Sto preparando una risposta…</p></div>' : ""}</div><form id="ai-form"><label class="context-option"><input id="ai-context" type="checkbox" checked> Utilizza le mie attività e i miei obiettivi</label><div class="chat-input"><label class="sr-only" for="ai-question">La tua domanda</label><textarea id="ai-question" name="question" rows="2" required maxlength="2000" placeholder="Come posso organizzare meglio la giornata?" ${ui.aiBusy ? "disabled" : ""}></textarea><button class="primary" type="submit" ${ui.aiBusy ? "disabled" : ""} aria-label="Invia domanda">${icon("arrow")}</button></div><p class="muted">La domanda e l’eventuale contesto vengono inviati a ${e(cloud.aiProvider)}. Non includere password o informazioni riservate.</p></form></article></div>`;
}
function view() {
  return {
    dashboard,
    calendar,
    tasks,
    goals: () => panel("Le tue mete", goalList()),
    projects,
    finance: finances,
    health,
    nutrition: nutritionView,
    habits: () => healthTabs() + panel("Le tue abitudini", habitList()),
    wishlist,
    trips,
    stats,
    study,
    profile,
    settings,
    assistant,
    notes: () =>
      panel(
        "Libera la mente",
        `<p class="muted">Appunti, idee e cose da ricordare. Salvati mentre scrivi.</p><label class="sr-only" for="notes">I tuoi appunti</label><textarea class="notes-area" id="notes" placeholder="Cosa vuoi ricordare?">${e(state.notes)}</textarea><div class="notes-footer"><span>Il tuo archivio personale</span><span id="notes-count">${decimal(state.notes.length)} caratteri</span></div>`,
      ),
  }[page]();
}
const collections = {
  task: "tasks",
  goal: "goals",
  project: "projects",
  transaction: "transactions",
  workout: "workouts",
  meal: "meals",
  habit: "habits",
  wish: "wishlist",
  trip: "trips",
  study: "study",
};
const formNames = {
  task: "attività",
  goal: "obiettivo",
  project: "progetto",
  transaction: "movimento",
  workout: "allenamento",
  meal: "alimento",
  habit: "abitudine",
  wish: "desiderio",
  trip: "viaggio",
  study: "sessione",
};
function field(label, name, value = "", type = "text", attrs = "") {
  return `<label>${label}<input name="${name}" type="${type}" value="${e(value ?? "")}" ${attrs}></label>`;
}
function select(label, name, options, value) {
  return `<label>${label}<select name="${name}" aria-label="${e(label)}">${options
    .map((o) => {
      const [v, text] = Array.isArray(o) ? o : [o, o];
      return `<option value="${e(v)}" ${v === value ? "selected" : ""}>${e(text)}</option>`;
    })
    .join("")}</select></label>`;
}
function textfield(label, name, value = "", attrs = "") {
  return `<label>${label}<textarea name="${name}" rows="3" ${attrs}>${e(value)}</textarea></label>`;
}
function dialog(content) {
  const d = document.querySelector("#dialog");
  d.innerHTML = content;
  d.showModal();
  requestAnimationFrame(() => d.querySelector("[autofocus]")?.focus());
}
function edit(kind, itemId = "", preset = {}) {
  const existing = state[collections[kind]].find((t) => t.id === itemId),
    item = existing || {},
    date = preset.date || today();
  let fields = "";
  const nameLabel = {
    task: "Cosa vuoi fare?",
    goal: "Il tuo obiettivo",
    project: "Nome progetto",
    workout: "Allenamento",
    habit: "Nome abitudine",
    study: "Argomento",
    trip: "Destinazione",
    wish: "Nome prodotto",
    transaction: "Descrizione",
  }[kind];
  if (kind === "task")
    fields =
      field(
        nameLabel,
        "title",
        item.title,
        "text",
        'required maxlength="180" autofocus',
      ) +
      `<div class="form-row">${select("Categoria", "category", ["Personale", "Studio", "Lavoro", "Benessere", "Casa"], item.category || "Personale")}${select("Priorità", "priority", ["Normale", "Alta", "Bassa"], item.priority || "Normale")}</div><div class="form-row">${field("Scadenza", "date", item.date ?? preset.date ?? "", "date")}${field("Orario", "time", item.time, "time")}</div><div class="form-row">${field("Tempo dedicato (minuti)", "minutes", item.minutes || 0, "number", 'min="0" max="1440" step="1" required')}${select("Progetto", "project", [["", "Nessun progetto"], ...state.projects.map((p) => [p.id, p.name])], item.project || ui.project)}</div><p class="muted">Il tempo viene conteggiato nelle statistiche quando completi l’attività.</p>`;
  else if (kind === "goal")
    fields =
      field(
        nameLabel,
        "name",
        item.name,
        "text",
        'required maxlength="180" autofocus',
      ) +
      `<div class="form-row">${field("Scadenza", "date", item.date, "date")}${field("Progresso (%)", "progress", item.progress || 0, "number", 'required min="0" max="100"')}</div>`;
  else if (kind === "project")
    fields =
      field(
        nameLabel,
        "name",
        item.name,
        "text",
        'required maxlength="180" autofocus',
      ) +
      textfield(
        "Descrizione",
        "description",
        item.description,
        'maxlength="1000"',
      ) +
      field("Scadenza", "date", item.date, "date");
  else if (["workout", "study"].includes(kind))
    fields =
      field(
        nameLabel,
        "name",
        item.name,
        "text",
        'required maxlength="180" autofocus',
      ) +
      `<div class="form-row">${field("Durata (minuti)", "minutes", item.minutes || 30, "number", 'required min="1" max="1440"')}${field("Data", "date", item.date || date, "date", "required")}</div>`;
  else if (kind === "habit")
    fields = field(
      nameLabel,
      "name",
      item.name,
      "text",
      'required maxlength="180" autofocus',
    );
  else if (kind === "transaction")
    fields =
      field(
        nameLabel,
        "name",
        item.name,
        "text",
        'required maxlength="180" autofocus',
      ) +
      `<div class="form-row">${select(
        "Tipo",
        "type",
        [
          ["expense", "Uscita"],
          ["income", "Entrata"],
          ["saving", "Accantonamento risparmio"],
          ["withdrawal", "Prelievo risparmio"],
        ],
        item.type || "expense",
      )}${field("Importo (€)", "amount", item.amount || "", "number", 'required min="0.01" max="100000000" step="0.01"')}</div><div class="form-row">${select("Categoria", "category", ["Generale", "Casa", "Alimentazione", "Trasporti", "Salute", "Tempo libero", "Studio", "Lavoro", "Viaggi", "Stipendio", "Risparmio"], item.category || "Generale")}${field("Data", "date", item.date || date, "date", "required")}</div>`;
  else if (kind === "wish")
    fields = `${field("Link del prodotto", "url", item.url, "url", 'required maxlength="2000" autofocus placeholder="https://…"')}<button type="button" class="secondary full" data-action="fetch-product">${icon("link")}Recupera informazioni dal link</button><p id="product-status" class="muted" role="status">Puoi inserire o correggere tutti i dettagli a mano.</p>${field(nameLabel, "name", item.name, "text", 'required maxlength="180"')}<div class="form-row">${field("Prezzo", "price", item.price, "number", 'min="0" max="100000000" step="0.01" placeholder="Da verificare"')}${select("Valuta", "currency", ["EUR", "USD", "GBP"], item.currency || "EUR")}</div>${field("Link immagine", "image", item.image?.startsWith("data:") ? "" : item.image, "url", 'maxlength="3000" placeholder="https://…"')}<p class="muted">Il prezzo è quello registrato: controllalo sul negozio prima dell’acquisto.</p>`;
  else if (kind === "trip")
    fields =
      field(
        nameLabel,
        "name",
        item.name,
        "text",
        'required maxlength="180" autofocus',
      ) +
      `<div class="form-row">${field("Partenza", "start", item.start, "date")}${field("Ritorno", "end", item.end, "date")}</div><div class="form-row">${field("Budget (€)", "budget", item.budget || 0, "number", 'min="0" max="100000000" step="0.01" required')}${field("Speso (€)", "spent", item.spent || 0, "number", 'min="0" max="100000000" step="0.01" required')}</div>${textfield("Itinerario e appunti", "notes", item.notes, 'maxlength="10000"')}${field("Link prenotazione o itinerario", "url", item.url, "url", 'maxlength="2000"')}`;
  else if (kind === "meal") {
    const per = item.grams
      ? Object.fromEntries(
          ["kcal", "protein", "carbs", "fat"].map((k) => [
            k,
            (item[k] / item.grams) * 100,
          ]),
        )
      : {};
    fields = `<div class="form-row">${select("Pasto", "meal", ["Colazione", "Pranzo", "Cena", "Spuntino"], item.meal || preset.meal || "Pranzo")}${field("Data", "date", item.date || ui.nutritionDate, "date", "required")}</div>${field("Alimento", "name", item.name, "text", 'required maxlength="180" list="foods" autofocus placeholder="Cerca un alimento o aggiungi il tuo"')}<datalist id="foods">${foods.map((f) => `<option value="${e(f.name)}"></option>`).join("")}</datalist>${field("Quantità (grammi)", "grams", item.grams || 100, "number", 'min="1" max="10000" step="0.1" required')}<div class="notice">Scegli un alimento per compilare i valori indicativi, oppure inserisci quelli dell’etichetta per 100 g.</div><div class="form-row">${field("Calorie / 100 g", "kcal", per.kcal ?? "", "number", 'min="0" max="1000" step="0.1" required')}${field("Proteine / 100 g", "protein", per.protein ?? "", "number", 'min="0" max="100" step="0.1" required')}</div><div class="form-row">${field("Carboidrati / 100 g", "carbs", per.carbs ?? "", "number", 'min="0" max="100" step="0.1" required')}${field("Grassi / 100 g", "fat", per.fat ?? "", "number", 'min="0" max="100" step="0.1" required')}</div><div id="meal-preview" class="meal-preview">Il totale verrà calcolato dalla quantità inserita.</div>`;
  }
  dialog(
    `<form id="entry" data-kind="${kind}" data-id="${e(itemId)}"><div class="panel-title"><h2>${existing ? "Modifica" : ["task", "habit", "study"].includes(kind) ? "Nuova" : "Nuovo"} ${formNames[kind]}</h2><button type="button" class="icon-button" data-action="close-dialog" aria-label="Chiudi">${icon("close")}</button></div>${fields}<p class="form-error" role="alert"></p><button class="primary full" type="submit">${icon("check")}Salva ${formNames[kind]}</button></form>`,
  );
  if (kind === "meal") mealPreview();
}
function mealPreview() {
  const form = document.querySelector("#entry");
  if (form?.dataset.kind !== "meal") return;
  const d = new FormData(form),
    p = portion(
      Object.fromEntries(
        ["kcal", "protein", "carbs", "fat"].map((k) => [k, Number(d.get(k))]),
      ),
      Number(d.get("grams")),
    );
  document.querySelector("#meal-preview").innerHTML =
    `<strong>Totale porzione: ${decimal(p.kcal)} kcal</strong><span>Proteine ${decimal(p.protein, 1)} g · Carboidrati ${decimal(p.carbs, 1)} g · Grassi ${decimal(p.fat, 1)} g</span>`;
}
function saveEntry(form) {
  const kind = form.dataset.kind,
    itemId = form.dataset.id,
    collection = collections[kind],
    existing = state[collection].find((i) => i.id === itemId),
    d = Object.fromEntries(new FormData(form));
  for (const k of Object.keys(d)) d[k] = d[k].trim();
  if (!(d.title || d.name)) {
    form.querySelector(".form-error").textContent = "Inserisci un nome.";
    return;
  }
  const numeric = [
    "minutes",
    "progress",
    "amount",
    "budget",
    "spent",
    "grams",
    "kcal",
    "protein",
    "carbs",
    "fat",
  ];
  numeric.forEach((k) => {
    if (k in d) d[k] = Number(d[k]);
  });
  if (kind === "wish") {
    if (!safeURL(d.url) || (d.image && !safeURL(d.image))) {
      form.querySelector(".form-error").textContent =
        "Inserisci link HTTP o HTTPS validi.";
      return;
    }
    d.price = d.price === "" ? null : Number(d.price);
    d.image = d.image || existing?.image || "";
    d.bought = existing?.bought || false;
  }
  if (kind === "task") {
    d.done = existing?.done || false;
    d.completedAt = existing?.completedAt || "";
  }
  if (kind === "habit") d.days = existing?.days || [];
  if (kind === "trip") {
    if (d.start && d.end && d.end < d.start) {
      form.querySelector(".form-error").textContent =
        "Il ritorno deve essere successivo alla partenza.";
      return;
    }
    if (d.url && !safeURL(d.url)) {
      form.querySelector(".form-error").textContent =
        "Inserisci un link valido.";
      return;
    }
    d.checklist = existing?.checklist || [];
  }
  if (kind === "transaction" && d.type === "withdrawal") {
    const remaining = state.transactions
      .filter((t) => t.id !== itemId)
      .reduce(
        (a, t) =>
          a +
          (t.type === "saving"
            ? t.amount
            : t.type === "withdrawal"
              ? -t.amount
              : 0),
        0,
      );
    if (d.amount > remaining) {
      form.querySelector(".form-error").textContent =
        "Il prelievo supera il risparmio disponibile (" +
        money(remaining) +
        ").";
      return;
    }
  }
  if (kind === "meal") Object.assign(d, portion(d, d.grams));
  const index = state[collection].findIndex((i) => i.id === itemId),
    entry = { ...existing, ...d, id: itemId || id() };
  if (index < 0) state[collection].push(entry);
  else state[collection][index] = entry;
  if (save()) {
    document.querySelector("#dialog").close();
    render();
    toast("Salvato nel tuo spazio.");
  } else {
    if (index < 0) state[collection].pop();
    else state[collection][index] = existing;
  }
}
function notifications() {
  const due = state.tasks.filter((t) => !t.done && t.date && t.date <= today());
  dialog(
    `<div class="panel-title"><h2>Scadenze e promemoria</h2>${button("", "close-dialog", "close", "icon-button", 'aria-label="Chiudi"')}</div>${taskList(due)}<p class="muted">Promemoria nel sito: le notifiche push e via email non sono attive.</p>`,
  );
}
function searchDialog() {
  dialog(
    `<div class="panel-title"><h2>Cerca nel tuo spazio</h2>${button("", "close-dialog", "close", "icon-button", 'aria-label="Chiudi"')}</div><label class="inline-search search-dialog">${icon("search")}<input id="global-search" placeholder="Cerca qualcosa…" autofocus></label><div id="search-results"><p class="muted">Attività, obiettivi, progetti, desideri, viaggi e appunti.</p></div>`,
  );
}
function searchResults(q) {
  q = q.toLowerCase().trim();
  const found = [];
  for (const [collection, target] of [
    ["tasks", "tasks"],
    ["goals", "goals"],
    ["projects", "projects"],
    ["wishlist", "wishlist"],
    ["trips", "trips"],
  ])
    for (const item of state[collection])
      if (q && (item.name || item.title).toLowerCase().includes(q))
        found.push({ title: item.name || item.title, target });
  if (q && state.notes.toLowerCase().includes(q))
    found.push({ title: "Nei tuoi appunti", target: "notes" });
  document.querySelector("#search-results").innerHTML = found.length
    ? found
        .slice(0, 20)
        .map(
          (r) =>
            `<button class="search-result" data-page="${r.target}">${icon(routes[r.target][1])}<span><strong>${e(r.title)}</strong><small>${routes[r.target][0]}</small></span>${icon("arrow")}</button>`,
        )
        .join("")
    : '<p class="muted">' +
      (q ? "Nessun risultato." : "Scrivi per cercare nel tuo spazio.") +
      "</p>";
}
async function fetchProduct(button) {
  const form = button.closest("form"),
    url = form.elements.url.value,
    status = document.querySelector("#product-status");
  if (!safeURL(url)) {
    status.textContent = "Inserisci prima un link valido.";
    return;
  }
  button.disabled = true;
  status.textContent = "Cerco le informazioni disponibili…";
  try {
    const token = await bearer();
    const r = await fetch("/.netlify/functions/product", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify({ url }),
    });
    const data = await r.json();
    if (!r.ok)
      throw new Error(
        data.error ||
          "Il negozio non rende disponibili i dettagli. Inseriscili a mano.",
      );
    if (!form.isConnected) return;
    if (data.name) form.elements.name.value = data.name;
    if (data.price !== null && data.price !== undefined)
      form.elements.price.value = data.price;
    if (data.image) form.elements.image.value = data.image;
    if (["EUR", "USD", "GBP"].includes(data.currency))
      form.elements.currency.value = data.currency;
    status.textContent =
      "Dettagli recuperati. Controlla nome, prezzo e immagine prima di salvare.";
  } catch (err) {
    if (status.isConnected)
      status.textContent = err.message.includes("JSON")
        ? "Anteprima non disponibile: puoi inserire tutti i dettagli a mano."
        : err.message;
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}
async function sendAI(form) {
  if (ui.aiBusy) return;
  if (!cloud.user) {
    toast("Accedi al tuo account per usare l’assistente.", "error");
    return;
  }
  const question = form.elements.question.value.trim();
  if (!question) return;
  const withContext = form.querySelector("#ai-context").checked,
    previous = ui.messages
      .filter((m) => !m.error)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.text.slice(0, 1500) }));
  ui.messages.push({ role: "user", text: question });
  ui.aiBusy = true;
  render();
  document.querySelector("#messages").scrollTop = 1e6;
  try {
    const token = await bearer();
    const context = withContext
      ? {
          date: today(),
          tasks: state.tasks
            .filter((t) => !t.done)
            .slice(0, 40)
            .map(({ title, date, priority, minutes }) => ({
              title,
              date,
              priority,
              minutes,
            })),
          goals: state.goals
            .slice(0, 15)
            .map(({ name, progress }) => ({ name, progress })),
        }
      : { date: today() };
    const r = await fetch("/.netlify/functions/assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ question, history: previous, context }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "L’assistente non è disponibile.");
    ui.messages.push({
      role: "assistant",
      text: data.reply,
      tasks: data.tasks,
    });
  } catch (err) {
    ui.messages.push({ role: "assistant", text: err.message, error: true });
  } finally {
    ui.aiBusy = false;
    if (page === "assistant") {
      render();
      document.querySelector("#messages").scrollTop = 1e6;
    }
  }
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `vyra-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importData(file) {
  if (!file) return;
  try {
    if (file.size > 5e6) throw Error("La copia supera il limite di 5 MB.");
    const raw = JSON.parse(await file.text());
    if (
      !raw ||
      !Array.isArray(raw.tasks) ||
      !Array.isArray(raw.habits) ||
      !Array.isArray(raw.goals) ||
      typeof raw.notes !== "string"
    )
      throw Error("Questo file non è una copia valida di Vita o VYRA.");
    if (
      !confirm(
        "Questa importazione sostituirà i dati dello spazio attuale. Vuoi continuare?",
      )
    )
      return;
    state = normalize(raw);
    if (save()) {
      render();
      toast("Copia importata.");
    }
  } catch (err) {
    toast(err.message || "Impossibile importare il file.", "error");
  }
}
function addTripCheck(tripId) {
  dialog(
    `<form id="trip-check-form" data-id="${e(tripId)}"><div class="panel-title"><h2>Nuovo elemento checklist</h2>${button("", "close-dialog", "close", "icon-button", 'type="button" aria-label="Chiudi"')}</div>${field("Cosa vuoi ricordare?", "name", "", "text", 'required maxlength="180" autofocus')}<button class="primary full">Aggiungi alla checklist</button></form>`,
  );
}
function editBudget() {
  dialog(
    `<form id="budget-form"><div class="panel-title"><h2>Budget e risparmi</h2>${button("", "close-dialog", "close", "icon-button", 'type="button" aria-label="Chiudi"')}</div>${field("Budget mensile (€)", "budget", state.budget, "number", 'min="0" max="100000000" step="0.01" required')}${field("Obiettivo di risparmio (€)", "savingsTarget", state.savingsTarget, "number", 'min="0" max="100000000" step="0.01" required')}<button class="primary full">Salva preferenze</button></form>`,
  );
}
async function changePhoto(file) {
  if (!file) return;
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 10e6
  ) {
    toast("Scegli un’immagine PNG, JPG o WebP inferiore a 10 MB.", "error");
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d"),
      size = Math.min(img.width, img.height);
    ctx.drawImage(
      img,
      (img.width - size) / 2,
      (img.height - size) / 2,
      size,
      size,
      0,
      0,
      256,
      256,
    );
    state.profile.photo = canvas.toDataURL("image/jpeg", 0.8);
    save();
    render();
    toast("Foto aggiornata.");
  } catch {
    toast("Impossibile leggere l’immagine.", "error");
  } finally {
    URL.revokeObjectURL(url);
  }
}
document.addEventListener("click", async (event) => {
  const nav = event.target.closest("[data-page]");
  if (nav) {
    event.preventDefault();
    document.querySelector("#dialog")?.close();
    go(nav.dataset.page);
    return;
  }
  const b = event.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const a = b.dataset.action,
    itemId = b.dataset.id;
  if (a.startsWith("new-") || a.startsWith("edit-")) {
    const kind = a.replace(/^(new|edit)-/, "");
    if (collections[kind])
      edit(kind, itemId, { date: b.dataset.date, meal: b.dataset.meal });
    return;
  }
  const mutations = [
    "toggle-task",
    "toggle-habit",
    "delete",
    "wish-status",
    "trip-check",
    "trip-delete-check",
    "theme",
    "palette",
    "accept-ai-task",
    "remove-photo",
  ];
  if (mutations.includes(a) && ["loading", "error"].includes(cloud.status)) {
    toast("Attendi il caricamento dell’account.", "error");
    return;
  }
  if (a === "menu") {
    ui.menu = !ui.menu;
    render();
  }
  if (a === "more") {
    ui.more = !ui.more;
    render();
  }
  if (a === "close-dialog") document.querySelector("#dialog").close();
  if (a === "toggle-task") {
    const t = state.tasks.find((t) => t.id === itemId);
    t.done = !t.done;
    t.completedAt = t.done ? today() : "";
    save();
    render();
  }
  if (a === "toggle-habit") {
    const h = state.habits.find((h) => h.id === itemId);
    h.days = h.days.includes(today())
      ? h.days.filter((d) => d !== today())
      : [...h.days, today()];
    save();
    render();
  }
  if (a === "delete") {
    const kind = b.dataset.kind;
    if (
      !collectionsContains(kind) ||
      !confirm("Vuoi eliminare questo elemento?")
    )
      return;
    state[kind] = state[kind].filter((t) => t.id !== itemId);
    if (kind === "projects")
      state.tasks.forEach((t) => {
        if (t.project === itemId) t.project = "";
      });
    save();
    render();
  }
  if (a === "task-filter") {
    ui.taskFilter = b.dataset.value;
    render();
  }
  if (["select-day", "calendar-day"].includes(a)) {
    ui.selectedDate = b.dataset.date;
    render();
  }
  if (["prev-month", "next-month"].includes(a)) {
    const d = new Date(year, month + (a === "prev-month" ? -1 : 1), 1);
    month = d.getMonth();
    year = d.getFullYear();
    render();
  }
  if (a === "calendar-today") {
    month = new Date().getMonth();
    year = new Date().getFullYear();
    ui.selectedDate = today();
    render();
  }
  if (a === "budget") editBudget();
  if (a === "stats-range") {
    ui.statsDays = Number(b.dataset.days);
    render();
  }
  if (a === "wish-status") {
    const w = state.wishlist.find((w) => w.id === itemId);
    w.bought = !w.bought;
    save();
    render();
  }
  if (a === "fetch-product") await fetchProduct(b);
  if (a === "trip-add-check") addTripCheck(itemId);
  if (["trip-check", "trip-delete-check"].includes(a)) {
    const trip = state.trips.find((t) => t.id === itemId);
    if (a === "trip-check") {
      const c = trip.checklist.find((c) => c.id === b.dataset.item);
      c.done = !c.done;
    } else
      trip.checklist = trip.checklist.filter((c) => c.id !== b.dataset.item);
    save();
    render();
  }
  if (a === "open-trip") {
    go("trips");
    edit("trip", itemId);
  }
  if (a === "project-tasks") {
    ui.project = itemId;
    ui.taskFilter = "all";
    go("tasks");
  }
  if (a === "theme") {
    state.settings.theme = b.dataset.value;
    save();
    render();
  }
  if (a === "palette") {
    state.settings.palette = b.dataset.value;
    save();
    render();
  }
  if (a === "export") exportData();
  if (a === "remove-photo") {
    state.profile.photo = "";
    save();
    render();
  }
  if (a === "search") searchDialog();
  if (a === "notifications") notifications();
  if (a === "auth-mode") {
    ui.authMode = b.dataset.mode;
    render();
  }
  if (a === "logout")
    try {
      await signOut();
    } catch {
      toast("Impossibile uscire, riprova.", "error");
    }
  if (a === "reset-password") {
    dialog(
      `<form id="reset-form"><div class="panel-title"><h2>Recupera password</h2>${button("", "close-dialog", "close", "icon-button", 'type="button" aria-label="Chiudi"')}</div>${field("Email", "email", "", "email", 'required autofocus autocomplete="email"')}<p class="form-error" role="alert"></p><button class="primary full">Invia link di recupero</button></form>`,
    );
  }
  if (a === "cloud-reload") {
    if (
      confirm(
        "Vuoi ricaricare i dati cloud? Le modifiche locali non sincronizzate saranno sostituite.",
      )
    )
      await resolveCloud(false);
    render();
  }
  if (a === "cloud-keep") {
    if (
      confirm(
        "Vuoi conservare i dati di questo dispositivo e sostituire la versione cloud?",
      )
    )
      await resolveCloud(true);
    render();
  }
  if (a === "import-guest") {
    const guest = load();
    if (
      confirm(
        "I dati locali di Vita sostituiranno il contenuto attuale dell’account. Vuoi continuare?",
      )
    ) {
      state = guest;
      save();
      render();
      toast("Dati locali importati nell’account.");
    }
  }
  if (a === "ai-suggestion") {
    const input = document.querySelector("#ai-question");
    input.value = b.dataset.value;
    input.focus();
  }
  if (a === "accept-ai-task") {
    const t =
      ui.messages[Number(b.dataset.message)].tasks[Number(b.dataset.task)];
    state.tasks.push({
      id: id(),
      title: t.title,
      date: t.date || "",
      priority: t.priority || "Normale",
      category: "Personale",
      time: "",
      minutes: t.minutes || 0,
      project: "",
      done: false,
      completedAt: "",
    });
    t.added = true;
    save();
    render();
    toast("Attività aggiunta.");
  }
});
function collectionsContains(kind) {
  return Object.values(collections).includes(kind);
}
document.addEventListener("input", (event) => {
  const t = event.target;
  if (t.id === "notes") {
    state.notes = t.value;
    save();
    document.querySelector("#notes-count").textContent =
      decimal(t.value.length) + " caratteri";
  }
  if (t.id === "task-query") {
    ui.taskQuery = t.value;
    document.querySelector("#task-results").innerHTML = taskList(
      state.tasks.filter(
        (t) =>
          (ui.taskFilter === "all" ||
            (ui.taskFilter === "done" ? t.done : !t.done)) &&
          (!ui.project || t.project === ui.project) &&
          `${t.title} ${t.category}`
            .toLowerCase()
            .includes(ui.taskQuery.toLowerCase()),
      ),
    );
  }
  if (t.id === "global-search") searchResults(t.value);
  const form = t.closest("#entry");
  if (form?.dataset.kind === "meal") {
    if (t.name === "name") {
      const food = foods.find(
        (f) => f.name.toLowerCase() === t.value.toLowerCase(),
      );
      if (food) {
        for (const k of ["kcal", "protein", "carbs", "fat"])
          form.elements[k].value = food[k];
        form.dataset.autofilled = "1";
      } else if (form.dataset.autofilled) {
        for (const k of ["kcal", "protein", "carbs", "fat"])
          form.elements[k].value = "";
        delete form.dataset.autofilled;
      }
    }
    mealPreview();
  }
});
document.addEventListener("change", (event) => {
  const t = event.target;
  if (t.dataset.goal) {
    state.goals.find((g) => g.id === t.dataset.goal).progress = Number(t.value);
    save();
    render();
  }
  if (t.id === "finance-month" && t.value) {
    ui.financeMonth = t.value;
    render();
  }
  if (t.id === "nutrition-date" && t.value) {
    ui.nutritionDate = t.value;
    render();
  }
  if (t.id === "project-filter") {
    ui.project = t.value;
    render();
  }
  if (t.id === "photo") changePhoto(t.files[0]);
  if (t.id === "import-file") importData(t.files[0]);
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  event.preventDefault();
  if (
    ["loading", "error"].includes(cloud.status) &&
    ["entry", "profile-form", "budget-form", "trip-check-form"].includes(
      form.id,
    )
  ) {
    toast("Attendi il caricamento dell’account.", "error");
    return;
  }
  if (form.id === "entry") {
    saveEntry(form);
    return;
  }
  if (form.id === "ai-form") {
    await sendAI(form);
    return;
  }
  const d = Object.fromEntries(new FormData(form));
  if (form.id === "profile-form") {
    state.profile.name = d.name.trim();
    state.profile.bio = d.bio.trim();
    if (!state.profile.name) return;
    if (save()) {
      render();
      toast("Profilo aggiornato.");
    }
  }
  if (form.id === "budget-form") {
    state.budget = Number(d.budget);
    state.savingsTarget = Number(d.savingsTarget);
    save();
    document.querySelector("#dialog").close();
    render();
  }
  if (form.id === "trip-check-form") {
    state.trips
      .find((t) => t.id === form.dataset.id)
      .checklist.push({ id: id(), name: d.name.trim(), done: false });
    save();
    document.querySelector("#dialog").close();
    render();
  }
  if (["auth-form", "reset-form", "password-form"].includes(form.id)) {
    const submit = form.querySelector('[type="submit"],button.primary');
    submit.disabled = true;
    try {
      if (form.id === "auth-form") {
        const result = await authenticate(
          ui.authMode,
          d.email,
          d.password,
          d.name,
        );
        if (ui.authMode === "signup" && !result.session)
          toast("Controlla la tua email per confermare l’account.");
      }
      if (form.id === "reset-form") {
        await resetPassword(d.email);
        document.querySelector("#dialog").close();
        toast(
          "Se l’account esiste, riceverai un’email per recuperare la password.",
        );
      }
      if (form.id === "password-form") {
        await newPassword(d.password);
        render();
        toast("Password aggiornata.");
      }
    } catch (err) {
      const error = form.querySelector(".form-error");
      if (error) error.textContent = err.message;
      else toast(err.message, "error");
    } finally {
      if (submit.isConnected) submit.disabled = false;
    }
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchDialog();
  }
});
window.addEventListener("hashchange", () => {
  const target = location.hash.slice(1);
  if (routes[target] && target !== page) {
    page = target;
    render();
  }
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.settings.theme === "system") applyTheme();
});
window.addEventListener("online", () => {
  if (cloud.user && cloud.status === "offline")
    toast(
      "Connessione ripristinata. Apri il profilo per riprendere la sincronizzazione.",
    );
});
render();
try {
  saveData(state);
} catch {
  toast("Il salvataggio nel browser non è disponibile.", "error");
}
initCloud((data) => {
  if (data === "guest") {
    state = load();
    ui.messages = [];
    render();
  } else if (data) {
    state = data;
    ui.messages = [];
    render();
  } else {
    updateStatus();
    if (cloud.recovery && page !== "profile") go("profile");
    else if (page === "profile" && !document.activeElement?.closest("form"))
      render();
  }
});
