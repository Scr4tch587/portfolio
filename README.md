# [portfolio](https://kaizhang.ca/)

---

A personal project showcase with two skins: a parody of the Spotify web player — down to Spotify's actual fonts, icon glyphs, and pixel-measured layout — and a Letterboxd mode where every project is a film you can rate. First visits get Spotify; the site remembers which mode you last left it in, and `#/lb…` links always open Letterboxd.

Playing a project "streams" it, contributing to a live **Popular** list that ranks projects by total stream count — the more plays, the higher it climbs. Each project's README plays back as scrolling "lyrics", timed to the track.

### Features

- **Streaming system** — every play counts as a stream; counts increment server-side in Firestore and update live for every visitor
- **README "lyrics"** — GitHub READMEs are processed by a Cloud Functions pipeline (text, code, tables, images) and auto-scroll in sync with playback; a GitHub webhook reprocesses on push
- **Hand-written READMEs** — experiences without a repo get a markdown README written in the admin panel (with image upload); it runs through the same pipeline and plays back the same way
- **Liked projects** — no accounts; likes are remembered in the browser
- **Search** — fuzzy, synonym-aware project search
- **Admin panel** — Google-sign-in gated (admin custom claim) panel for managing project data; the only sign-in on the site
- **Stream toasts & counters** — small UI moments that reward engagement
- **Letterboxd mode** — the same catalog as a film site: the owner's profile is home, projects are films with posters, synopsis, stack/links/details tabs, a like + half-star rating action box and a ratings histogram; processed READMEs read as Journal long-reads. Ratings are anonymous, one per browser, with server-aggregated averages on the project (`rateProject` callable)

### Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 7, TailwindCSS 4 |
| Backend / DB | Firebase — Firestore, Auth (Google), Storage, Cloud Functions v2 (Node 22) |
| Testing | Playwright e2e suite (`portfolio/e2e/`) |
| Build | Vite 7 |
| Deployment | GitHub Pages via CD pipeline; functions/rules via Firebase CLI |

### Local Development

```bash
cd portfolio
npm install
npm run dev
```

Firebase config is expected via environment variables (prefixed `VITE_FIREBASE_*`). Copy `.env.example` if present, or set them manually.

```bash
npx playwright test   # e2e suite (talks to live Firebase; runs serially)
```

---

**eugene was here**
