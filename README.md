# VYRA — La vita, organizzata.

VYRA è l'evoluzione di Vita: dashboard in italiano, menu laterale blu notte, accenti verde acqua e paesaggio montano vettoriale. Non contiene dati personali di esempio. Mantiene attività, calendario, abitudini, obiettivi e appunti di Vita presenti nello stesso browser e sullo stesso dominio.

## Funzioni

- **Panoramica:** priorità, agenda settimanale, finanze, obiettivi e abitudini, con valori calcolati dai dati registrati.
- **Attività e progetti:** inserimento, modifica, completamento, filtri e ricerca; categoria, scadenza, orario, durata e progetto.
- **Calendario:** agenda mensile con attività e giorni di viaggio. Promemoria delle attività in scadenza dentro il sito.
- **Obiettivi e abitudini:** progresso modificabile, scadenze e storico dei giorni completati.
- **Finanze:** entrate, uscite, accantonamenti e prelievi; budget mensile, obiettivo di risparmio, distribuzione delle spese. Un accantonamento non viene contato come una spesa.
- **Salute:** diario degli allenamenti, durata e riepiloghi. Diario alimentare per giorno e pasto, alimenti generici e valori personalizzati da etichetta; calorie e macro calcolati dalla quantità in grammi. I valori generici sono indicativi, non un piano alimentare; crudo e cotto sono distinti.
- **Lista desideri:** tabella con nome, prezzo, valuta, immagine, stato e link. Recupero di metadati Product JSON-LD/OpenGraph lato server quando il negozio li espone; modifica manuale sempre disponibile. Nessuna promessa di aggiornamento prezzi o di supporto a tutti i negozi.
- **Viaggi:** destinazione, date, budget, speso, itinerario, link e checklist. Le date compaiono nel calendario.
- **Studio e appunti:** sessioni con durata e archivio di note con salvataggio mentre scrivi.
- **Statistiche:** grafici di tempo, risparmi netti, allenamenti, abitudini, calorie e progresso degli obiettivi; intervalli di 7, 30 e 90 giorni. Solo dati registrati. Il tempo delle attività entra nello storico al completamento; le vecchie attività senza data di completamento sono escluse.
- **Profilo e impostazioni:** nome, biografia, foto ridimensionata, tema chiaro/scuro/sistema, quattro palette, esportazione/importazione JSON.
- **Account:** Supabase Auth email/password, registrazione, conferma email, recupero password e sincronizzazione dell'intero spazio. Cache distinta per utente, dati ospite separati, controllo delle revisioni per evitare sovrascritture silenziose tra dispositivi. I dati di Vita si importano nell'account solo con conferma.
- **Assistente Gemini / OpenAI:** domande rapide, contesto di attività/obiettivi facoltativo e proposte strutturate di attività da confermare. Non esegue acquisti, prenotazioni o modifiche autonome. La conversazione resta nella memoria della pagina, senza essere archiviata nel database.

## Pubblicazione su Netlify

Il progetto è collegabile al repository GitHub `matteotenti2004-droid/vita`. Il nome VYRA non richiede la rinomina del repository o del dominio esistente.

`netlify.toml` configura automaticamente build `npm run build`, cartella `dist`, funzioni `netlify/functions` e Node.js 22. Un push su `main` può avviare il deploy quando Netlify è collegato a quel ramo. Il deploy del solo ZIP di `dist` non installa le funzioni server.

Leggi **[la guida per attivare account e AI](docs/ATTIVAZIONE.md)**. Senza le configurazioni esterne l'app rimane utilizzabile in modalità locale; accesso/sincronizzazione e AI sono esplicitamente indicati come non attivi. L'anteprima dei prodotti funziona su Netlify grazie alla funzione server e può fallire su negozi che bloccano lo scraping.

## Sviluppo

Node.js 22.12+ e npm. Nessuna chiave è necessaria per sviluppare le pagine e usare i dati locali.

```sh
npm ci --cache /tmp/vita-npm-cache
npm run dev -- --port 5173
```

Vite serve anche le tre funzioni Netlify tramite middleware locale. Per servizi reali copia `.env.example` in `.env` e inserisci le configurazioni nel file locale, escluso da Git. Non usare prefissi `VITE_` per le chiavi segrete.

```sh
npm test
npm run build
```

Verifiche del browser (con il server di sviluppo già avviato):

```sh
npx playwright install chromium
npm run test:browser
npm run test:account
```

Nel cloud si usa Chromium già installato in `/usr/bin/chromium`; altrove si può impostare `CHROMIUM_PATH` oppure usare il Chromium installato da Playwright. Gli script usano browser isolati, dati di prova effimeri e non modificano lo spazio personale del browser dell'utente.

`test:browser` prova migrazione Vita, CRUD, calcoli, calendario, checklist, temi, ricerca, esportazione e tutte le 17 pagine a 390/760/1024 px. `test:account` usa il vero SDK Supabase con servizi simulati per provare accesso, isolamento ospite/utenti, sincronizzazione, conflitti e conferma delle proposte AI. I test server esercitano autenticazione, schema AI, protezioni degli URL e metadati con risposte upstream simulate. **Non sostituiscono una verifica reale di OpenAI, Supabase e delle policy del progetto dopo l'attivazione.**

## Dati e servizi

- Modalità ospite: `localStorage`, chiave `vyra-v2`. La copia precedente `vita-v1` resta intatta.
- Account: cache locale per UUID e tabella `user_spaces` con Row Level Security. Accesso tramite chiave pubblicabile/anon, mai `service_role`. Sincronizzazione al salvataggio; su un altro dispositivo ricaricare la pagina per recuperare le modifiche remote. Le modifiche offline sono conservate localmente; il profilo permette di risolverle quando la connessione torna.
- AI: chiave del fornitore AI solo nella funzione server, verifica della sessione Supabase, contesto limitato e limite di richieste per utente nella singola istanza della funzione. Nessuna chiave segreta nel bundle.
- Prodotti: solo HTTPS pubblico, porte standard, verifica DNS e indirizzi pubblici, connessione fissata all'indirizzo verificato, verifica TLS, controlli ripetuti sui redirect, limiti di tempo e dimensione. Gli URL non consentiti non vengono visitati.
- Calcoli, profilo e preferenze non richiedono servizi terzi. I promemoria sono nel sito, senza push o email automatiche. Viaggi, allenamenti e budget non sono collegati a conti bancari o servizi di prenotazione.

## Hosting Vercel

Supportato tramite `api/` e `vercel.json`, con gli stessi handler server di Netlify. Segui [la guida Vercel](docs/VERCEL.md) per trasferire il sito mantenendo account e database.
