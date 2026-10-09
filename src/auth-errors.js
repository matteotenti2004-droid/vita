const messages = {
  invalid_credentials: "Email o password non corrette.",
  email_not_confirmed:
    "Conferma prima la tua email usando il link ricevuto, poi accedi.",
  user_already_exists:
    "Questa email è già registrata. Usa Accedi oppure recupera la password.",
  signup_disabled:
    "Le nuove registrazioni sono disabilitate. Il proprietario deve abilitarle nelle impostazioni Authentication di Supabase.",
  email_provider_disabled:
    "L’accesso email è disabilitato. Attivalo in Supabase → Authentication → Sign In / Providers → Email.",
  email_address_invalid:
    "L’indirizzo email non è stato accettato dal servizio. Verifica che sia completo e corretto.",
  email_address_not_authorized:
    "Il servizio email di Supabase non autorizza questo destinatario. Il proprietario deve configurare il servizio SMTP oppure usare un indirizzo autorizzato del proprio progetto.",
  over_email_send_rate_limit:
    "È stato raggiunto il limite di invio email di Supabase. Attendi prima di riprovare; se necessario verifica il servizio SMTP.",
  over_request_rate_limit:
    "Troppe richieste al servizio account. Attendi qualche minuto prima di riprovare.",
  weak_password:
    "La password non soddisfa i requisiti del progetto Supabase. Usa almeno 8 caratteri e verifica i requisiti impostati nel servizio.",
  captcha_failed:
    "La registrazione richiede una verifica CAPTCHA che non è ancora collegata al sito. Verifica la configurazione Authentication di Supabase.",
};
export function authError(error = {}) {
  const code =
    typeof error.code === "string" && /^[a-z_]{1,60}$/.test(error.code)
      ? error.code
      : "";
  if (Object.hasOwn(messages, code)) return messages[code];
  const message = typeof error.message === "string" ? error.message : "";
  if (/invalid api key|invalid apikey|no api key found/i.test(message))
    return "La chiave Supabase non è accettata da questo progetto. Ricopia la Publishable key dallo stesso progetto del Project URL e aggiorna SUPABASE_ANON_KEY su Netlify.";
  if (/invalid login/i.test(message)) return messages.invalid_credentials;
  if (/already registered/i.test(message)) return messages.user_already_exists;
  if (/email not confirmed/i.test(message)) return messages.email_not_confirmed;
  if (/signup.*disabled/i.test(message)) return messages.signup_disabled;
  if (/email.*rate limit/i.test(message))
    return messages.over_email_send_rate_limit;
  if (/rate limit/i.test(message)) return messages.over_request_rate_limit;
  if (
    /error sending confirmation email|error sending recovery email|smtp/i.test(
      message,
    )
  )
    return "Supabase non riesce a inviare l’email. Controlla il servizio SMTP e i log Authentication del progetto prima di riprovare.";
  if (
    error.name === "AuthRetryableFetchError" ||
    /failed to fetch|network|fetch failed/i.test(message)
  )
    return "Il browser non riesce a contattare Supabase. Verifica che SUPABASE_URL sia il Project URL copiato dal progetto e che la connessione sia disponibile.";
  if (/password/i.test(message)) return messages.weak_password;
  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
      ? `HTTP ${error.status}`
      : "";
  const reference = [code, status].filter(Boolean).join(" · ");
  return `Il servizio account ha rifiutato la richiesta${reference ? ` (${reference})` : ""}. Controlla i log Authentication del progetto Supabase per conoscere il motivo.`;
}
