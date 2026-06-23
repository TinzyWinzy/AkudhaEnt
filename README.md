# Akudha — Baobab Agri-Logistics PWA

Offline-first agricultural logistics platform for baobab sourcing, processing, and distribution. Built as a Progressive Web App with React, TypeScript, and Express.

## Architecture

```
frontend/        React + TypeScript SPA (Vite)
├── src/
│   ├── components/    UI components (Sourcing, Processing, Distribution panels)
│   ├── context/       AuthContext, store hooks
│   ├── lib/           Permissions, storage, sync, validation, fraud detection
│   └── main.tsx       Entry point
server/          Express API
├── routes/       Harvest, Batch, Order REST endpoints
├── models/       Mongoose schemas
├── middleware/    Auth, RBAC, region scoping
└── ai/           Gemini enrichment (optional)
```

### Key Design Decisions

- **localStorage** is the primary data store; the server is an optional sync target
- **Offline-first**: all mutations write to localStorage first; sync happens when online
- **Role-based access**: field_coordinator, operations_manager, super_admin — each sees only relevant tabs and data (region-scoped for coordinators)
- **Hybrid AI agents**: rules-based fraud detection always on; Gemini enrichment optional (requires `GEMINI_API_KEY` in `.env.local`)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

For Gemini enrichment support, create `.env.local` with:
```
GEMINI_API_KEY=your_key_here
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | TypeScript type check |
| `npm test` | Run test suite |
| `npm run clean` | Remove `dist/` |
| `npm run dev:server` | Start Express API server |

## Deployment

The frontend builds to a static `dist/` folder deployable to any static host (Vercel, Netlify, etc.). The Express API server deploys separately.

```bash
npm run build
# Deploy dist/ to your preferred host
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend**: Express, Mongoose, TypeScript
- **Testing**: Vitest
- **Offline**: localStorage, Cache API (Service Worker)
