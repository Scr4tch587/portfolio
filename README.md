# [portfolio](https://kaizhang.ca/)

---

A personal project showcase styled as a parody of the Spotify web player — down to Spotify's actual fonts, icon glyphs, and pixel-measured layout.

Viewing a project for an extended period "streams" it, contributing to a live **Popular** list that ranks projects by total stream count — the more you linger, the higher it climbs. Each project's README plays back as scrolling "lyrics", timed to the track.

### Features

- **Streaming system** — 5 continuous seconds on a project counts as a stream; counts increment server-side in Firestore and update live for every visitor
- **README "lyrics"** — GitHub READMEs are processed by a Cloud Functions pipeline (text, code, tables, images) and auto-scroll in sync with playback; a GitHub webhook reprocesses on push
- **Accounts** — Google sign-in with unique usernames, public profiles (bio, photo, follower/following counts), and follows
- **Liked projects** — session-only for visitors; synced to your account and merged on sign-in
- **Playlists** — build, reorder, and share playlists of projects (private / unlisted / public) with `#/playlist/…` deep links
- **Direct messages** — username-addressed DMs between signed-in users, backed by rate-limited Cloud Functions with block lists and reporting
- **Search** — projects, profiles, and public playlists from one search box
- **Admin panel** — Google-sign-in gated (admin custom claim) panel for managing project data
- **Stream toasts & counters** — small UI moments that reward engagement

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
