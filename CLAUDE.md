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
  - **Aggiorna da TMDB**: bottone per-serie in `SeriesDetail.jsx`, visibile
    solo per `series.source === 'tmdb'` (`refreshFromTmdb` in
    `VaultContext.jsx`). Ri-scarica **solo** titolo/poster/stagioni/flag
    `ongoing` da TMDB — non tocca mai `watched`/`status`/`rating`/`link`/
    `watchDays`. Unica eccezione deliberata: se il refresh rivela episodi
    nuovi rispetto a prima su una serie il cui stato era "Completata" o "In
    attesa di nuova stagione" (cioè tutto il conosciuto era già visto), lo
    stato torna a "Da vedere" — così il normale meccanismo
    planned→watching (vedi sotto) si riattiva da solo quando l'utente segna
    visto il primo episodio nuovo, senza bisogno di logica ad-hoc separata.
  - **Link Wikipedia EN/IT**: mostrati in `SeriesDetail.jsx`, calcolati di
    default dal titolo (`src/lib/wikipedia.js`, `wikipediaUrl(title, lang)`)
    — nessuna chiamata API, è un link "indovinato" diretto all'URL
    dell'articolo con quel titolo. **Modificabile/sovrascrivibile** per
    singola serie (`series.wikipediaEn`/`wikipediaIt`, `setWikipediaLink` in
    `VaultContext.jsx`) per i casi in cui il titolo indovinato punta
    all'articolo sbagliato o a una pagina di disambiguazione — stesso
    pattern edit/display di `LinkRow`. Cancellare l'override torna al link
    calcolato, non lo rimuove del tutto. Non introdurre una vera
    integrazione API Wikipedia per questo.
- **Env vars**: tutte le chiavi (Firebase, TMDB) vanno lette da
  `import.meta.env.VITE_*`, mai hardcoded nel codice. Vedi `.env.example`.
- **Icona app**: cuori blu e viola su un divano in stile illustrazione
  glossy/3D. Due varianti perché il divano non si legge sotto i ~40px:
  - `public/favicon.svg` — solo i due cuori (versione vettoriale
    semplificata), usata per il tab del browser (`<link rel="icon">` in
    `index.html`).
  - `public/icon-192.png`/`icon-512.png` — **artwork illustrata** (non un
    export da un SVG vettoriale: sono l'immagine sorgente originale,
    fornita/curata direttamente dall'utente, sfondo **trasparente**
    intenzionale), usata in `manifest.json` come icone `"purpose": "any"` e
    come base per la variante maskable sotto. `apple-touch-icon.png`
    (180×180, sfondo pieno perché iOS non supporta trasparenza) è
    generato dalla stessa artwork. Se si aggiorna l'icona, farlo
    sostituendo direttamente questi PNG (l'artwork stessa è la fonte,
    niente da "rigenerare" da un SVG) e ri-derivare `apple-touch-icon.png`
    e la variante maskable sotto dalla nuova immagine.
  - **Icona maskable separata** (`icon-maskable-192.png`/
    `icon-maskable-512.png`, `"purpose": "maskable"` in `manifest.json`,
    entry **separata** dagli icon "any" sopra — mai `"purpose": "any
    maskable"` sulla stessa entry, Chrome lo segnala come problema in
    DevTools): su Android 8+ ogni app usa un'icona adattiva che richiede
    uno sfondo **opaco**; senza una variante maskable, Chrome/Android
    impacchetta l'icona "any" (trasparente) dentro un riquadro bianco per
    soddisfare comunque quel requisito — non è un bug nostro, è
    documentato su web.dev. La variante maskable risolve il riquadro
    bianco componendo l'artwork PNG sopra (non una ricostruzione
    vettoriale separata: sarebbe un'illustrazione diversa, non la stessa
    icona) su uno sfondo `accent-solid` (`#4f46e5`) pieno, scalata al 75%
    e centrata — percentuale calcolata dal bounding box reale dei pixel
    non trasparenti dell'artwork (non una stima), per stare dentro la
    "safe zone" circolare (~80% di diametro) che i launcher Android
    possono ritagliare. **Richiede necessariamente la rinuncia alla
    trasparenza per questa sola variante** (scelta esplicita dell'utente:
    preferita al riquadro bianco). Se si aggiorna l'artwork, ricalcolare
    lo scale factor dal nuovo bounding box invece di riusare 75% a
    memoria.
  - **Nota Firefox Android**: "Aggiungi a schermata Home" da Firefox può
    ignorare del tutto icona/nome del manifest e mostrare l'icona
    generica del robottino Android — bug noto e ricorrente di Firefox
    (Bugzilla #1440661, #1234558), non risolvibile lato nostro
    manifest/codice. Non provare a "correggerlo" di nuovo: non è un
    problema della nostra configurazione.
- **Calendario** (`src/pages/Calendar.jsx` + `src/lib/schedule.js`), griglia
  mensile (lun-dom, navigazione libera avanti/indietro):
  - Ogni serie ha un campo opzionale `watchDays` (giorni della settimana in
    cui si prevede di guardarla).
  - **Futuro (oggi incluso)**: le date mostrate **non sono mai salvate**, si
    ricalcolano ad ogni apertura della pagina da oggi + `watchDays` +
    numero di episodi non ancora visti rimanenti
    (`upcomingCalendarEntries`). La scansione include **oggi stesso**: una
    serie il cui giorno di visione è oggi ma il cui episodio non è ancora
    segnato visto deve comparire nella cella di oggi, non saltare
    all'occorrenza successiva (altrimenti una serie con giorno di visione
    solo la domenica, controllata proprio di domenica, sparirebbe per una
    settimana intera). Intenzionale: se si salta un giorno di visione
    previsto, la serie non sparisce dal calendario, lo slot si sposta
    semplicemente in avanti (il conteggio dipende dagli episodi rimasti,
    non da una data fissa). Non persistere le occorrenze calcolate né
    introdurre uno stato "saltato". Nota storica: una versione precedente
    escludeva deliberatamente oggi dalla proiezione ("comincia da domani") —
    l'utente ha poi corretto esplicitamente questo comportamento perché
    causava lo slittamento sopra descritto; questa è la versione valida.
  - **Passato/oggi**: mostra la cronologia reale di cosa è stato visto,
    presa dalla data effettiva salvata per ogni episodio (vedi sotto), non
    dal piano `watchDays`. La data di un episodio già visto è modificabile
    direttamente dal Calendario (non dalla pagina serie, che resta un
    semplice toggle segna/non-segna visto).
  - Navigazione tra i mesi: bottoni ← →, rotellina del mouse (desktop) e
    swipe orizzontale (touch), tutti e tre attivi contemporaneamente sulla
    stessa griglia — non rimuovere nessuno dei tre in favore degli altri.
    Ogni cambio mese rigioca un'animazione slide+fade direction-aware
    (classi `.animate-slide-next`/`.animate-slide-prev` in `index.css`,
    rigiocata rimontando la griglia con una `key` React legata a
    `${year}-${month}`). Lo scroll con rotellina ha un cooldown breve
    (`useRef`, non state React, 150ms) solo per evitare che un singolo gesto
    del trackpad salti più mesi insieme — non allungarlo: uno scroll rapido
    e deliberato deve poter cambiare mese rapidamente in sequenza.
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
- **Lo stato "Completata" (o "In attesa di nuova stagione") viene impostato
  automaticamente** non appena l'ultimo episodio rimasto viene segnato
  visto (vedi `autoStatusUpdates` in `VaultContext.jsx`, usato sia da
  `toggleEpisode` che da `setSeasonWatched`). Quale dei due stati dipende
  dal flag `series.ongoing` (impostato da TMDB in base al campo `status`
  della serie — "Ended"/"Canceled" → `false`, tutto il resto → `true`, vedi
  `isOngoing` in `tmdb.js`): se la serie è ancora in corso di rinnovo
  diventa "In attesa di nuova stagione", altrimenti "Completata". Le serie
  manuali non hanno `ongoing` (nessuna fonte TMDB) e vanno sempre su
  "Completata", comportamento invariato. Non c'è auto-revert quando si
  smarca un episodio dopo il completamento: lo stato resta quello
  automatico finché non viene cambiato manualmente (o finché un refresh
  TMDB non rivela episodi nuovi, vedi sopra). Nota storica: una versione
  precedente di questa regola diceva l'opposto (mai automatico) — quella
  era un'incomprensione, corretta esplicitamente dall'utente; questa è la
  versione valida.
- **La valutazione è doppia**: un cuore blu 💙 e un cuore viola 💜, una
  valutazione indipendente a testa (i due membri della coppia), non un
  singolo numero condiviso. Ogni cuore accetta un decimale da 1 a 10 con
  **fino a due cifre decimali** (`step="0.01"`, es. 7.88). I due cuori come
  emoji sono una scelta esplicita dell'utente per questo punto preciso —
  non riusarli altrove nell'app (vedi regola no-emoji in cima al file).
  - **Valutazione per episodio** (`series.episodeRatings[SxEy] = { blue?,
    purple? }`, `setEpisodeRating` in `VaultContext.jsx`): votabile appena
    l'episodio è segnato visto, **indipendentemente dallo stato della
    serie** (non solo a "Completata" — scelta esplicita dell'utente, per
    poter votare mentre si guarda). Righe per-episodio in `SeasonBlock`
    (`SeriesDetail.jsx`), stesso componente `HeartRating` riusato sia lì che
    per il voto totale.
  - **Voto totale calcolato automaticamente**: `series.ratingBlue` /
    `ratingPurple` sono la **media dei voti per episodio di quella persona**
    (`aggregateHeartRating` in `progress.js`), ricalcolata e riscritta ad
    ogni voto-episodio — **il calcolo automatico vince sempre** (scelta
    esplicita dell'utente): se esiste anche un solo voto per episodio per
    quel cuore, il totale è sempre quel calcolo, non un valore digitato a
    mano. La modifica manuale del totale (`setRating`, stesso
    `HeartRating`) resta utile **solo finché non esiste ancora nessun voto
    per episodio** per quel cuore — non è un "override" persistente: al
    primo voto-episodio di quel cuore, il calcolo lo sovrascrive.
  - Il "voto finale" mostrato (card e pagina serie) resta la **media dei
    due totali** (`averageRating` in `progress.js`, invariato): se uno dei
    due non ha ancora un totale, la media mostrata è semplicemente quello
    presente. `formatRating()` arrotonda a 2 decimali e toglie gli zeri
    finali per la visualizzazione (8 invece di 8.00, 7.5 invece di 7.50).
  - Il **voto totale** (riga "Valutazione: X/10" + i due `HeartRating` in
    cima alla pagina serie) resta visibile/modificabile **solo** quando lo
    stato della serie è "Completata" (non anche "In attesa di nuova
    stagione") — questa parte è invariata rispetto a prima. Il voto **per
    episodio**, invece, non ha questo vincolo (vedi sopra). Nessuno dei due
    valori viene cancellato se lo stato cambia successivamente (stesso
    comportamento non distruttivo del link).
  - **Grafico voti per episodio** (`src/components/RatingChart.jsx`, sotto
    il voto totale in `SeriesDetail.jsx`, solo se almeno un episodio ha un
    voto): grafico a linee responsive, senza libreria esterna (SVG
    disegnato a mano con `viewBox`, `width: 100%` + `min-width` in px così
    si allarga a riempire la card quando c'è spazio ma scorre
    orizzontalmente invece di comprimersi quando gli episodi votati non ci
    stanno), un punto per episodio votato (S1E1, S1E2, ...) con tre linee —
    💙, 💜 e una linea tratteggiata "Media" in grigio (`--color-muted`)
    perché è un valore derivato, non un terzo voto. Sopra al grafico, una
    riga sempre visibile (non solo in hover) mostra i totali correnti —
    "💙 X/10", "💜 X/10", "Media X/10" — passati come props
    (`totalBlue`/`totalPurple`/`totalAverage`) calcolati dal chiamante con
    gli helper di `progress.js`, mai ricalcolati dentro il componente.
    Crosshair + tooltip al passaggio del mouse/tocco (valori sempre
    visibili anche senza hover nelle righe per-episodio sopra, che fanno da
    "vista tabellare"). **Colori**: `--chart-blue`/`--chart-purple` in
    `index.css`, deliberatamente separati dalla palette semantica dell'app
    (vedi tabella sotto) perché qui il colore deve portare *identità*
    (persona A vs persona B), non stato — validati con lo script
    `validate_palette.js` della skill dataviz per separazione CVD e
    contrasto contro `bg-surface`, sia chiaro che scuro. Non toccare questi
    due valori senza rivalidarli.
- **Durata episodi e tempo rimanente**:
  - `series.episodeDurations[SxEy]` (minuti). Per le serie TMDB, scaricata
    automaticamente — `getEpisodeDurations` in `tmdb.js` fa una chiamata
    per stagione (`/tv/{id}/season/{n}`, non inclusa nella chiamata
    principale usata per titolo/poster/stagioni) sia all'aggiunta sia ad
    ogni "Aggiorna da TMDB"; gli episodi non ancora andati in onda
    (`runtime` nullo su TMDB) restano senza durata finché non lo
    diventano. Per le serie manuali non esiste nessuna fonte automatica:
    la durata si inserisce a mano per episodio (`setEpisodeDuration` in
    `VaultContext.jsx`), disponibile **anche prima di segnare l'episodio
    visto** (a differenza del voto, che richiede l'episodio già visto) —
    serve a poter calcolare il tempo rimanente anche su episodi non ancora
    guardati.
  - **Tempo rimanente** (`remainingMinutes`/`formatDuration` in
    `progress.js`): somma delle durate degli episodi **non visti** di cui
    si conosce la durata — un episodio senza durata nota viene
    semplicemente escluso dalla somma (mai contato come 0), quindi il
    totale può sottostimare ma mai sovrastimare. Ricalcolato dal vivo ad
    ogni render (mai salvato), esattamente come `progressRatio`. Mostrato
    in due punti: il totale dell'intera serie accanto a "X/Y episodi
    visti" nell'header, e uno scoped per singola stagione accanto
    all'intestazione "Stagione N" — entrambi nascosti quando il valore è 0
    (che sia perché non resta nulla da vedere o perché non si conosce
    nessuna durata: in entrambi i casi nascondere è la scelta giusta, non
    c'è bisogno di distinguerli).
  - Riga per-episodio in `SeasonBlock`: mostra la durata (testo semplice
    per le serie TMDB, editabile con lo stesso pattern edit/display/add
    di `LinkRow` per le manuali) affiancata ai voti a cuore quando
    l'episodio è visto. La riga compare per ogni episodio visto (voto) o,
    per le serie manuali, per **ogni** episodio indipendentemente dal
    visto (durata sempre editabile); per le serie TMDB un episodio non
    visto compare solo se la sua durata è già nota.
- **`StatusTabs` su mobile** scorre orizzontalmente (`overflow-x-auto` +
  classe di utilità `.no-scrollbar` in `index.css` per nascondere la
  scrollbar senza disabilitare lo scroll, bottoni con `shrink-0`) invece di
  andare a capo su due righe: andare a capo spingerebbe in basso la griglia
  delle serie sotto. Ogni riga di filtri/ordinamento che rischia di non
  entrare su schermi stretti deve seguire lo stesso pattern (scroll, non
  wrap), non introdurne di nuovi.
- **Layout `SeriesDetail.jsx`**: solo titolo, pillole di stato, barra di
  progresso (+ episodi visti/tempo rimanente), link, Wikipedia, "Aggiorna
  da TMDB" ed "Elimina serie" restano nella colonna stretta accanto al
  poster (l'header "di identità" della serie) — sono compatti e ci stanno
  bene. "Giorni di visione" e "Valutazione + grafico" sono invece sezioni
  proprie a piena larghezza sotto l'header (card
  `rounded-2xl border border-border bg-surface p-4`), non più schiacciate
  nella colonna stretta: sono le due sezioni "pesanti" (7 pillole, grafico
  responsive) che avevano davvero bisogno di tutta la larghezza pagina.
  Non spostare di nuovo tutto in un'unica colonna stretta accanto al
  poster: è il motivo per cui la pagina risultava compressa e disordinata
  prima di questa modifica.
- **PWA, tasto back Android**: mitigazione nota per il frame vuoto grigio che
  Android può mostrare per un istante sulla home page prima che un secondo
  back chiuda l'app (vedi `useEffect` in `App.jsx`: se
  `display-mode: standalone`, un `history.pushState` all'avvio imbottisce
  lo stack di history con una voce in più, così il primo back consuma
  quella invece di uscire a vuoto). È un mitigamento, non una garanzia: il
  frame grigio può essere un artefatto di rendering di Android/Chrome
  durante lo smontaggio della WebAPK, non completamente risolvibile da puro
  JS lato client senza un wrapper nativo.
