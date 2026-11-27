# Open Bestie acceptance

The browser evidence uses fictional pack assets and a **local test identity**. The normal local and preview Workers deny owner access. Provider handoffs and analytics observed in Playwright use intercepted requests. The Wrangler dry-run bundle excludes the fixture entry point and signing material, and migrations leave the catalog empty.

Local verification passed 74 Worker tests, 7 Chromium scenarios, 10 smoke checks and D1 export and restore. GitHub Actions also passed on Linux. All 42 screenshot hashes are distinct. In three uncached, throttled mobile fixture loads, median LCP was 1104 ms, maximum CLS was 0.00021 and maximum transfer was 80878 bytes. The median first interaction was 72 ms, with samples from 64 to 1880 ms. Production INP needs field data.

## Document 08

| Criterion | Implementation | Verification | Status |
|---|---|---|---|
| Home 1. Wordmark, character anchor and visible purchases link at 320 px | `src/pages.tsx`, `public/site.css` | Home at all four widths, keyboard path and responsive navigation. [Header](evidence/home/header.png) | PASS |
| Home 2. Featured proposition, native detail link, standard and conditional opening price | `src/pages.tsx`, `src/store.ts` | Offer on and off test. [Hero and stills](evidence/home/hero-and-two-shots.png) | PASS |
| Home 3. Two labeled settings, actual workflow fields, drift, keyboard video and fallback | `src/pages.tsx`, `src/index.tsx` | On-demand video request, playback event, failed video and JavaScript-disabled disclosure. [Playback](evidence/home/inline-playback.png) | PASS |
| Home 4. Every published character once, sorted, descriptive card link and empty state | `src/pages.tsx`, `src/store.ts` | Draft/hidden isolation and [catalog](evidence/home/all-characters.png), [empty catalog](evidence/public/empty-catalog.png) | PASS |
| Home 5. Reduced reference sample, download contents, workflow steps and credit requirement | `src/pages.tsx` | [Inside a pack](evidence/home/inside-a-pack.png) and browser detail link. | PASS |
| Home 6. Usage, risk, refund, creator, Gumroad and support links | `src/pages.tsx` | Browser follows recovery, support and legal links. [Use, limits and support](evidence/home/license-risk-support.png) | PASS |
| Five external creators complete the home comprehension tasks | `src/pages.tsx` | Requires participants and an actual pack. | NOT VERIFIED |
| Shared detail shows name, role, two shots, original crop, tested workflow and limits | `src/pages.tsx` | Publishing gates and [desktop proof](evidence/character/proof-summary-purchase.png) | PASS |
| Buyer can see exact download manifest, dimensions, ZIP version and prompt purposes | `src/pages.tsx`, `src/store.ts` | Field gates and [manifest](evidence/character/pack-manifest-workflow.png) | PASS |
| Storefront displays price, tax explanation, license summary, refund and buyer obligations | `src/pages.tsx` | Buy/Notify and offer tests. [Mobile detail](evidence/character/detail-mobile.png) | PASS |
| Buy opens the chosen native product with wanted=true, works without JavaScript, and records no sale | `src/pages.tsx`, `src/store.ts` | Browser asserts the exact checkout URL with a local interception, plus JavaScript-disabled link. | PASS |
| Guest checkout price and tax, required Terms, optional follow-up, cancel/retry and payment declines | `docs/ops/launch-runbook.md` | Requires eligible Gumroad account, a real product and its native test facility. | NOT VERIFIED |
| Native receipt and protected download, usable ZIP on desktop and mobile | `docs/ops/launch-runbook.md` | Requires real approved pack and Gumroad receipts. | NOT VERIFIED |
| Returning buyer sees receipt → View content → email check → download, optional library and support | `src/pages.tsx` | Browser recovery and help flow. [Recovery](evidence/public/purchase-recovery.png) | PASS |
| Owner verifies the sale, resends to the original address and uses verified email corrections | `docs/ops/launch-runbook.md` | Requires native Gumroad account and receipt. | NOT VERIFIED |
| Optional post-use path preselects the character and records shot outcome/contact permissions | `src/forms.tsx`, `src/index.tsx` | Browser form submission and inbox. [Post-use form](evidence/feedback/post-use-outcome.png) | PASS |
| Before-purchase feedback, errors retain input, confirmation follows storage | `src/forms.tsx`, `src/index.tsx` | Validation, storage failure, keyboard and no-JS. [Validation](evidence/feedback/keyboard-validation.png), [confirmation](evidence/feedback/stored-confirmation.png) | PASS |
| Notify mode uses separately consented email and shows standard price | `src/pages.tsx`, `src/forms.tsx`, `src/index.tsx` | Buy/Notify tests and [notify consent](evidence/feedback/notify-consent.png) | PASS |
| Actual Kling production workflow, attribution, commercial rights and independent reproduction | `src/store.ts`, `docs/ops/launch-runbook.md` | Requires the seller's source files, paid plan, actual generations and independent creator checks. | NOT VERIFIED |
| Owner add/edit drafts, private preview, media gating and visibility | `src/forms.tsx`, `src/index.tsx`, `src/store.ts` | Local test identity. [Draft preview](evidence/owner/draft-preview.png), [editor](evidence/owner/empty-listing-editor.png) | PASS |
| Store offer values and shared native operations are available | `src/forms.tsx`, `src/store.ts` | Local store settings and price tests. [Settings](evidence/owner/offer-settings.png) | PASS |
| Shared native USD 10 discount cap and exhaustion; owner checks twice daily | `docs/ops/launch-runbook.md` | Requires Gumroad account and test products. | NOT VERIFIED |
| Publish requires rights and tests, locks details, permits ordering, hides and republishes | `src/index.tsx`, `src/store.ts` | Individual gates, saved revision, published lock and browser lifecycle. [Published lock](evidence/owner/published-lock.png), [hidden listing](evidence/owner/hidden-listing.png) | PASS |
| Compact owner catalog with mobile labels | `src/forms.tsx`, `public/site.css` | Local test identity and responsive axe check. [Desktop](evidence/owner/catalog-desktop.png), [mobile](evidence/owner/catalog-mobile.png) | PASS |
| Native order lookup, export, resend and refund route, no local sales ledger | `src/forms.tsx`, `migrations/0001_store.sql` | Owner settings and catalog expose native tools. Actual operation requires Gumroad. | PASS |
| Owner inbox new-first, oldest first, labels, consented contact, private outcome and distinct reporters | `src/index.tsx`, `src/forms.tsx` | Local test identity with tagged reports. [Inbox](evidence/owner/feedback-inbox.png), [review](evidence/owner/feedback-review.png), [summary](evidence/owner/blocker-summary.png) | PASS |
| D1 catalog, private proof records, feedback, versioned license and Gumroad boundaries | `migrations/0001_store.sql`, `src/store.ts`, `src/pages.tsx` | Migration, publication/feedback tests and [license](evidence/legal/versioned-license.png) | PASS |
| Signed admin identity on reads and writes, host, issuer, audience, expiry and owner email | `src/security.ts`, `src/index.tsx` | JWT matrix, CSRF and [anonymous denial](evidence/owner/anonymous-disallowed.png). Local test identity. | PASS |
| Real Cloudflare Access owner sign-in and enforced MFA | `docs/ops/launch-runbook.md` | Cloudflare credentials and real Access application/owner identity unavailable. | NOT VERIFIED |
| Bounded inputs, same-origin and CSRF, text escaping, honeypot, rate limit, no binary uploads | `src/security.ts`, `src/index.tsx`, `src/store.ts` | Worker request tests, browser invalid input and no-JS submission. | PASS |
| Public caching, strict headers, media allowlist, byte ranges and private/noindex responses | `src/security.ts`, `src/index.tsx`, `src/store.ts` | Header and media tests, [failed video](evidence/character/failed-video-fallback.png) | PASS |
| Server-rendered layout, reserved media, offscreen deferral, poster, initial transfer and mobile lab timing | `src/pages.tsx`, `public/site.css`, `src/store.ts` | [Three uncached local mobile lab loads](evidence/mobile-lab.json) with test media. No media request before play. | PASS |
| Production p75 LCP/INP/CLS, actual catalog transfer and physical mobile network test | `test/browser.spec.ts`, `docs/ops/launch-runbook.md` | Live deployment, launch media and field sample unavailable. | NOT VERIFIED |
| WCAG browser checks, visible focus, keyboard, labeled controls, errors, 320 px reflow and 200% text resize | `src/forms.tsx`, `src/pages.tsx`, `public/site.css` | Playwright axe A/AA, keyboard path, responsive 320–1440 px. [Keyboard form](evidence/feedback/keyboard-validation.png), [200% text resize](evidence/home/text-resize-200.png) | PASS |
| Screen reader purchase path and hosted checkout accessibility | `docs/ops/launch-runbook.md` | Requires assistive-technology operator and active Gumroad product. | NOT VERIFIED |
| Unique canonical, title, description and social image, sitemap only public, private noindex | `src/index.tsx`, `src/pages.tsx` | Local canonical URL assertion and sitemap/robots tests. | PASS |
| Live shared-link and social card verification | `src/pages.tsx`, `docs/ops/launch-runbook.md` | Requires public domain deployment and actual listing. | NOT VERIFIED |
| Privacy notice, seller/contact configuration, retention and rights request route | `src/pages.tsx`, `src/index.tsx` | [Privacy notice](evidence/legal/privacy-notice.png), feedback scrub tests. Real controller/contact are required for deployment. | PASS |
| Analytics routes, consent preference, clean URLs and once-per-action goals | `public/analytics.js`, `src/security.ts`, `src/index.tsx` | Browser intercepts vendor endpoints, tests play/click/submission events and normal operation with tracking blocked. [Opt-out](evidence/public/analytics-opt-out.png) | PASS |
| Live Plausible event delivery | `docs/ops/launch-runbook.md` | Production Plausible URL and account unavailable. | NOT VERIFIED |

## Document 12 launch gates

| Criterion | Implementation | Verification | Status |
|---|---|---|---|
| At least one original pack cleared for rights, workflow, independent use and ZIP handoff | `src/store.ts`, `docs/ops/launch-runbook.md` | Real assets, rights records and independent creators unavailable. | NOT VERIFIED |
| External visitors identify goods, workflow, limitations and credit responsibility | `src/pages.tsx`, `docs/ops/launch-runbook.md` | Requires five external creator sessions. | NOT VERIFIED |
| Approved Thai seller, payout, monitored support and tax and registration record | `docs/ops/launch-runbook.md` | Seller and monitored support inputs, bank/account verification and local tax decisions unavailable. | NOT VERIFIED |
| Live checkout SKU, price, shared cap, guest cancellation/payment, receipts, correct ZIP, recovery and owner remedies | `src/pages.tsx`, `src/forms.tsx`, `docs/ops/launch-runbook.md` | Requires native Gumroad products and test purchases. | NOT VERIFIED |
| Local mobile/keyboard, draft privacy, anonymous denial and simulated analytics without PII | `test/browser.spec.ts`, `test/worker.test.ts` | Local browser, Worker and axe tests. | PASS |
| Database export and recovery | `scripts/ops.mjs` | Local D1 SQL export and restore into an isolated database. | PASS |
| Remote smoke, version rollback, real owner login and mobile data | `scripts/ops.mjs`, `docs/ops/launch-runbook.md` | Production and preview credentials, domains and physical device unavailable. | NOT VERIFIED |
| Four campaign links and manual weekly reconciliation | `docs/ops/launch-runbook.md`, `docs/ops/weekly-tally.csv` | Tag templates and empty tally reviewed. Live campaign links require published listings. | PASS |
| Paid-validation and post-launch learning gates | `docs/ops/launch-runbook.md`, `docs/ops/weekly-tally.csv` | Requires genuine consenting creators, paid buyers and settlement activity. | NOT VERIFIED |
