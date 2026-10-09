import { createClient } from "@supabase/supabase-js";
import { initial, normalize, persist } from "./store.js";
export const cloud = {
  client: null,
  user: null,
  status: "local",
  configured: false,
  revision: null,
  recovery: false,
  error: "",
  busy: false,
};
let onChange = () => {},
  timer,
  currentData,
  generation = 0,
  saving = false,
  queued = false;
const cacheKey = () => `vyra-account-${cloud.user.id}`;
const dirtyKey = () => `${cacheKey()}-pending`;
const translate = (e) =>
  /Invalid login/i.test(e.message)
    ? "Email o password non corrette."
    : /already registered/i.test(e.message)
      ? "Questa email è già registrata."
      : /rate limit/i.test(e.message)
        ? "Troppe richieste: riprova tra poco."
        : /Password/i.test(e.message)
          ? "La password deve avere almeno 8 caratteri."
          : "Il servizio non è disponibile. Verifica la connessione o riprova.";
export async function initCloud(callback) {
  onChange = callback;
  try {
    const r = await fetch("/.netlify/functions/config");
    if (!r.ok) return;
    const c = await r.json();
    if (!c.supabaseUrl || !c.supabaseKey) return;
    cloud.client = createClient(c.supabaseUrl, c.supabaseKey);
    cloud.configured = true;
    cloud.client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        cloud.recovery = true;
        onChange(null);
      }
      if (session?.user?.id === cloud.user?.id) return;
      setTimeout(() => activate(session?.user || null), 0);
    });
    const { data } = await cloud.client.auth.getSession();
    await activate(data.session?.user || null);
  } catch {
    cloud.error = "Account cloud temporaneamente non disponibile.";
  } finally {
    onChange(null);
  }
}
async function activate(user) {
  if (user?.id === cloud.user?.id) return;
  generation++;
  clearTimeout(timer);
  cloud.user = user;
  cloud.revision = null;
  cloud.error = "";
  if (!user) {
    cloud.status = "local";
    onChange("guest");
    return;
  }
  const gen = generation;
  cloud.status = "loading";
  onChange(initial());
  try {
    const { data, error } = await cloud.client
      .from("user_spaces")
      .select("data,revision")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (gen !== generation) return;
    cloud.revision = data?.revision ?? null;
    const local = localStorage.getItem(cacheKey()),
      pending = localStorage.getItem(dirtyKey());
    if (pending && local) {
      currentData = normalize(JSON.parse(local));
      cloud.status = "conflict";
      cloud.error =
        "Ci sono modifiche locali non sincronizzate. Scegli quali dati conservare nel profilo.";
    } else {
      currentData = data ? normalize(data.data) : initial();
      if (!data)
        currentData.profile.name = user.user_metadata?.name || "Il mio spazio";
      localStorage.setItem(cacheKey(), JSON.stringify(currentData));
      cloud.status = "synced";
    }
    onChange(currentData);
  } catch {
    if (gen !== generation) return;
    const local = localStorage.getItem(cacheKey());
    if (local) {
      currentData = normalize(JSON.parse(local));
      cloud.status = "offline";
      cloud.error =
        "Sincronizzazione sospesa. Le modifiche restano su questo dispositivo.";
      onChange(currentData);
    } else {
      cloud.status = "error";
      cloud.error =
        "Impossibile caricare i dati dell’account. Nessun dato verrà sovrascritto.";
      onChange(initial());
    }
  }
}
export function saveData(data) {
  if (!cloud.user) {
    persist(data);
    return;
  }
  if (["loading", "error"].includes(cloud.status))
    throw new Error(
      "Attendi il caricamento dell’account prima di modificare i dati.",
    );
  currentData = structuredClone(data);
  localStorage.setItem(cacheKey(), JSON.stringify(currentData));
  localStorage.setItem(dirtyKey(), "1");
  if (["conflict", "offline"].includes(cloud.status)) return;
  cloud.status = "pending";
  clearTimeout(timer);
  timer = setTimeout(() => sync(), 700);
}
async function sync(force = false) {
  if (!cloud.user) return;
  if (saving) {
    queued = true;
    return;
  }
  saving = true;
  const gen = generation,
    snapshot = JSON.stringify(currentData),
    uid = cloud.user.id;
  try {
    let result;
    if (force) {
      const existing = await cloud.client
        .from("user_spaces")
        .select("revision")
        .eq("id", uid)
        .maybeSingle();
      if (existing.error) throw existing.error;
      cloud.revision = existing.data?.revision ?? null;
    }
    if (cloud.revision === null)
      result = await cloud.client
        .from("user_spaces")
        .insert({ id: uid, data: JSON.parse(snapshot), revision: 1 })
        .select("revision")
        .single();
    else
      result = await cloud.client
        .from("user_spaces")
        .update({ data: JSON.parse(snapshot), revision: cloud.revision + 1 })
        .eq("id", uid)
        .eq("revision", cloud.revision)
        .select("revision")
        .maybeSingle();
    if (gen !== generation) return;
    if (result.error || !result.data) {
      cloud.status = "conflict";
      cloud.error =
        "I dati cloud potrebbero essere cambiati. Apri il profilo per risolvere la sincronizzazione.";
      onChange(null);
      return;
    }
    cloud.revision = result.data.revision;
    cloud.error = "";
    if (snapshot === JSON.stringify(currentData)) {
      localStorage.removeItem(dirtyKey());
      cloud.status = "synced";
    } else {
      cloud.status = "pending";
      queued = true;
    }
  } catch {
    if (gen === generation) {
      cloud.status = "offline";
      cloud.error =
        "Connessione interrotta: dati salvati sul dispositivo, sincronizzazione da riprovare.";
    }
  } finally {
    saving = false;
    if (gen === generation) {
      onChange(null);
      if (queued) {
        queued = false;
        if (!["offline", "conflict"].includes(cloud.status)) sync();
      }
    }
  }
}
export async function resolveCloud(useLocal) {
  if (useLocal) {
    await sync(true);
    return;
  }
  const user = cloud.user;
  cloud.user = null;
  localStorage.removeItem(`vyra-account-${user.id}-pending`);
  await activate(user);
}
export async function authenticate(mode, email, password, name) {
  if (!cloud.client)
    throw new Error("Il collegamento account deve ancora essere attivato.");
  const result =
    mode === "signup"
      ? await cloud.client.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: location.origin },
        })
      : await cloud.client.auth.signInWithPassword({ email, password });
  if (result.error) throw new Error(translate(result.error));
  return result.data;
}
export async function resetPassword(email) {
  const { error } = await cloud.client.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin,
  });
  if (error) throw new Error(translate(error));
}
export async function newPassword(password) {
  const { error } = await cloud.client.auth.updateUser({ password });
  if (error) throw new Error(translate(error));
  cloud.recovery = false;
}
export async function signOut() {
  if (cloud.status === "pending") await sync();
  if (
    ["offline", "conflict"].includes(cloud.status) &&
    !confirm(
      "Ci sono modifiche non sincronizzate. Rimarranno salvate su questo dispositivo. Vuoi uscire?",
    )
  )
    return;
  await cloud.client.auth.signOut();
}
export async function bearer() {
  const { data } = (await cloud.client?.auth.getSession()) || { data: {} };
  return data.session?.access_token || "";
}
