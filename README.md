# Akudha operations and label system

Akudha is an offline-capable inventory, barcode-label, sourcing, processing and distribution application for Akudha Enterprises. The production architecture uses a React PWA, one Express API and a managed MongoDB replica set.

## What Releases 1 and 2 provide

- Individual staff ID/six-digit PIN accounts with short-lived access cookies and rotated refresh sessions.
- Server-enforced roles for field coordinators, processing administrators, distribution managers and super administrators.
- Organization, region and hub scoping on business records.
- Administrator APIs for staff creation, deactivation and PIN reset.
- Strict Zod request validation, secure headers, request IDs, body limits, rate limits and configured CORS.
- Server-owned products, lots and append-only stock movements. Submitted browser balances are never trusted.
- IndexedDB inventory storage with a coalesced outbox, idempotent movement IDs, exponential retry and terminal failure display.
- Full snapshot pull synchronization so another signed-in device converges on server stock.
- An explicit one-time import for catalogue data found in the earlier localStorage version.
- Product, lot, movement, label-template and reconciliation APIs.
- Four built-in, high-resolution barcode-free label masters. The label maker imprints the only barcode and exports SVG, PNG or print/PDF output.

The original sourcing, processing and consignment ledgers now send queued mutations to the protected API instead of simulating a server delay.

## Run locally

Install dependencies and start the frontend:

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. Development builds expose a clearly marked local demo workspace so the inventory and label maker remain usable without a database. The demo role picker is excluded from production builds.

For the full authenticated stack, copy `.env.example` to `.env`, supply a MongoDB replica-set connection and secure values, then set `USE_DATABASE=true`:

```powershell
npm run dev:all
```

The server creates or migrates the first super administrator using `BOOTSTRAP_ADMIN_STAFF_ID` and `BOOTSTRAP_ADMIN_PIN`. `BOOTSTRAP_ADMIN_EMAIL` remains the contact and migration lookup for the earlier administrator. Production rejects startup when its database, session secrets or bootstrap staff settings are missing.

## Inventory and labels

1. Add or edit a product. GTIN is optional and must include a valid check digit.
2. Receive stock into a unique lot with an expiry date.
3. Record sales; stock is allocated by earliest expiry. Write-offs require a reason.
4. Open **Label maker**, choose built-in wrap artwork or upload a product-specific image, and enter finished dimensions.
5. Export the complete label as SVG or high-resolution PNG, or print/save PDF at 100% scale. Production printing requires an approved template and records the operator, product, batch, barcode, physical size, template checksum and copy count before opening the print dialog.

The built-in masters are in `public/labels/`. They intentionally contain an empty barcode area. Saved SKU or GTIN data supplies the barcode at export time. Reprinting the same label requires a reason. Uploaded artwork remains export-only until it is stored and approved as a server template.

## Production environment

Use the fields documented in [`.env.example`](./.env.example). Keep the frontend and API on one HTTPS origin so secure SameSite cookies work consistently. The Vercel route in `api/index.ts` and the local Express process both use the same application and middleware.

MongoDB must support transactions. Use a managed replica set in production. Run the reconciliation endpoint regularly:

```text
GET /api/inventory/reconciliation
```

It compares each materialized lot balance with the sum of its immutable movements and returns any discrepancies.

The Vercel Development and Preview environments are connected to the managed Atlas database `akudha_staging`. Vercel Production uses a separate Atlas resource and the `akudha_production` database. Vercel supplies `MONGODB_URI`; the application selects the database with `MONGODB_DB`. Verify either configured environment without printing the connection string:

```powershell
npx vercel env run -e development -- npm run verify:db
npx vercel env run -e production -- npm run verify:db
```

The live deployment is [akudha.vercel.app](https://akudha.vercel.app). Keep staging data out of production and complete a backup-and-restore drill before importing operational records.

## Encrypted backup and restore drill

Atlas Free does not provide managed snapshots. The repository therefore includes an AES-256-GCM encrypted logical backup and a guarded restore drill. The restore command accepts only isolated `_restore_drill_*__` collection prefixes in the non-production staging database, verifies the encrypted payload checksum and every collection count, removes the drill collections, and verifies their removal.

The first production drill completed on 26 September 2026. It restored and verified 10 collections (4 products, 16 label templates and 1 user), then confirmed that every drill collection was removed from staging.

The encryption key is stored locally in the ignored `.env.backup.credentials` file. Keep an offline copy of this key; encrypted backups cannot be recovered without it. Backup archives are written to the ignored `.backups/` directory.

```powershell
npm run backup:db
npm run restore:db
```

Supply `MONGODB_URI`, `MONGODB_DB` and `BACKUP_ENCRYPTION_KEY` for backup. Restore also requires `BACKUP_FILE`, `RESTORE_TARGET_PREFIX=_restore_drill_<name>__` and `ALLOW_RESTORE_DRILL=true`. The restore script refuses to run when `MONGODB_DB=akudha_production`.

Optional GTIN values are stored as missing fields rather than `null`. The production index is partial and enforces uniqueness only when a GTIN string exists. Apply the idempotent index migration after restoring an older database backup:

```powershell
npx vercel env run -e production -- npm run migrate:gtin-index
```

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Frontend development server |
| `npm run dev:server` | Express development server |
| `npm run dev:all` | Frontend and API together |
| `npm run lint` | TypeScript type check |
| `npm test` | Unit and integration suite |
| `npm run build` | Production frontend bundle |
| `npm run verify:db` | Verify MongoDB connectivity and transaction support |
| `npm run migrate:gtin-index` | Repair the optional-GTIN unique index after an older restore |
| `npm run seed:label-templates` | Create approved built-in wrap and clean-label templates |
| `npm run backup:db` | Create an encrypted logical database backup |
| `npm run restore:db` | Restore and verify an encrypted backup in isolated staging collections |
| `npm audit` | Dependency advisory check |

The staged roadmap and launch gates are in [`PRODUCTION_READINESS_PLAN.md`](./PRODUCTION_READINESS_PLAN.md).
