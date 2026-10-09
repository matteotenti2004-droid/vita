import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  normalize,
  load,
  persist,
  STORAGE_KEY,
  finance,
  nutrition,
  history,
  safeURL,
} from "../src/store.js";
import { portion, foods } from "../src/foods.js";
const memory = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
  };
};
test("Vita migration preserves tasks, completed state, habits, goals and notes without modifying the old copy", () => {
  const storage = memory(),
    old = {
      tasks: [
        {
          id: 12,
          title: "Studiare",
          done: true,
          category: "Studio",
          date: "2026-10-09",
          priority: "Alta",
        },
      ],
      habits: [{ id: 5, name: "Leggere", days: ["2026-10-08"] }],
      goals: [{ id: 7, name: "Un obiettivo", progress: 40 }],
      notes: "Idee da conservare",
    };
  storage.setItem("vita-v1", JSON.stringify(old));
  const s = load(storage);
  assert.equal(s.tasks[0].id, "12");
  assert.equal(s.tasks[0].title, "Studiare");
  assert.equal(s.tasks[0].done, true);
  assert.equal(s.habits[0].days[0], "2026-10-08");
  assert.equal(s.goals[0].progress, 40);
  assert.equal(s.notes, old.notes);
  persist(s, storage);
  assert.deepEqual(JSON.parse(storage.getItem("vita-v1")), old);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, 2);
});
test("Local persistence propagates storage failures instead of pretending to save", () => {
  assert.throws(
    () =>
      persist(initial(), {
        setItem() {
          throw Error("Quota exceeded");
        },
      }),
    /Quota/,
  );
});
test("Monthly finances distinguish real expenses, savings transfers and withdrawals", () => {
  const s = initial();
  s.transactions = [
    { date: "2026-10-01", type: "income", amount: 2000 },
    { date: "2026-10-02", type: "expense", amount: 350 },
    { date: "2026-10-03", type: "saving", amount: 400 },
    { date: "2026-10-04", type: "withdrawal", amount: 50 },
    { date: "2026-09-30", type: "saving", amount: 100 },
  ];
  s.budget = 700;
  const f = finance(s, "2026-10");
  assert.equal(f.income, 2000);
  assert.equal(f.expense, 350);
  assert.equal(f.saved, 350);
  assert.equal(f.available, 1300);
  assert.equal(f.savings, 450);
  assert.equal(f.budgetUsed, 50);
});
test("Meals calculate portion values and daily totals without including other days", () => {
  const food = foods.find((f) => f.name === "Yogurt greco 0%"),
    p = portion(food, 200);
  assert.equal(p.kcal, 118);
  assert.equal(p.protein, 20.6);
  const s = initial();
  s.meals = [
    { date: "2026-10-09", ...p },
    { date: "2026-10-08", ...p },
  ];
  assert.equal(nutrition(s, "2026-10-09").kcal, 118);
});
test("Activity time and study count on the actual completion date, workouts and habits on their recorded day", () => {
  const s = initial();
  s.tasks = [
    { done: true, completedAt: "2026-10-09", minutes: 45 },
    { done: true, completedAt: "", minutes: 120 },
    { done: false, completedAt: "2026-10-09", minutes: 80 },
  ];
  s.study = [{ date: "2026-10-09", minutes: 30 }];
  s.workouts = [{ date: "2026-10-09", minutes: 30 }];
  s.habits = [{ days: ["2026-10-09"] }];
  const h = history(s, 2, new Date(2026, 9, 9, 12));
  assert.equal(h[1].time, 75);
  assert.equal(h[1].workouts, 1);
  assert.equal(h[1].habits, 1);
  assert.equal(h[0].time, 0);
});
test("Untrusted imports cannot set script URLs, invalid preferences or out of range progress", () => {
  const s = normalize({
    ...initial(),
    profile: { photo: "javascript:alert(1)" },
    settings: { theme: "evil", palette: "bad" },
    goals: [{ id: "1", progress: 300 }],
    wishlist: [
      { url: "javascript:alert(1)", image: "data:text/html,evil", price: null },
    ],
  });
  assert.equal(s.profile.photo, "");
  assert.equal(s.settings.theme, "light");
  assert.equal(s.goals[0].progress, 100);
  assert.equal(s.wishlist[0].price, null);
  assert.equal(s.wishlist[0].url, "");
  assert.equal(s.wishlist[0].image, "");
  assert.equal(safeURL("https://user:pass@example.com"), "");
});
test("Null or malformed imported lists and fields normalize safely", () => {
  const s = normalize({
    tasks: [null, 2, { title: "OK" }],
    trips: [{ checklist: [null, 4, { name: "Passaporto" }] }],
    habits: [
      { name: "Leggere", days: ["invalid", "2026-10-09", "2026-10-09"] },
    ],
  });
  assert.equal(s.tasks.length, 1);
  assert.equal(s.trips[0].checklist.length, 1);
  assert.equal(s.habits[0].days.length, 1);
});
