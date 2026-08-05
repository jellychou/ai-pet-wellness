# Food・Heart (monorepo)

A pet food and AI mental-coaching frontend project, rebuilt from the provided designs. Managed with npm workspaces; more apps will be added over time.

## Project Structure
```
.
├── apps/
│   ├── web/        # React frontend
│   └── api/        # FastAPI + PostgreSQL backend
├── packages/        # Shared packages go here (currently empty)
└── docker-compose.yml  # Local PostgreSQL
```

See below for the frontend; for the backend (`apps/api`) tech stack and setup steps, see [apps/api/README.md](apps/api/README.md).

## Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- i18next (Traditional Chinese / English)

## Rebuild Highlights
- Fixed left-side brand and navigation sidebar
- Dense card grid dashboard, instead of a typical single-column admin layout
- Pet profiles, vaccines, food log, AI diagnosis, AI chat, mood, journal history, health checks, calorie recommendations
- Bottom analytics, UI components, and core feature sections
- Desktop / tablet / mobile responsive design

## Running the App
Install from the repo root (npm workspaces automatically handles all apps/packages):
```bash
npm install
npm run dev
```
You can also run a single workspace:
```bash
npm run dev -w apps/web
```

## Build
```bash
npm run build
```

> Pet photos currently use placeholder images; swap in API or local assets for production.

## Deploying to GitHub Pages
Pushing to `main` automatically triggers `.github/workflows/deploy.yml`, which builds `apps/web` and deploys it to GitHub Pages. The first time you enable this, go to the repo's **Settings → Pages → Build and deployment → Source** and select **GitHub Actions** (one-time setup). Once deployed, the site will be available at:

```
https://jellychou.github.io/ai-pet-wellness/
```
