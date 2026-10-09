// Never forward upstream text: it may contain credentials or user content.
export function geminiError(status, data = {}) {
  const error = data.error || {};
  const reasons = (Array.isArray(error.details) ? error.details : []).map(d => d.reason);
  const message = typeof error.message === "string" ? error.message : "";
  if (reasons.includes("API_KEY_INVALID") || /API key not valid|invalid API key/i.test(message))
    return "Gemini rifiuta la chiave API. Ricopia la chiave completa da Google AI Studio in GEMINI_API_KEY su Netlify, poi esegui un nuovo deploy.";
  if (reasons.includes("API_KEY_SERVICE_BLOCKED") || reasons.includes("API_KEY_HTTP_REFERRER_BLOCKED") || reasons.includes("API_KEY_IP_ADDRESS_BLOCKED"))
    return "Le restrizioni della chiave Google bloccano la funzione Netlify. Verifica che la chiave consenta Gemini API e richieste dal server, non soltanto da un sito web.";
  if (reasons.includes("SERVICE_DISABLED"))
    return "Gemini API non è abilitata nel progetto Google associato alla chiave. Controlla il progetto in Google AI Studio.";
  if (/location.*not supported|country.*not supported/i.test(message))
    return "Gemini API non è disponibile nella regione da cui parte la richiesta. Occorre verificare le regioni supportate per il servizio.";
  if (status === 404)
    return "Il modello Gemini non è disponibile per questa API o progetto (HTTP 404). Controlla VYRA_GEMINI_MODEL su Netlify; il modello predefinito è gemini-2.5-flash.";
  if (status === 403)
    return "Google nega l’accesso a Gemini (HTTP 403). Verifica progetto, autorizzazioni e restrizioni della chiave in Google AI Studio.";
  if (status === 400)
    return "Gemini rifiuta il formato della richiesta (HTTP 400). Serve verificare la compatibilità del modello e della richiesta nel codice di VYRA.";
  if (status === 429)
    return "Gemini ha raggiunto il limite del piano. Attendi e riprova più tardi: non viene usato OpenAI come alternativa a pagamento.";
  return `Gemini non è disponibile (HTTP ${status}). Riprova tra poco.`;
}
