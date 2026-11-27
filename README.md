# Open Bestie

Open Bestie sells original, nonhuman character reference packs for AI video creators. The Cloudflare Worker renders the storefront and owner panel. D1 stores catalog and feedback records. The Worker serves approved preview media from private R2. Gumroad handles payment, delivery, receipts and refunds.

## Local setup

Use Node.js 24 and npm. Run `npm ci`, `npm run migrate:local` and `npm run dev`. Open the URL printed by Wrangler. The database starts empty. The normal local Worker denies owner access. To exercise authenticated owner flows with a local test identity, run `npx playwright install chromium` and `npm run test:e2e`. Set `OPENBESTIE_EVIDENCE=1` to regenerate browser screenshots and lab readings from fictional fixtures under `docs/evidence`.

- `npm run check` runs the strict type check, Biome checks, Worker tests and Wrangler build/deploy dry run.
- `npm run format` applies Biome formatting and safe fixes.
- `npm run build` writes the deploy bundle to `dist/` and checks that local fixture markers are absent.
- `npm run smoke -- http://127.0.0.1:8787 local` checks the local Worker without submitting anything.

## Configuration

Copy `.env.example` to `.env` or provide the same variables through the environment. Keep credentials in the process environment or an ignored local file. For the storefront, create separate D1 databases and private R2 buckets for preview and production. Provide the actual D1 IDs and R2 names. Default local bindings never reach remote data.

| Variable                                                        | Purpose                                                                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`, `PREVIEW_URL`                                     | HTTPS origins on existing Cloudflare zones or the respective `openbestie` and `openbestie-preview` Workers subdomains.                    |
| `SELLER_NAME`, `SUPPORT_EMAIL`                                  | Real public seller identity and monitored contact.                                                                                        |
| `D1_DATABASE_ID`, `R2_BUCKET`                                   | Production D1 UUID and R2 name.                                                                                                           |
| `PREVIEW_D1_DATABASE_ID`, `PREVIEW_R2_BUCKET`                   | Distinct preview resources, with an empty catalog.                                                                                        |
| `GUMROAD_HOST`                                                  | Exact approved checkout hostname, such as the seller's Gumroad subdomain.                                                                 |
| `ADMIN_HOST`, `ACCESS_ISSUER`, `ACCESS_AUDIENCE`, `OWNER_EMAIL` | Dedicated production owner hostname, Cloudflare Access team issuer, application AUD and exact owner address. Create the MFA policy first. |
| `PLAUSIBLE_SCRIPT_URL`                                          | The site-specific HTTPS `https://plausible.io/js/pa-….js` script URL.                                                                     |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`                 | Deployment account credentials. An authenticated local Wrangler login also works.                                                         |

Set GitHub Actions variables for production configuration. Put the Cloudflare credentials and owner email in Actions secrets. The app has no shared login secret. If a Worker secret is added, use `wrangler secret put` against the generated environment configuration. Development and preview disable analytics and owner access. Production keeps version preview URLs disabled. Access fails closed when required settings are incomplete.

## Deployment and recovery

1. Provision D1 and R2 with Wrangler or the dashboard. Use the owner-facing [launch runbook](docs/ops/launch-runbook.md) for provider setup.
2. Run `npm run deploy:preview`. It validates configuration, applies preview migrations, deploys and runs a read-only smoke test.
3. Run `npm run deploy:production`. It runs production preflight, applies migrations, deploys and smoke-tests. Production starts with an empty catalog. GitHub Actions runs the same command on main when both Cloudflare credentials exist.
4. Run `npm run smoke -- <public-origin> production` or `npm run smoke -- <preview-origin> preview` to recheck a deployment. Use `npm run migrate:preview` or `npm run migrate:production` for a migration-only operation.

Before a release, record the deployed Worker version and export D1 with `npm run db:export -- production`. The default backup path is inside ignored `backups/`. Keep exports private. Use `npm run rollback -- production <worker-version-uuid>` to restore the selected Worker version and run smoke checks. Worker rollback preserves data and does not reverse D1 schema changes. Keep future migrations compatible with the rollback version. For a first release, a Worker rollback requires a second known-good deployment.

Rehearse data recovery locally with `npm run db:export -- local backups/rehearsal.sql` and `npm run db:restore -- local backups/rehearsal.sql`. Local restore creates an isolated SQLite store and checks integrity. For remote recovery, create a separate empty D1 database, set `RESTORE_DATABASE_ID` and run `npm run db:restore -- production <backup-file>`. Validate the recovered catalog and row counts before switching the production D1 binding through the deployment configuration. Never import an export into a live database.

See the [acceptance record](docs/ACCEPTANCE.md) for verified behavior and account-dependent launch gates.
