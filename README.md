# [portfolio](https://kaizhang.ca/)

---

A personal project showcase styled as a parody of the Spotify artist page.

Viewing a project for an extended period "streams" it, contributing to a live **Popular Projects** list that ranks projects by total stream count — the more you linger, the higher it climbs.

### Features

- **Streaming system** — time spent on a project page counts as a stream, persisted in Firestore
- **Liked projects** — like individual projects, saved per-session
- **Search** — quickly filter across all projects
- **Admin panel** — password-protected panel for managing project data
- **Stream toasts & badges** — small UI moments that reward engagement (first stream badge, stream counter, etc.)

### Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router 7, TailwindCSS |
| Icons | Lucide React |
| Backend / DB | Firebase (Firestore) |
| Build | Vite |
| Deployment | GitHub Pages via CD pipeline |

### Local Development

```bash
cd portfolio
npm install
npm run dev
```

Firebase config is expected via environment variables (prefixed `VITE_FIREBASE_*`). Copy `.env.example` if present, or set them manually.

---

**eugene was here**
