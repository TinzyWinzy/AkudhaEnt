# Akudha Frontend Correction and Upgrade Plan

**Prepared:** 26 September 2026  
**Scope:** The public Akudha site and the authenticated operations application at `https://akudha.vercel.app`.

## Implementation status

Frontend Release 1 was completed and deployed to production on 26 September 2026. The release introduced semantic Tailwind theme tokens, system-hosted typography, the responsive `Akudha Operations` shell, role-aware desktop and mobile navigation, durable `/app/...` URLs, an operational work queue, unified synchronization language, an administrator-only Operations workspace, reduced-motion handling and accessible page zoom. The verified production deployment is `dpl_BAukfiH9pTAHFWYkh2QBZQu5LFdu`.

Frontend Release 2 was completed and deployed to production on 26 September 2026 (`dpl_A4vHHqyJxQWXAJRjPtfGsy82Ki66`). Inventory now uses a filtered catalogue and dedicated mobile product drill-in, stock changes return a review receipt, and device inventory backup/restore lives in Operations. The label maker now follows a five-step setup, keeps a sticky proof on desktop, offers a full-screen proof, requires a scanned sample before multi-copy runs, shows explicit production readiness, and displays audited print history. Existing barcode rendering, export resolution and physical print CSS remain unchanged.

Frontend Release 3 was completed and deployed to production on 26 September 2026 (`dpl_34HXjviN61Y6YZC2ih1i7otkPxmV`). Sourcing, processing and distribution now use production task language, 44 px controls and compact mobile record cards. A shared source-to-dispatch sequence exposes the latest independent stage identifiers and an owner-based action queue for yield and synchronization exceptions. The interface explicitly states that stage identifiers remain independent until the backend stores source links, avoiding unsupported traceability claims.

Frontend Release 4 and the range-positioning correction were deployed to production, most recently on 8 October 2026 (`dpl_57bYShTRsm7rPoUpFVkdikxj1mi5`). The public site presents Akudha as an African botanical oils and butters company, with Baobab Oil, Kalahari Melon Oil, Mongongo Oil and Mafura Butter shown as a complete range. Baobab remains a featured product supported by three project-owned campaign images generated from the supplied real-product reference. Staff access is a secondary navigation action and now uses Staff ID plus six-digit PIN. The confirmed 14 cm circumference and 5.5 cm height apply only to the Baobab 100 ml label; other product dimensions remain editable until their containers are measured. Product-range artwork is delivered through optimized WebP derivatives while the full-resolution PNG files remain available for label printing.

Frontend Release 5 is next: automated browser journeys, accessibility checks, print calibration and pilot rollout.

## Product direction

**Visual thesis:** A calm Zimbabwean botanical operations workspace: warm ivory, deep forest, restrained copper, clear editorial typography and product imagery used as proof.

The upgrade should make daily work faster and safer before adding decoration. Product, batch, stock, label and synchronization states should lead every screen. Technical implementation details should move into an administrator-only operations area.

## Audit findings

The live inventory and label-maker flows work, but the frontend still reads like an internal prototype in several places:

1. The primary navigation exposes eight equal tabs. `Agile Backlog`, `DB Schemas` and `AI Agents` compete with daily tasks such as Inventory and Processing.
2. The header says `Akudha PWA`, includes a version badge and describes the product as an “Intelligence Engine”. These are implementation details rather than operational context.
3. The account strip, connectivity status and sync controls are split across separate regions. Users must interpret browser connectivity, API status and queue state themselves.
4. Inventory tells users about IndexedDB and asks them to export backups. Production users need plain states such as `Saved`, `Waiting to sync` and `Needs attention`; backup administration belongs in Operations.
5. The narrow layout stacks the full product catalogue before the selected product’s actions. Receiving stock or opening the label maker can require a long scroll.
6. The label maker is capable but presents design, barcode, batch, dates, dimensions, copies, preview and export as one continuous workbench. It needs a guided preflight sequence and clearer completion state.
7. Essential copy is frequently small. The component source contains 174 uses of `text-xs` or 9–13 px text, including navigation, form help, table content and status messages.
8. Motion is widespread and has no shared reduced-motion policy. Pulsing and pinging status elements can distract from actual exceptions.
9. Color tokens are named inconsistently: some `ochre` values are green while another is orange. This makes future styling error-prone.
10. The public site repeats centered headings, icon cards and identical reveal animations. It needs verified Akudha products, locations and process evidence to establish trust.
11. Google fonts are loaded remotely. The production PWA should self-host its chosen typefaces so typography remains stable offline.
12. Public marketing and authenticated operations share one state-driven view without durable URLs. Browser back/forward, bookmarks and direct links do not map cleanly to tasks.

## Proposed information architecture

### Public site

- `/` — Akudha Enterprises: products, sourcing model, verified impact and contact.
- `/products` — product range and product detail.
- `/about` — story, sourcing regions and leadership once verified content is available.
- `/sign-in` — focused access page for staff.

### Operations application

- `/app` — role-specific work queue and exceptions.
- `/app/inventory` — product catalogue, lots and movements.
- `/app/labels` — label jobs, approved templates and print history.
- `/app/sourcing` — harvest intake and sourcing history.
- `/app/processing` — batch conversion and yield exceptions.
- `/app/distribution` — dispatches, returns and sales.
- `/app/reports` — operational summaries and exports.
- `/app/operations` — synchronization, audit, users, schema diagnostics and AI tools for authorized administrators.

Desktop navigation should use a compact left rail with the current location and primary action visible. Mobile should use no more than five bottom destinations, with less frequent tools in a `More` sheet. Permissions continue to determine which destinations appear.

## Design foundation

Create semantic tokens before restyling screens:

| Role | Direction |
|---|---|
| Canvas | Warm ivory, with quiet tonal section changes |
| Primary ink | Deep forest-charcoal |
| Brand accent | Copper/ochre for emphasis and active navigation |
| Success | Botanical green reserved for confirmed state |
| Warning | Amber reserved for expiry, low stock and delayed sync |
| Danger | Earth red reserved for destructive actions and errors |
| Surfaces | Mostly opaque; frost only for the shell, overlays and one selected state |
| Type | Characterful display face for page titles and product names; legible sans-serif for controls and data |
| Body size | 16 px default; 14 px minimum for secondary operational text |
| Targets | At least 44 × 44 px for touch controls |
| Radius | One small control radius and one medium surface radius |
| Motion | 180–240 ms controls, limited page transitions, full reduced-motion support |

Self-host the selected fonts and map tokens to names such as `surface`, `ink`, `brand`, `success`, `warning` and `danger`. Remove palette names that assign different hues to one scale.

## Release plan

### Frontend Release 1 — shell and clarity · Complete

1. Add URL-based routing for public and authenticated areas.
2. Replace the current header, user strip and tab row with one responsive application shell.
3. Rename the product-facing application to `Akudha Operations`.
4. Add a role-aware `/app` start screen with today’s tasks: low stock, expiring lots, failed sync, pending print jobs and recent activity.
5. Move Backlog, schema inspection, diagnostics and AI tools under administrator-only Operations.
6. Replace technical sync copy with one state model:
   - `Saved` — local and server agree.
   - `Waiting to sync` — safe on this device.
   - `Syncing` — server transfer in progress.
   - `Needs attention` — action and retry available.
7. Introduce semantic design tokens, self-hosted fonts, visible focus styles and reduced-motion behavior.

**Gate:** A signed-in user reaches their next daily action in one interaction; the shell has no horizontal overflow at 360 px; browser back/forward and direct URLs work.

### Frontend Release 2 — inventory and label-maker upgrade · Complete

1. Make inventory a task-first workspace:
   - desktop: catalogue rail, selected product and contextual action panel;
   - mobile: product list → product detail, with a persistent back action;
   - filters for low stock, expiring, out of stock and unsynchronized;
   - plain-language badges with consistent color meaning.
2. Move device backup and restore into Operations. Keep `Sync now` close to the shared status control only when action is needed.
3. Convert stock actions into short, focused flows with a review receipt:
   - receive: product → lot and expiry → quantity → confirm;
   - sale: scan/search → quantity → allocation preview → confirm;
   - write-off: lot → quantity → reason → confirm.
4. Recompose the label maker as a five-step job:
   - Product and approved template
   - Barcode source and lot
   - Dates and physical dimensions
   - Copies and preview
   - Preflight, audit and export
5. Keep the label preview sticky on desktop. On mobile, place a compact preview after required setup, then open a full-screen proof for inspection.
6. Make production readiness explicit: approved template, valid barcode, complete dimensions, sample scan status and audit result.
7. Add a print-history view with operator, product, lot, template, timestamp, copies and reprint reason.

**Gate:** A trained user can receive stock and generate an audited label on mobile without horizontal scrolling or interpreting technical storage terms. The exported artwork and physical print dimensions remain unchanged.

### Frontend Release 3 — sourcing, processing and distribution · Complete

1. Apply the new shell and form patterns to all operational panels.
2. Replace wide mobile tables with summary rows that open detailed records.
3. Link harvest, processing batch, finished product lot and dispatch with a visible traceability timeline.
4. Turn yield anomalies, failed sync, low stock and expiry into actionable work items with owner and status.
5. Move diagnostics and raw payload views out of daily workflows.

**Gate:** Each role can complete its primary task on a 390 px phone, and an administrator can follow one item from sourcing through dispatch.

### Frontend Release 4 — public Akudha site · Complete

1. Separate the public site from the application shell while keeping one brand system.
2. Lead with Akudha’s real products and value chain. Use the existing label artwork as product imagery until original product photography is supplied.
3. Replace repeated icon-card sections with an editorial sequence: product, origin, process, verified impact and contact.
4. Show only verified impact figures, leadership details and claims. Mark missing evidence as content work rather than inventing substitutes.
5. Provide a clear `Staff sign in` path without making internal software the public hero.

**Gate:** The public site establishes what Akudha makes, where it operates and how to contact it within the first viewport and passes the same responsive and accessibility checks as the application.

### Frontend Release 5 — quality and rollout

1. Add automated browser tests for sign-in, receive stock, sale, write-off, offline retry, label export and permission boundaries.
2. Add screenshot checks at 390, 768, 1024 and 1440 px.
3. Test keyboard-only operation, focus order, modal focus trapping, screen-reader names, zoom at 200% and reduced motion.
4. Set performance budgets: LCP under 2.5 seconds, CLS under 0.1 and INP under 200 ms at the 75th percentile once real-user monitoring is available.
5. Run printer calibration and physical barcode scans after every change to label rendering.
6. Pilot the revised workflows with each operational role and capture task time, errors and support requests.

**Gate:** Critical browser journeys pass in CI, WCAG 2.2 AA issues are closed for those journeys, the label output is scanner-tested and pilot users complete a full operating day without developer intervention.

## Implementation map

| Area | Current files | Planned structure |
|---|---|---|
| App composition | `src/App.tsx` | Router, public layout, authenticated layout and route-level error states |
| Shell | `Header.tsx`, `TabNav.tsx`, `PendingBanner.tsx` | `AppShell`, `PrimaryNav`, `AccountMenu`, `SyncStatus` and `MobileNav` |
| Design system | `src/index.css`, Tailwind theme | Semantic tokens plus shared button, field, badge, surface and empty-state primitives |
| Inventory | `InventoryPanel.tsx`, `inventory.css` | Catalogue, product detail, movement flows, responsive record list and receipts |
| Labels | `BarcodeGenerator.tsx`, `ArtworkLabel.tsx`, `BarcodeLabel.tsx` | Guided label job, preflight, proof view and print history |
| Operations | Diagnostics inside `App.tsx`, `Terminal.tsx`, `SyncRegistry.tsx`, `AiInsightsPanel.tsx` | Protected Operations routes with clear administrative purpose |
| Public site | `LandingPage.tsx` | Public routes built around real products, origin and verified evidence |

## Definition of done for every frontend release

- Loading, empty, offline, pending, success and error states are designed and tested.
- Essential text is at least 14 px and body copy defaults to 16 px.
- Controls are keyboard reachable, visibly focused and at least 44 px on touch layouts.
- No horizontal page scroll occurs from 360 px through desktop widths.
- Color is never the only indicator of status.
- Motion respects `prefers-reduced-motion`.
- Existing role permissions remain server-enforced and visually reflected.
- Production build, TypeScript checks and the automated test suite pass.
- Label changes include print-size and scan verification.

## Recommended first implementation slice

Start with the authenticated shell and inventory route. This removes the strongest prototype signals and establishes the navigation, typography, tokens, status language and responsive patterns that every later screen can reuse. Then apply those primitives to the label-maker flow before changing the public site.
