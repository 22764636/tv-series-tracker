# CLAUDE.md

Regole per lavorare su questo progetto. Leggerle prima di ogni modifica.

## ⚠️ REGOLA CRITICA — massima priorità

**Se una richiesta è ambigua o sottospecificata, FERMARSI E CHIEDERE prima di
implementare.** Non indovinare, non interpretare a piacere, non scegliere in
autonomia il comportamento "più sensato" quando esistono più interpretazioni
plausibili e diverse tra loro. Questo vale in particolare per: comportamenti
UX non specificati nel dettaglio (es. cosa deve succedere esattamente quando
un utente interagisce con un elemento in uno stato particolare), nuove
funzionalità descritte in modo vago ("aggiungi un link", "migliora X"), e
qualsiasi modifica che tocca dati condivisi/produzione. Meglio una domanda in
più che una modifica sbagliata o, peggio, dati persi.

## ⚠️ REGOLA CRITICA — niente emoji non richieste

**Non aggiungere emoji a UI, testo, commit message o altro contenuto a meno
che l'utente non le richieda esplicitamente per quel caso specifico.**
Questo vale anche per emoji già presenti nel progetto: non riusarle altrove
né aggiungerne di nuove "per coerenza" o "per abbellire" di propria
iniziativa. Se l'utente chiede un'emoji specifica in un punto preciso,
aggiungerla solo lì.

## Cos'è

Webapp gratuita e multi-device per tenere traccia delle serie TV guardate
(stagione/episodio), usata senza login da un piccolo gruppo di persone
(io + partner) che vedono e modificano gli stessi dati.

## Decisioni architetturali (non cambiare senza discuterne)

- **Stack**: React + Vite + Tailwind CSS v4 (`@tailwindcss/vite`). Nessun
  framework SSR: non serve, l'app è puramente client-side.
- **Hosting**: GitHub Pages (statico, gratuito). Deploy automatico via
  `.github/workflows/deploy.yml` ad ogni push su `main`.
  - `vite.config.js` ha `base: '/tv-series-tracker/'`: se il nome del repo
    cambia, va aggiornato anche qui.
  - Routing con `HashRouter` (non `BrowserRouter`): GitHub Pages non supporta
    rewrite lato server per client-side routing, l'hash evita 404 sui
    refresh/link diretti.
- **Storage dati**: Firebase Firestore (piano gratuito Spark), **non**
  localStorage (serve multi-device) e **non** un database tradizionale da
  amministrare. Firestore è stato scelto rispetto a Supabase perché il piano
  free di Supabase mette in pausa i progetti dopo ~7 giorni di inattività;
  Firestore no — coerente con il requisito "niente servizi che si
  disattivano se non usati costantemente".
  - Un unico documento condiviso: `library/shared`. Nessun login, nessun
    codice personale: chiunque apra l'app vede e modifica la stessa
    libreria (vedi `src/lib/firebase.js` e `src/store/VaultContext.jsx`).
  - **Compromesso di sicurezza noto e accettato**: essendo un'app statica
    senza autenticazione, la config Firebase è visibile nel bundle JS (è
    inevitabile lato client) e le regole Firestore permettono lettura/
    scrittura aperta su quel singolo documento. Chiunque conosca l'URL
    dell'app potrebbe in teoria leggere/scrivere i dati. Accettabile per un
    tracker personale a basso rischio tra poche persone fidate. Non
    aggiungere dati sensibili a questo documento.
  - Aggiornamenti concorrenti (io + partner che spuntano episodi diversi
    nello stesso momento) usano `updateDoc` con path puntati
    (`series.<id>.watched.S1E2`), mai riscritture dell'intero documento:
    mantenere questo pattern per ogni nuova mutazione sui dati.
  - **Trappola nota (bug reale già capitato, non ripetere)**: `setDoc(ref,
    { campo: {} }, { merge: true })` con un oggetto **vuoto** NON lascia
    intatto il campo esistente — Firestore calcola la maschera di merge dai
    percorsi delle chiavi annidate, e un oggetto vuoto non ne ha nessuna,
    quindi il campo viene sostituito interamente con `{}`. Questo ha
    cancellato l'intera libreria condivisa (bug corretto in
    `VaultContext.jsx`: mai fare un "ensure doc exists" con un campo vuoto su
    un doc che può già contenere dati). Se serve creare il documento al primo
    utilizzo, farlo solo con `setDoc` di un oggetto che contiene già i dati
    reali da scrivere (es. dentro `addSeries`), mai con un placeholder vuoto
    su un mount/effect che gira ad ogni apertura dell'app.
- **Dati serie**: ricerca tramite TMDB API (`src/lib/tmdb.js`) con fallback
  di inserimento manuale (tab "Manuale" in `AddSeriesModal`) per le serie di
  nicchia assenti su TMDB. Non rimuovere l'opzione manuale.
- **Env vars**: tutte le chiavi (Firebase, TMDB) vanno lette da
  `import.meta.env.VITE_*`, mai hardcoded nel codice. Vedi `.env.example`.
- **Calendario** (`src/pages/Calendar.jsx` + `src/lib/schedule.js`), griglia
  mensile (lun-dom, navigazione libera avanti/indietro):
  - Ogni serie ha un campo opzionale `watchDays` (giorni della settimana in
    cui si prevede di guardarla).
  - **Futuro** (da domani in poi): le date mostrate **non sono mai
    salvate**, si ricalcolano ad ogni apertura della pagina da oggi +
    `watchDays` + numero di episodi non ancora visti rimanenti
    (`upcomingCalendarEntries`). Intenzionale: se si salta un giorno di
    visione previsto, la serie non sparisce dal calendario, lo slot si
    sposta semplicemente in avanti (il conteggio dipende dagli episodi
    rimasti, non da una data fissa). Non persistere le occorrenze calcolate
    né introdurre uno stato "saltato".
  - **Passato/oggi**: mostra la cronologia reale di cosa è stato visto,
    presa dalla data effettiva salvata per ogni episodio (vedi sotto), non
    dal piano `watchDays`. La data di un episodio già visto è modificabile
    direttamente dal Calendario (non dalla pagina serie, che resta un
    semplice toggle segna/non-segna visto).
- **`series.watched[SxEy]` è una data (`YYYY-MM-DD`), non `true`**: il
  giorno reale in cui l'episodio è stato segnato visto (vedi `dateKey` in
  `src/lib/schedule.js` — usa i componenti locali della data, MAI
  `toISOString()`, che converte a UTC e sfalsa il giorno vicino alla
  mezzanotte per chi non è in UTC). Tutto il codice che verifica se un
  episodio è visto deve continuare a controllare la sola verità del valore
  (`Boolean(watched[key])`), mai assumere che sia booleano.

## Stile — palette e principi

Stile minimal. La palette è definita **in un solo posto**,
`src/index.css` (`@theme` + override in `@media (prefers-color-scheme: dark)`),
come variabili CSS/token Tailwind semantici:

| Token              | Uso                                  |
|--------------------|---------------------------------------|
| `bg` / `surface`   | sfondo pagina / sfondo card-modali    |
| `text` / `muted`   | testo principale / testo secondario   |
| `border`           | bordi sottili                         |
| `accent`           | testo/link/badge d'accento (adatta al tema) |
| `accent-solid`     | sfondo bottoni pieni (**costante** tra i temi, sempre abbinato a `text-white`) |
| `success` / `danger` | stati positivi/negativi (badge "Completata", elimina, ecc.) |

Segue automaticamente lo schema chiaro/scuro del sistema operativo
dell'utente (`prefers-color-scheme`), nessun toggle manuale da mantenere.

## Style guide di riferimento — `design/style-guide.html`

Esiste una pagina HTML statica e autonoma, `design/style-guide.html`, che
elenca **ogni** token colore (nome variabile CSS + hex, in chiaro e scuro,
copiabile al click), e i pattern/classi di ogni componente (card, modale,
badge, bottoni, tabs, progress bar, episodi...) effettivamente usati
nell'app. Apribile direttamente nel browser, non fa parte della build React.

**Perché esiste**: permette di riferirsi a elementi/colori per nome (es.
"il bottone accent-solid", "il colore success-soft") invece che dover
descrivere tutto da zero ogni volta, ed evita la deriva tra "come pensiamo
sia fatta l'UI" e "come è fatta davvero".

**Va tenuta aggiornata SEMPRE**: ogni volta che si aggiunge/modifica un
componente, una classe, un colore o un token, aggiornare
`design/style-guide.html` nello stesso commit. Una style guide disallineata
dal codice reale è peggio che non averla.

## Regola di coerenza (esplicitamente richiesta)

**Stile e funzionalità devono essere coerenti in tutta la webapp.** In pratica:

- Usare sempre le utility semantiche sopra (`bg-surface`, `text-muted`,
  `bg-accent-solid`, ecc.), mai colori Tailwind grezzi (`bg-indigo-500`,
  `text-gray-400`...) o colori hardcoded in inline style.
- Riutilizzare i componenti condivisi (`Modal`, `ProgressBar`, `StatusBadge`,
  `SeriesCard`, `StatusTabs`, `EmptyState`) invece di reimplementarli con
  markup/stile leggermente diverso in una pagina specifica.
- Stesso raggio di bordo (`rounded-xl`/`rounded-2xl` per card e modali,
  `rounded-full` per pillole/badge/bottoni di stato) ovunque.
- La logica di progresso/episodio successivo/stato vive **solo** in
  `src/lib/progress.js` — non duplicare questi calcoli in un componente.
- Ogni azione utente disponibile in un punto dell'app (es. "Aggiungi serie")
  deve comportarsi allo stesso modo ovunque sia raggiungibile (bottone
  nell'header, sempre visibile, stesso modale).
- Prima di aggiungere una nuova pagina/componente, controllare se esiste già
  un pattern equivalente da riusare invece di introdurne uno nuovo.

## Regole generali di sviluppo

- Non introdurre un database o backend "vero" (Postgres, MySQL, server
  custom...) a meno che l'utente non lo richieda esplicitamente: la scelta
  di Firestore come backend gestito e senza manutenzione è deliberata.
- Non aggiungere login/autenticazione a meno che l'utente non lo richieda
  esplicitamente: il flusso "nessun login, dati condivisi" è voluto.
- Niente funzionalità speculative non richieste (feature flags, ruoli
  utente, notifiche push, offline-first/service worker...): tenere lo scope
  minimo e coerente con quanto discusso.
- Prima di un deploy reale, verificare che `npm run build` passi e che le
  env var richieste siano documentate in `README.md`.
- **Lo stato "Completata" viene impostato automaticamente** non appena
  l'ultimo episodio rimasto viene segnato visto (vedi `autoStatusUpdates` in
  `VaultContext.jsx`, usato sia da `toggleEpisode` che da
  `setSeasonWatched`). Non c'è invece auto-revert: se dopo il completamento
  si smarca un episodio, lo stato resta "Completata" finché non viene
  cambiato manualmente. Nota storica: una versione precedente di questa
  regola diceva l'opposto (mai automatico) — quella era un'incomprensione,
  corretta esplicitamente dall'utente; questa è la versione valida.
- **La valutazione (`rating`, 1–10 con mezzi punti)** è visibile/modificabile
  **solo** quando lo stato della serie è "Completata" (vedi `RatingRow` in
  `SeriesDetail.jsx`): il controllo non viene proprio renderizzato per le
  altre serie. Il valore non viene cancellato se lo stato cambia
  successivamente (stesso comportamento non distruttivo del link).
