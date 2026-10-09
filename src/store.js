export const STORAGE_KEY = "vyra-v2";
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const id = () => crypto.randomUUID();
export const number = (value, max = 1e9) =>
  Math.min(max, Math.max(0, Number(value) || 0));
export const initial = () => ({
  version: 2,
  profile: {
    name: "Matteo",
    bio: "Una vita più intenzionale, un passo alla volta.",
    photo: "",
  },
  settings: { theme: "light", palette: "ocean" },
  tasks: [],
  habits: [
    { id: "read", name: "Leggere 20 minuti", days: [] },
    { id: "move", name: "Muovermi ogni giorno", days: [] },
    { id: "me", name: "Un momento per me", days: [] },
  ],
  goals: [],
  notes: "",
  transactions: [],
  budget: 0,
  savingsTarget: 0,
  workouts: [],
  meals: [],
  wishlist: [],
  trips: [],
  projects: [],
  study: [],
});
export function safeURL(value, image = false) {
  try {
    if (
      image &&
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) &&
      value.length < 400000
    )
      return value;
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
const str = (v, n = 200) => (typeof v === "string" ? v.slice(0, n) : "");
const date = (v) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(new Date(`${v}T12:00:00`).getTime())
    ? v
    : "";
const rows = (v) =>
  Array.isArray(v)
    ? v.filter((x) => x && typeof x === "object").slice(0, 10000)
    : [];
const ident = (v) => str(String(v || id()), 100);
export function normalize(raw) {
  const s = initial(),
    r = raw && typeof raw === "object" ? raw : {};
  s.profile = {
    name: str(r.profile?.name, 60) || s.profile.name,
    bio: str(r.profile?.bio, 500) || "",
    photo: safeURL(r.profile?.photo, true),
  };
  s.settings = {
    theme: ["light", "dark", "system"].includes(r.settings?.theme)
      ? r.settings.theme
      : "light",
    palette: ["ocean", "violet", "amber", "rose"].includes(r.settings?.palette)
      ? r.settings.palette
      : "ocean",
  };
  s.notes = str(r.notes, 300000);
  s.budget = number(r.budget);
  s.savingsTarget = number(r.savingsTarget);
  s.tasks = rows(r.tasks).map((t) => ({
    id: ident(t.id),
    title: str(t.title),
    category: str(t.category, 40) || "Personale",
    date: date(t.date),
    time: /^\d{2}:\d{2}$/.test(t.time) ? t.time : "",
    priority: ["Alta", "Normale", "Bassa"].includes(t.priority)
      ? t.priority
      : "Normale",
    done: Boolean(t.done),
    minutes: number(t.minutes, 1440),
    completedAt: date(t.completedAt),
    project: str(t.project, 100),
  }));
  if (Array.isArray(r.habits))
    s.habits = rows(r.habits).map((h) => ({
      id: ident(h.id),
      name: str(h.name),
      days: [
        ...new Set(
          (Array.isArray(h.days) ? h.days : []).map(date).filter(Boolean),
        ),
      ],
    }));
  s.goals = rows(r.goals).map((g) => ({
    id: ident(g.id),
    name: str(g.name),
    progress: number(g.progress, 100),
    date: date(g.date),
  }));
  s.transactions = rows(r.transactions).map((t) => ({
    id: ident(t.id),
    name: str(t.name),
    type: ["income", "expense", "saving", "withdrawal"].includes(t.type)
      ? t.type
      : "expense",
    amount: number(t.amount),
    category: str(t.category, 40),
    date: date(t.date) || dayKey(),
  }));
  s.workouts = rows(r.workouts).map((w) => ({
    id: ident(w.id),
    name: str(w.name),
    minutes: number(w.minutes, 1440),
    date: date(w.date) || dayKey(),
  }));
  s.meals = rows(r.meals).map((m) => ({
    id: ident(m.id),
    name: str(m.name),
    meal: ["Colazione", "Pranzo", "Cena", "Spuntino"].includes(m.meal)
      ? m.meal
      : "Spuntino",
    grams: number(m.grams, 10000),
    kcal: number(m.kcal, 100000),
    protein: number(m.protein, 10000),
    carbs: number(m.carbs, 10000),
    fat: number(m.fat, 10000),
    date: date(m.date) || dayKey(),
  }));
  s.wishlist = rows(r.wishlist).map((w) => ({
    id: ident(w.id),
    name: str(w.name),
    url: safeURL(w.url),
    image: safeURL(w.image, true),
    price: w.price === null || w.price === "" ? null : number(w.price),
    currency: ["EUR", "USD", "GBP"].includes(w.currency) ? w.currency : "EUR",
    bought: Boolean(w.bought),
  }));
  s.trips = rows(r.trips).map((t) => ({
    id: ident(t.id),
    name: str(t.name),
    start: date(t.start),
    end: date(t.end),
    budget: number(t.budget),
    spent: number(t.spent),
    notes: str(t.notes, 10000),
    url: safeURL(t.url),
    checklist: rows(t.checklist).map((c) => ({
      id: ident(c.id),
      name: str(c.name),
      done: Boolean(c.done),
    })),
  }));
  s.projects = rows(r.projects).map((p) => ({
    id: ident(p.id),
    name: str(p.name),
    description: str(p.description, 1000),
    date: date(p.date),
  }));
  s.study = rows(r.study).map((x) => ({
    id: ident(x.id),
    name: str(x.name),
    minutes: number(x.minutes, 1440),
    date: date(x.date) || dayKey(),
  }));
  return s;
}
export function load(storage = localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    const old = storage.getItem("vita-v1");
    return normalize(old ? JSON.parse(old) : initial());
  } catch {
    return initial();
  }
}
export function persist(state, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}
export function finance(state, month = dayKey().slice(0, 7)) {
  const rows = state.transactions.filter((t) => t.date.startsWith(month));
  const sum = (type) =>
    rows.filter((t) => t.type === type).reduce((n, t) => n + t.amount, 0);
  const income = sum("income"),
    expense = sum("expense"),
    saved = sum("saving") - sum("withdrawal");
  const savings = state.transactions.reduce(
    (n, t) =>
      n +
      (t.type === "saving"
        ? t.amount
        : t.type === "withdrawal"
          ? -t.amount
          : 0),
    0,
  );
  return {
    income,
    expense,
    saved,
    savings,
    available: income - expense - saved,
    budgetUsed: state.budget ? (expense / state.budget) * 100 : 0,
    rows,
  };
}
export function nutrition(state, date = dayKey()) {
  return state.meals
    .filter((m) => m.date === date)
    .reduce(
      (a, m) => {
        for (const key of ["kcal", "protein", "carbs", "fat"]) a[key] += m[key];
        return a;
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
}
export function history(state, days = 7, end = new Date()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setDate(d.getDate() - days + 1 + i);
    const date = dayKey(d);
    return {
      date,
      label: d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
      time:
        state.tasks
          .filter((t) => t.done && t.completedAt === date)
          .reduce((a, t) => a + t.minutes, 0) +
        state.study
          .filter((t) => t.date === date)
          .reduce((a, t) => a + t.minutes, 0),
      workouts: state.workouts.filter((t) => t.date === date).length,
      habits: state.habits.filter((h) => h.days.includes(date)).length,
      calories: nutrition(state, date).kcal,
      savings: state.transactions
        .filter((t) => t.date === date)
        .reduce(
          (a, t) =>
            a +
            (t.type === "saving"
              ? t.amount
              : t.type === "withdrawal"
                ? -t.amount
                : 0),
          0,
        ),
    };
  });
}
