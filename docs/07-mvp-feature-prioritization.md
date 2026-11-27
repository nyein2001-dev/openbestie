## Decisions made

- **Assumption —** A buyer can select among three characters by looking at the cards and the two-shot demonstrations. Put that choice on the home page.
- **Assumption —** Build the storefront and a small owner panel. Buy checkout, payment, delivery and receipt recovery from Gumroad. Use the owner's existing support email.
- **Estimate —** Reserve 60 engineering hours, 24 founder hours and 14 hours of contingency across Nov 27–Dec 10. Both work streams belong to the same person.
- **Assumption —** A verified payment, usable download and truthful demo take precedence over catalog polish. A launch pack must clear the rights and reproducibility checks in [08](08-product-requirements.md).

### Scope and capacity

**Estimate.** One day is seven focused hours. The estimates below are task-by-task allowances for one full-stack developer already comfortable with TypeScript, HTML, SQL and deployment. Each row includes its local check. The final 16 hours cover cross-system tests and release. Provider reviews and payout timing are external dependencies. “In” requires a direct contribution to discovery, evaluation, payment, fulfillment, shop operation or learning.

| Candidate and decision | Hours | Days | What earns the time |
| --- | ---: | ---: | --- |
| In — production and preview environments, database, owner authentication | 6 | 0.86 | A public store and an owner-only editing path. Deny anonymous writes on every hostname. |
| In — home, three-card catalog, responsive media, featured two-shot proof | 8 | 1.14 | A stranger sees what the character looks like across shots and can choose one. |
| In — shareable character detail, contents, dimensions, workflow, license, refund and support text | 6 | 0.86 | Resolve “what do I get?” and “can I use this?” before payment. |
| In — direct guest checkout, authoritative USD prices, shared ten-pack launch discount | 4 | 0.57 | Use Gumroad's single-item buy route and native offer cap. |
| In — private ZIP, purchase receipt, optional library and recovery instructions | 3 | 0.43 | A guest gets the file immediately and can retrieve it again. |
| In — owner product form, preview, publish/unpublish and price change procedure | 7 | 1.00 | Maintain the three listings without editing code or duplicating an order system. |
| In — native order search, receipt resend, refunds, buyer support and export | 2 | 0.29 | Owner can resolve a failed delivery and reconcile money. |
| In — one feedback form, opt-in to a reply/research, private owner inbox | 4 | 0.57 | One route for purchase blockers, post-use outcomes and interview volunteers. |
| In — public-page analytics, SEO, campaign links and a manual sales tally | 4 | 0.57 | Find the funnel step losing customers and the channel that supplied them. |
| In — integrated testing, fixes, accessibility, deploy, smoke test and rollback rehearsal | 16 | 2.29 | Includes native test purchases, independent usability tasks, actual-device checks, ZIP integrity and recovery. |
| **Engineering** | **60** | **8.57** | Sum in hours before rounding days. |
| **Founder work outside the app** | **24** | **3.43** | Rights review, payment setup, creating and verifying the three packs, buyer conversations, sampling and launch outreach. |
| **Unassigned buffer** | **14** | **2.00** | Fix real breakages or replace failed assets inside the two weeks. |
| **Total** | **98** | **14.00** | Seven hours per calendar day, including weekends. Day 14 is Dec 10. See [12](12-launch-roadmap.md). |

### Build, buy and integrate

| Decision (assumption) | Evidence and rejected alternative |
| --- | --- |
| Deploy one TypeScript Worker with server-rendered HTML, native forms, plain CSS and static site assets. Upload resized public preview stills and clips through the native R2 dashboard. Store merchandising records and the feedback queue in D1. | **Fact.** Workers can serve static assets with Worker code. D1 provides a managed SQL database with SQLite semantics. A full commerce framework adds product, cart and customer subsystems already covered by the provider. A static catalog edited in source would make routine publishing a developer task. [Workers static assets](https://developers.cloudflare.com/workers/static-assets/) · [D1](https://developers.cloudflare.com/d1/) · [R2 preview hosting](https://developers.cloudflare.com/r2/buckets/public-buckets/) (accessed 2026-11-26). |
| Use Cloudflare Access on the owner routes with one MFA-protected identity. Verify the signed token inside the Worker. | **Fact.** Cloudflare documents origin-side signature validation. A custom password/reset service creates recovery and security work for a single account. [Cloudflare Access validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) (accessed 2026-11-26). |
| Use Gumroad's seller dashboard for the downloadable file, base price, one automatic USD 10 discount on the three products, order records and refunds. | **Fact.** A single discount can cover several products, apply automatically and stop after ten units across products. Guest buyers can access downloads from receipts. A processor-only integration would leave the founder responsible for building delivery and handling indirect tax obligations. Merchant eligibility, fees and payout timing are in [05](05-business-model.md). [Discount controls](https://gumroad.com/help/article/128-discount-codes) · [Guest purchase and delivery](https://gumroad.com/help/article/282-how-do-purchases-work-for-my-customers) (accessed 2026-11-26). |
| Use Plausible Starter on public pages. Read paid orders and refunds from Gumroad. Tally results in one private weekly sheet. | **Fact.** Starter includes goals and custom events. Native sales exports include purchases and their fees. Cross-domain customer tracking, custom event properties and an analytics database would add cost without resolving small-sample uncertainty. [Plausible plans](https://plausible.io/#pricing) · [Gumroad sales export](https://gumroad.com/help/article/74-the-analytics-dashboard) (accessed 2026-11-26). |

### Not in MVP

**Estimates.** Days below are rough incremental solo build or configuration effort for the whole row, rounded to half-days. Grouped candidates share the rationale and are all **Out**. Recurring time is called out where it drives the decision. These rows allocate zero calendar capacity.

| Candidate | Decision | Days | Reason |
| --- | --- | ---: | --- |
| Keyword/vector search, filters, sort, recommendations, pagination | Out | 2–4 | All three listings fit on one screenful or a short mobile scroll. |
| Six categories, themed collections, alternative “adopt/squad” navigation | Out | 0.5–1 | Three products can be compared directly using familiar purchase language. |
| Cart, bundles, subscriptions, upsells, pay-what-you-want, multi-seat or exclusive pricing | Out | 2–5 | One SKU and one commercial license solve the single-character purchase. |
| Custom payment fields, customer passwords, custom library, download tokens and fulfillment webhooks | Out | 4–8 | Native checkout, receipts and optional library cover the purchase lifecycle. |
| Reviews, likes, wishlists, saved searches, buyer profiles, wishlisting reminders | Out | 2–4 | Unused affordances or empty ratings weaken the only evidence available today, the product itself. |
| 3D viewer, WebGL, looping video wallpaper, parallax, sound, AR try-on | Out | 2–5 | The delivered product is a 2D reference pack. A real clip and stills show its behavior. |
| Model weights, LoRAs, rigs, expression libraries, extra tool badges and custom prompt builders | Out | 3–7 | Additional files and workflows each need evidence, usage rights and testing. |
| Character creation or customization service, generation API, upload-your-own generator | Out | 5–10+ | The founder makes all assets outside the store. |
| Seller applications, seller dashboards, commission splits, seller messaging | Out | 6–12+ | One owner supplies the catalog. |
| Public feature voting, Discord server, ongoing build-in-public feed, general roadmap | Out | 0.5–2 plus moderation | Direct interviews and publishing actual character demonstrations give the founder buyer-specific evidence with less upkeep. |
| Session recordings, heatmaps, intercept pop-ups, PMF score survey, A/B platform | Out | 1–3 | A few observed sessions and one optional question are actionable at launch traffic. |
| Custom chat, ticketing suite, CRM, automated email campaigns, notification center | Out | 1–3 | A tagged queue, a support address and permission to follow up cover the founder's workload. |
| Custom charts, sales data sync, teams, bulk catalog operations, inventory or shipping | Out | 2–5 | A native order export, three merchandising records and a weekly tally answer operational questions. |
| DRM, invisible tracking, multilingual storefront and custom local currency pricing | Out | 2–5 | Private delivery and the hosted checkout suffice for the first English-language offer. |

### Rules for changing scope

**Assumption — decision policy.** Fix security, statutory, payment and delivery failures immediately. For a feature request, log the failed task, evidence, buyer or order reference and the smallest test. In a rolling 14-day window require **three distinct paying customers or demonstrably blocked prospective buyers** reporting the same problem, **plus two concrete paid commitments or attributable lost orders**. Count a person once per problem. A vote, like or vague preference supplies neither condition.

**Estimate — economic test.** Project 30-day *incremental contribution* using observed traffic × affected share × recoverable conversion × contribution per order from [06](06-revenue-and-financial-plan.md). Compare with engineering hours × USD 15 plus cash cost. When evidence clears both thresholds and contribution covers cost, test one reversible change with a named metric and review date. When the sample cannot support the arithmetic, perform the task manually and collect actual results. See [12](12-launch-roadmap.md) for the weekly decision log.

**Assumption — cut order if behind.** First reduce the extra hero styling and secondary preview crops. Next collapse repeated FAQs and nonessential admin formatting to plain text/forms. Then launch with only the packs whose proof, ZIP and rights checks passed, with the founder's best ready pack first. Never trade away accurate price, qualified proof for every published SKU, checkout, receipt recovery, licensing or a contact route. If those fail, pause paid traffic and keep recruiting test participants.

## Assumptions & open questions

- **Assumption.** The founder has 98 hours available and can finish/test originals within the 24 founder hours. Recount ready packs at the midpoint and apply the cut order if necessary.
- **Assumption.** Gumroad accepts the seller and product type, passes a native test purchase and shows a viable Thai payout route. Apply the verification gate and contingency in [05](05-business-model.md) if this fails.
- **Assumption.** Visitors can identify their character without search and buyers can reach the first shot using the included notes. The observed sessions in [02](02-problem-validation.md) test both.
