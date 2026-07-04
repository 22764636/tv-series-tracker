# Serie — TV Series Tracker

Webapp gratuita e multi-device per tenere traccia delle serie TV che stai
guardando, stagione per stagione, episodio per episodio. Nessun login: chi
apre l'app vede e modifica la stessa libreria condivisa.

Vedi [`CLAUDE.md`](./CLAUDE.md) per le decisioni architetturali e le regole
di stile/coerenza del progetto.

## Stack

- React + Vite + Tailwind CSS v4
- Firebase Firestore come storage condiviso (nessun database da amministrare,
  piano gratuito che non si disattiva per inattività)
- TMDB API per la ricerca automatica delle serie (con fallback manuale)
- Hosting su GitHub Pages, deploy automatico via GitHub Actions

## Setup locale

```bash
npm install
cp .env.example .env.local   # poi compila le chiavi (vedi sotto)
npm run dev
```

### 1. Firebase (storage dati)

1. Crea un progetto gratuito su [Firebase Console](https://console.firebase.google.com/).
2. Aggiungi un'app **Web** al progetto (icona `</>`) e copia la config che
   ti mostra (`apiKey`, `authDomain`, `projectId`, ...) nelle variabili
   `VITE_FIREBASE_*` del tuo `.env.local`.
3. Attiva **Firestore Database** (modalità produzione va bene) dalla sezione
   "Build" della console.
4. Nella tab **Regole** di Firestore, imposta:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /library/shared {
         allow read, write: if true;
       }
     }
   }
   ```

   ⚠️ Questo rende il documento condiviso leggibile/scrivibile da chiunque
   conosca l'URL dell'app (non c'è login). Scelta consapevole per un
   tracker personale a basso rischio — vedi `CLAUDE.md`. Non salvarci dati
   sensibili.

### 2. TMDB (dati serie TV)

1. Crea un account gratuito su [themoviedb.org](https://www.themoviedb.org/).
2. Vai su **Impostazioni > API** e richiedi una API Key (v3 auth, gratuita).
3. Incollala in `VITE_TMDB_API_KEY` nel tuo `.env.local`.

Se una serie non è su TMDB (contenuti di nicchia), usa la tab "Manuale"
nel modale "Aggiungi serie".

## Deploy su GitHub Pages

Il workflow `.github/workflows/deploy.yml` builda e pubblica l'app ad ogni
push su `main`.

1. Nelle impostazioni del repo, **Settings > Pages**, imposta la sorgente su
   **GitHub Actions**.
2. In **Settings > Secrets and variables > Actions**, aggiungi come secret
   ognuna delle variabili elencate in `.env.example`
   (`VITE_FIREBASE_API_KEY`, ..., `VITE_TMDB_API_KEY`).
3. Push su `main`: il sito sarà pubblicato su
   `https://<utente>.github.io/tv-series-tracker/`.

Se rinomini il repository, aggiorna anche `base` in `vite.config.js`.

## Script

- `npm run dev` — sviluppo locale
- `npm run build` — build di produzione in `dist/`
- `npm run preview` — anteprima della build
- `npm run lint` — lint con Oxlint
