# Akudha Agri-Logistics Platform — Maturity Assessment

**Date:** 23 June 2026  
**Version:** 0.0.0  
**Audit Scope:** Full-stack PWA (React + Express + MongoDB)

---

## Overall Score: **2.8 / 5** — Early Functional

| Dimension | Score | Summary |
|-----------|:-----:|---------|
| Architecture & Code Organization | 3 / 5 | Modular extraction done, but schema duplication is a risk |
| TypeScript & Type Safety | 2 / 5 | No strict mode, no linting, implicit any permitted |
| Testing | 3 / 5 | 49 tests covering core logic, but zero integration/E2E tests |
| Security | 2 / 5 | Demo-only auth, no RBAC on server, no request validation |
| Deployment & DevOps | 2 / 5 | Vite builds, but no CI/CD, Windows-incompatible scripts, 8 outdated deps |
| Documentation | 2 / 5 | README is AI Studio boilerplate, no API docs |
| Offline & Resilience | 3 / 5 | localStorage-first works but no real service worker or IndexedDB |
| AI Integration | 3 / 5 | Well-designed agents with graceful fallback, model name hard-coded |
| Performance | 3 / 5 | 422 KB gzip'd JS bundle, no code splitting |
| Maintainability | 2 / 5 | Triplicated tab mappings, duplicate schemas, high technical debt |

---

## 1. Architecture & Code Organization — 3/5

### Strengths
- Clean separation: `src/components/`, `src/hooks/`, `src/lib/`, `src/types/`
- Barrel exports (`index.ts`) in every module
- Pure business logic extracted to `src/lib/` (pricing, yield, margins, validation, permissions)
- Server code isolated in `server/` with clear route/model/service structure
- Mock offline queue with idempotency UUIDs is well-designed

### Issues
- **Schema duplication:** `src/mongooseSchemas.ts` (304 lines) duplicates `server/models/HarvesterSourcing.ts`, `ProcessingBatch.ts`, `VendorDispatch.ts`. Any field change must be made in 2 places.
- **Triplicated tab-to-role mapping:** `App.tsx`, `TabNav.tsx`, and `AuthContext.tsx` each define `VALID_TABS_FOR_ROLE` / `VISIBLE_TABS` independently.
- **`vite` in both `dependencies` and `devDependencies`** in `package.json`.
- **`clean` script uses `rm -rf`** (Unix-only) — broken on Windows.
- **`dev:all` script** spawns child processes without cleanup on exit.

### Recommendations
1. Consolidate Mongoose schemas — either use `server/models/` as source of truth and remove `src/mongooseSchemas.ts`, or import from `server/models/` in the client (if needed).
2. Consolidate tab-to-role mapping into `src/lib/permissions.ts` and import it everywhere.
3. Remove `vite` from `dependencies` (it's already in `devDependencies`).
4. Replace `rm -rf` with a cross-platform tool like `rimraf` or `del-cli`.

---

## 2. TypeScript & Type Safety — 2/5

### Strengths
- All source files are `.ts`/`.tsx`
- Well-typed domain models (`HarvesterRecord`, `ProcessingBatch`, `OutboundConsignment`)
- Permission system is fully typed with `Role`, `UserClaims`, `RolePermissions`

### Issues
- **No `strict: true`** in `tsconfig.json` — allows implicit `any`, null/undefined access, and loose type checking
- **No ESLint or Prettier** — no code style enforcement
- **`experimentalDecorators: true`** enabled but unused
- 4 pre-existing type errors in `src/mongooseSchemas.ts` (Mongoose 9.x callback signature)
- **`filterHarvestsByRegion` returns all harvests regardless of role** — the filtering logic was left incomplete

### Recommendations
1. Enable `"strict": true` in `tsconfig.json` and fix resulting errors.
2. Add ESLint with `@typescript-eslint` and Prettier.
3. Remove unused `"experimentalDecorators": true`.
4. Fix pre-existing Mongoose type errors (migrate `pre('save')` callbacks to async pattern).
5. Implement the region filtering logic in `filterHarvestsByRegion`.

---

## 3. Testing — 3/5

### Strengths
- 49 unit tests across 6 test files, all passing
- Tests map directly to Gherkin scenarios from the Agile Backlog (AKU-101, AKU-201, AKU-202, AKU-301, AKU-302)
- Clean vitest configuration with globals
- AI agent tests include fallback/edge cases

### Issues
- **Zero integration tests** — no tests for API routes, database interactions, or the sync pipeline
- **Zero component/E2E tests** — no React Testing Library or Playwright tests
- **Test environment is `node`** — cannot test React components (needs `jsdom`)
- No test coverage reporting configured

### Recommendations
1. Add integration tests for all 9 API endpoints (use supertest + in-memory MongoDB).
2. Add component tests with React Testing Library + vitest-jsdom.
3. Add one E2E smoke test with Playwright.
4. Enable coverage reporting (`--coverage` in vitest).
5. Aim for 80%+ coverage on `src/lib/` and `server/services/`.

---

## 4. Security — 2/5

### Strengths
- Role-based view masking on the frontend (RBAC UI layer)
- No real secrets committed (`.env*` in `.gitignore`)
- AI agents gracefully fall back to rules-only when `GEMINI_API_KEY` is unset

### Issues
- **No authentication** — the login overlay is a demo role picker with no password/token
- **No server-side auth or RBAC** — all API routes are open
- **No input sanitization** on API `POST` endpoints (trusts client data)
- **No rate limiting, CSRF protection, or Helmet headers**
- **No HTTPS enforcement**
- **No content security policy (CSP) headers**

### Recommendations
1. Add JWT-based authentication (or at minimum a pre-shared API key for demo).
2. Apply RBAC middleware to server routes (scaffolding exists in this sprint's plan).
3. Add `express-rate-limit`, `helmet`, and `cors` origin whitelist.
4. Validate request bodies with Zod or Joi on POST/PUT routes.
5. Add a CSP via `helmet.contentSecurityPolicy`.

---

## 5. Deployment & DevOps — 2/5

### Strengths
- Vite builds successfully (422 KB JS, 34 KB CSS)
- Environment variables via `.env` / `dotenv`
- Separate dev scripts for frontend (`dev`) and server (`dev:server`)

### Issues
- **No CI/CD pipeline** — no GitHub Actions, no build/test on push
- **8 outdated packages**, all with major version bumps:
  - `express` 4.22.2 → 5.2.1
  - `typescript` 5.8.3 → 6.0.3
  - `vite` 6.4.3 → 8.0.16
  - `lucide-react` 0.546.0 → 1.21.0
  - `@vitejs/plugin-react` 5.2.0 → 6.0.2
  - `@types/express` 4.17.25 → 5.0.6
  - `@types/node` 22.20.0 → 26.0.0
  - `esbuild` 0.25.12 → 0.28.1
- **`esbuild` is a direct dependency** but should be transitive (via vite/vitest)
- **No Dockerfile** for containerized deployment
- **No `vercel.json` or deployment configuration** — even though Vercel hosting was planned

### Recommendations
1. Add GitHub Actions workflow: `npm ci` → `npm run lint` → `npm test` → `npm run build`.
2. Update all outdated packages sequentially, testing after each group.
3. Add a `vercel.json` for Vercel deployment (or Dockerfile for other platforms).
4. Remove direct `esbuild` dependency (it's pulled by vite/vitest automatically).
5. Add a `.nvmrc` or `engines` field in `package.json` to pin Node version.

---

## 6. Documentation — 2/5

### Strengths
- `Agile_Backlog.md` has 6 well-defined user stories with Gherkin scenarios
- Clean inline code (no TODO/FIXME/HACK comments)
- `.env.example` documents required environment variables

### Issues
- **README.md is AI Studio boilerplate** — does not describe the project, architecture, or how to contribute
- **No API documentation** — 9 REST endpoints with no OpenAPI/Swagger spec
- **No architecture diagram or data flow documentation**
- **No contribution guide or code style guide**
- **No changelog** (`CHANGELOG.md`)

### Recommendations
1. Rewrite README.md with: project description, architecture overview, setup instructions, tech stack, and deployment guide.
2. Generate OpenAPI 3.0 spec for the server API (use `zod-to-openapi` or write manually).
3. Add `CHANGELOG.md` following Keep a Changelog format.
4. Add comments to complex functions (yield calculation, AI agents, vendor margins).

---

## 7. Offline & Resilience — 3/5

### Strengths
- localStorage-first architecture — all data persists offline
- Idempotency UUIDs prevent duplicate records on sync
- Configurable sync latency simulation for testing
- Queue status tracking (PENDING/SYNCED/FAILED)
- UI banners and terminal logs for sync status

### Issues
- **No actual Service Worker** — UI mentions "ServiceWorker" but no real SW registration
- **No IndexedDB** — Backlog mentions IndexedDB but implementation uses only localStorage (limited to ~5-10 MB)
- **No offline detection** — the `isOnline` state is a manual toggle, not based on `navigator.onLine`
- **No error boundaries** — React app will white-screen on uncaught errors
- **No retry logic** — failed syncs stay in FAILED state but are never automatically retried

### Recommendations
1. Register a real Service Worker with Workbox for cache-first static assets.
2. Migrate offline queue from localStorage to IndexedDB (via idb-keyval for simplicity).
3. Auto-detect connectivity with `navigator.onLine` + `window.addEventListener('online'/'offline')`.
4. Add React ErrorBoundary component.
5. Add automatic retry (exponential backoff) for failed sync payloads.

---

## 8. AI Integration — 3/5

### Strengths
- Two hybrid agents: rules-based detection always runs, Gemini enrichment is optional
- Graceful fallback when `GEMINI_API_KEY` is missing
- Zimbabwe-specific context in Gemini prompts (rural processing, informal markets)
- Anomaly agent uses moving average + deviation threshold (statistically sound)
- Hub router factors in weather, temperature, stock caps, and vendor history
- Both agents have unit tests covering normal and edge cases

### Issues
- **Model name hard-coded** (`gemini-2.0-flash` in `anomalyAgent.ts` and `hubRouter.ts`)
- **Gemini prompts are embedded strings** — hard to version or iterate on
- **No prompt caching or response caching**
- **No observability** — no logging of AI requests/responses for debugging
- **No A/B testing framework** for prompt iterations

### Recommendations
1. Make model name configurable via env var (`AI_MODEL`).
2. Extract Gemini prompts to separate files (`prompts/anomaly.txt`, `prompts/hub-router.txt`).
3. Add request/response logging for AI calls (with opt-out toggle).
4. Consider adding a simple in-memory cache for identical Gemini requests.

---

## 9. Performance — 3/5

### Strengths
- Build output is reasonable: 422 KB JS (127 KB gzip), 34 KB CSS (7 KB gzip)
- Tailwind v4 with JIT — no unused CSS
- React 19 with fast refresh in dev mode
- `motion/react` for animated components (tree-shakeable)

### Issues
- **No code splitting** — single bundle with all components
- **No lazy loading** — AI Insights Panel (242 lines) loads eagerly
- **No bundle analysis** — no `vite-plugin-visualizer` or similar
- **No memoization** — components don't use `React.memo` or `useMemo` for expensive renders
- **No image optimization** — no lazy loading or responsive images
- **`lucide-react` 0.546.0** is 9 major versions behind (latest 1.21.0) — likely includes perf improvements

### Recommendations
1. Add code splitting with `React.lazy()` + `Suspense` for the AI tab and diagnostics panel.
2. Add `vite-plugin-visualizer` to analyze bundle composition.
3. Add `React.memo` on table rows in SourcingPanel, ProcessingPanel, DistributionPanel.
4. Update `lucide-react` to latest version.
5. Consider `vite-plugin-imagemin` for any static images.

---

## 10. Maintainability — 2/5

### Strengths
- Modular file structure with clear responsibilities
- Pure business logic in `src/lib/` — easy to test and reason about
- No TODO/FIXME/HACK markers anywhere
- Consistent naming conventions across the codebase

### Issues
- **Triplicated role-to-tab mapping** (3 copies)
- **Duplicate Mongoose schemas** (2 copies)
- **8 outdated major-version dependencies** (high migration effort deferred)
- **No ESLint** — no automated code quality enforcement
- **No style guide or PR template**
- **`clean` script is platform-dependent** (Unix `rm -rf`)

### Recommendations
1. Fix the two duplication issues (schemas, tab mapping) — they are the highest-risk tech debt items.
2. Establish a routine dependency update cadence (e.g., monthly `npm update` + quarterly major updates).
3. Add ESLint + Prettier with a shared config.
4. Add a PR template to `.github/PULL_REQUEST_TEMPLATE.md`.
5. Use `rimraf` for cross-platform clean script: `"clean": "rimraf dist"`.

---

## Critical Path — Quick Wins (1-2 days)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| P0 | Consolidate role-to-tab mapping into `src/lib/permissions.ts` | 30 min | Eliminates triplication |
| P0 | Add `"strict": true` to tsconfig and fix errors | 2 hrs | Catches bugs at compile time |
| P1 | Implement `filterHarvestsByRegion` | 15 min | Enables actual region scoping |
| P1 | Rewrite README.md | 1 hr | Essential for onboarding |
| P1 | Add GitHub Actions CI | 1 hr | Automates quality checks |
| P1 | Fix `clean` script for Windows | 5 min | Enables cross-platform dev |
| P2 | Update outdated packages (non-breaking groups) | 2 hrs | Reduces tech debt |
| P2 | Add ErrorBoundary | 30 min | Prevents white-screen crashes |
| P2 | Register real Service Worker | 2 hrs | Genuine offline support |

---

## Summary

The Akudha platform has a **solid architectural foundation** with clean module separation, well-tested business logic, and a thoughtful offline-first design. The codebase is free of quick-and-dirty hacks (zero TODO/FIXME markers).

However, it suffers from **typical early-stage issues**: duplicated logic across files, no strict TypeScript mode, no CI/CD, no real authentication, and 8 outdated major dependencies. The offline "ServiceWorker" is simulated rather than real, and the server-side RBAC middleware is not yet wired up.

The critical path items above would raise the maturity score from **2.8 → 3.5 / 5** in under a week of focused effort.
