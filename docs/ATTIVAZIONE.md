# Attiva account, sincronizzazione e assistente VYRA

Le nuove sezioni funzionano già nel browser. Per accesso email e AI servono due servizi esterni: Supabase e OpenAI. Non inviare password o chiavi segrete in chat e non inserirle nei file GitHub.

## 1. Crea il servizio account su Supabase

1. Apri [supabase.com/dashboard](https://supabase.com/dashboard), crea un account ed entra.
2. Crea un **New project**, ad esempio `vyra`, e scegli una regione adatta. Conserva la password del database in un posto sicuro.
3. Nel progetto apri **SQL Editor → New query**.
4. Apri nel repository il file [`netlify/supabase.sql`](../netlify/supabase.sql), copia il suo contenuto nel SQL Editor e premi **Run**. Il file è ripetibile e crea tabella e policy che limitano ogni utente al proprio spazio.
5. Nelle impostazioni del progetto recupera **Project URL** e la chiave **Publishable** (oppure la vecchia chiave `anon`). **Non usare la chiave Secret né `service_role`.**
6. Apri **Authentication → URL Configuration**. Imposta **Site URL** su `https://vitw.netlify.app` (o il tuo dominio attuale) e aggiungi lo stesso indirizzo alle **Redirect URLs**. Per sviluppo locale aggiungi separatamente `http://localhost:5173`.
7. Nella configurazione dei provider di Authentication verifica che **Email** sia abilitato. Con conferma email abilitata, completa la conferma prima di accedere. Per un uso solo personale, dopo aver creato il tuo account puoi disabilitare nuove registrazioni nelle impostazioni di Supabase.

## 2. Collega Supabase a Netlify

1. Apri il progetto `vitw` su Netlify.
2. Vai in **Project configuration → Environment variables** (in alcune schermate la voce è direttamente nel menu).
3. Aggiungi queste variabili, per il contesto **Production** e lo scope delle **Functions**:

| Nome | Valore |
| --- | --- |
| `SUPABASE_URL` | Project URL del tuo progetto, nel formato `https://…supabase.co` |
| `SUPABASE_ANON_KEY` | Chiave Publishable oppure anon, non Secret/service_role |

Sono lette a runtime dalle funzioni: non servono prefissi `VITE_`. La chiave pubblicabile è per definizione visibile al browser; la protezione dei dati dipende dalle policy SQL del passaggio 1.

## 3. Attiva OpenAI

1. Apri [platform.openai.com/api-keys](https://platform.openai.com/api-keys) nel tuo account OpenAI.
2. Abilita il credito/API se necessario: l'abbonamento ChatGPT non include automaticamente l'utilizzo delle API.
3. Crea una chiave API e inseriscila **solo** nella variabile protetta Netlify `VYRA_AI_API_KEY`, scope **Functions**, contesto **Production**. Non incollarla in chat o nel codice pubblico.
4. Facoltativamente aggiungi `VYRA_AI_MODEL` con il nome di un modello compatibile con output JSON strutturato. Il valore predefinito è `gpt-4o-mini`.

## 4. Pubblica la configurazione e verifica

1. In Netlify apri **Deploys** e avvia un nuovo deploy del ramo `main` (**Trigger deploy → Deploy site**, o l'opzione equivalente). Le funzioni server devono essere distribuite insieme al sito.
2. Apri `https://vitw.netlify.app` e ricarica la pagina.
3. Apri **Altre sezioni → Profilo personale → Registrati**. Crea l'account e conferma la tua email se richiesto.
4. Accedi. Quando compare **Sincronizzato**, modifica un appunto o aggiungi un'attività.
5. Accedi allo stesso account su un altro dispositivo e verifica i dati dopo il caricamento.
6. Se hai dati del vecchio Vita, nel profilo premi **Importa i dati locali di Vita** solo dopo aver controllato la conferma: sostituisce il contenuto dell'account con quello locale. Per sicurezza puoi esportare prima una copia dalle impostazioni.
7. Apri **Altre sezioni → Assistente AI** e invia una domanda. Con il contesto selezionato vengono inviate attività da fare e obiettivi; nessun dato finanziario o diario alimentare è incluso automaticamente.
8. Se il modello propone attività, clicca **Aggiungi** solo su quelle che vuoi conservare.

## Se qualcosa non funziona

- **Profilo ancora in modalità locale:** verifica nomi/scopes delle variabili Supabase, URL del progetto e nuovo deploy. La configurazione deve usare un host `*.supabase.co`.
- **Account creato ma accesso non riuscito:** controlla l'email di conferma e che Site URL/Redirect URLs corrispondano al tuo dominio.
- **Account non disponibile dopo l'accesso:** verifica di aver eseguito il file SQL nel progetto collegato. Non disabilitare RLS per risolvere l'errore.
- **Conflitto di sincronizzazione:** apri il profilo. Puoi ricaricare la versione cloud o conservare esplicitamente quella del dispositivo. Esporta una copia prima di scegliere se hai dubbi.
- **Assistente non attivo:** verifica `VYRA_AI_API_KEY`, scope Functions, credito OpenAI e modello; esegui un nuovo deploy. Non condividere la chiave per chiedere aiuto.
- **Un negozio non importa nome/prezzo/immagine:** alcuni siti bloccano il recupero. Inserisci i dettagli nel modulo, mantenendo il link originale.
