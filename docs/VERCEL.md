# Trasferisci VYRA su Vercel

Il repository supporta entrambi gli hosting. Il database e gli account Supabase restano gli stessi; non eseguire nuovamente SQL e non cancellare il sito Netlify. Prima esporta i dati locali da VYRA → Impostazioni: il browser del nuovo dominio non vede quelli del vecchio dominio.

1. Apri https://vercel.com/signup e scegli **Continue with GitHub**. Per un progetto personale verifica il piano **Hobby**, limiti e condizioni su https://vercel.com/docs/plans/hobby e https://vercel.com/pricing. Il piano gratuito non garantisce risorse illimitate.
2. Premi **Add New → Project** e importa `matteotenti2004-droid/vita`. Se non compare, autorizza Vercel ad accedere a questo repository tramite **Adjust GitHub App Permissions**.
3. Framework **Vite**, root directory quella predefinita, build `npm run build`, output `dist`. Il repository contiene `vercel.json` e gli adattatori delle funzioni server.
4. In **Environment Variables** aggiungi le variabili sotto, abilitando **Production**. Inserisci i valori nei campi protetti, mai in chat o su GitHub.

| Nome | Valore |
|---|---|
| `SUPABASE_URL` | Indirizzo base del progetto Supabase, senza `/rest/v1/` |
| `SUPABASE_ANON_KEY` | Chiave Publishable dello stesso progetto, mai Secret/service_role |
| `VYRA_AI_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | Chiave Google già creata |
| `VYRA_GEMINI_MODEL` | `gemini-3.8-flash`, scelto dalla documentazione mostrata nel tuo account; verificarne disponibilità e quota gratuita |

5. Premi **Deploy**, attendi **Ready** e copia l'indirizzo Production `https://...vercel.app`.
6. Supabase → **Authentication → URL Configuration**: imposta **Site URL** al nuovo indirizzo Production; aggiungilo anche a **Redirect URLs**, mantenendo l'indirizzo Netlify se vuoi conservarlo. Salva. Evita wildcard generiche per domini di altri utenti.
7. Apri il nuovo sito, accedi con l'account esistente e controlla che siano presenti i dati sincronizzati. Se necessario importa il backup locale, ricordando che l'importazione sostituisce lo spazio attuale dopo conferma.
8. Prova l'assistente. Se fallisce, mostra il messaggio senza condividere chiavi o password. Il piano gratuito Gemini ha quote e condizioni proprie, separate dall'hosting. Non attivare fatturazione se vuoi restare sul piano gratuito.

Per modificare variabili dopo la pubblicazione: **Project → Settings → Environment Variables**, poi **Deployments → Redeploy**. I successivi commit su main possono avviare deploy automatici; evita deploy ripetuti inutilmente.

La compilazione e i test degli adattatori sono eseguiti localmente. La verifica reale di Vercel, Supabase e Gemini va completata dopo il tuo deploy. L'URL `/.netlify/functions/...` resta compatibile tramite rewrite Vercel: non richiede Netlify.
