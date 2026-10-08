# Vita

Dashboard personale in italiano per attività, calendario, abitudini, obiettivi e appunti. Interfaccia responsive, costruita con JavaScript e Vite.

## Sviluppo

Richiede Node.js 20.19+ o 22.12+.

```sh
npm ci --cache /tmp/vita-npm-cache
npm run dev -- --port 5173
```

## Build

```sh
npm run build
npm run preview -- --port 4173
```

I dati sono salvati in localStorage nel browser corrente. Non sono sincronizzati tra dispositivi. La cancellazione dei dati del browser li rimuove. Non sono presenti account o backend. Nessuna credenziale richiesta.

Il calendario mostra le scadenze delle attività; selezionare un giorno apre l'inserimento di un'attività. Le abitudini si completano una volta al giorno e gli obiettivi hanno un progresso regolabile.
