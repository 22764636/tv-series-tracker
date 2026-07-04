# Serie — TV Series Tracker

Free, multi-device webapp to track the TV series you're watching, season by
season, episode by episode. No login: whoever opens the app sees and edits
the same shared library.

See [`CLAUDE.md`](./CLAUDE.md) for architecture decisions and the project's
style/consistency rules. See [`design/style-guide.html`](./design/style-guide.html)
for the full visual reference (every color token, component, and class used
in the app).

## Stack

- React + Vite + Tailwind CSS v4
- Firebase Firestore as shared storage (no database to administer, free tier
  that doesn't deactivate from inactivity)
- TMDB API for automatic series search (with manual fallback)
- Hosted on GitHub Pages, automatic deploy via GitHub Actions

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys (see below)
npm run dev
```

### 1. Firebase (data storage)

1. Create a free project at [Firebase Console](https://console.firebase.google.com/).
2. Add a **Web** app to the project (`</>` icon) and copy the config it
   shows you (`apiKey`, `authDomain`, `projectId`, ...) into the
   `VITE_FIREBASE_*` variables in your `.env.local`.
3. Enable **Firestore Database** (production mode is fine) from the "Build"
   section of the console.
4. In the Firestore **Rules** tab, set:

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

   ⚠️ This makes the shared document readable/writable by anyone who knows
   the app's URL (there's no login). A conscious tradeoff for a low-risk
   personal tracker — see `CLAUDE.md`. Don't store sensitive data in it.

### 2. TMDB (TV series data)

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/).
2. Go to **Settings > API** and request an API Key (v3 auth, free).
3. Paste it into `VITE_TMDB_API_KEY` in your `.env.local`.

If a series isn't on TMDB (niche content), use the "Manual" tab in the "Add
series" modal.

## Deploying to GitHub Pages

The `.github/workflows/deploy.yml` workflow builds and publishes the app on
every push to `main`.

1. In the repo settings, **Settings > Pages**, set the source to
   **GitHub Actions**.
2. In **Settings > Secrets and variables > Actions**, add each variable
   listed in `.env.example` as a secret
   (`VITE_FIREBASE_API_KEY`, ..., `VITE_TMDB_API_KEY`).
3. Push to `main`: the site will be published at
   `https://<user>.github.io/tv-series-tracker/`.

If you rename the repository, also update `base` in `vite.config.js`.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build into `dist/`
- `npm run preview` — preview the build
- `npm run lint` — lint with Oxlint
