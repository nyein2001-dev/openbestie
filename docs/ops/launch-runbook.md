# Open Bestie launch runbook

## Store and contact

Provide `PUBLIC_URL`, `SELLER_NAME` and `SUPPORT_EMAIL` and confirm that support can answer within one business day. Use an existing Cloudflare zone or the assigned Worker hostname. Confirm individual Gumroad eligibility, Thai payout identity and banking, and the registration and tax checks in [the risk assessment](../10-risk-and-legal-assessment.md). Confirm storefront data transfers, privacy rights and contact handling before opening sales. Record settlement separately from gross sales.

## Gumroad products and native tests

1. Set up the Gumroad seller and configure `GUMROAD_HOST` to the exact checkout host. Create one digital product per cleared pack. Upload the versioned private ZIP. Use USD 29, quantity one, regional pricing off and the store's 14-calendar-day refund policy. Turn off native selling when a pack must be withdrawn.
2. Create one shared USD 10 fixed discount for the selected launch products. Limit it to ten pack units across the products and automatically apply it to each eligible listing. Check the last unit and exhaustion using separate test products and an isolated test code. Count genuine early orders toward the original cap. Check redemption twice daily and turn off store offer copy at exhaustion. Exclude nonstandard-price listings from the shared discount and verify their price separately.
3. Add a required native Terms field linking to `/license/1.0` at the production URL. Include the same dated license in the ZIP. Copy the exact refund paragraph from [document 05](../05-business-model.md#delivery-support-and-refunds) into the receipt instructions. In the hosted content area and quick-start, link to `/feedback?context=after&character={slug}`. Add a separate unchecked invitation for one follow-up about pack use.
4. While signed in as seller, use Gumroad's native test purchase for each real SKU. Confirm the checkout SKU, USD amount, terms and tax/total display. Confirm cancellation and retry, receipt arrival, protected View content, fresh guest email verification where applicable, download and file integrity on desktop and mobile. Check sales search, verified receipt resend, refund controls and export. Never buy a pack with a real payment method to test. For unmatched or mistyped addresses, use native provider verification.
5. When resolving orders, verify the order and refund amount in Gumroad before acting. Use the original transaction and record only the support outcome and needed reference privately. A full refund ends hosted access and licensed use. Review native information for unsupported test scenarios during the first genuine order.

[Gumroad product setup](https://gumroad.com/help/article/101-designing-your-product-page) · [Shared discounts](https://gumroad.com/help/article/128-discount-codes) · [Regional pricing](https://gumroad.com/help/article/327-purchasing-power-parity) · [Native test purchase](https://gumroad.com/help/article/62-testing-a-purchase)

## Owner Access and hosting

Create the project-specific production and preview D1 databases and private R2 buckets. Leave R2 public endpoints disabled. Configure the deployment variables in the [README](../../README.md#configuration). For production set `ADMIN_HOST` on an existing Cloudflare zone, and create a self-hosted Access application for that host with an Allow policy for the exact `OWNER_EMAIL`. Require independent Access MFA or an identity provider MFA requirement. Copy the issuer and application AUD into `ACCESS_ISSUER` and `ACCESS_AUDIENCE`. Verify real MFA sign-in and anonymous denial on the admin and storefront hostnames. Store the project-scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in Actions secrets or use an authenticated local Wrangler session. [Cloudflare Access MFA](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/mfa-requirements/)

## Plausible

Add the production site and set `PLAUSIBLE_SCRIPT_URL` to its hosted site-specific script. Create custom event goals named `proof_play`, `checkout_click` and `feedback_submit`. Check that a new stored feedback sends one event and refresh sends none. Check that a play fires only when the media starts and a real checkout click reaches the named goal. Verify the URLs contain only allowed campaign fields. Exclude the founder's browser at `/analytics-opt-out`. Confirm the configured lawful basis and applicable consent rules. [Plausible goals](https://plausible.io/docs/custom-event-goals)

## Media, publishing and takedown

Keep dated source files, redistribution and tool-use rights, similarity checks, workflow settings, paid plan/date, observed limitations and independent reproduction records. Compare two actual shots. Export compressed WebP or AVIF stills using identical framing dimensions, with the full character in Shot 1 so it can also serve as the card image. Keep each still at or below 150 KB and the pair at or below 250 KB. Prepare a visibly cropped source preview, JPG social image and short silent MP4 or WebM clip. Include a description of drift and any needed VTT captions. Upload versioned keys through the native R2 dashboard. Do not overwrite an approved key. Full-resolution PNGs and the ZIP belong only in the paid pack.

Save the draft, open Preview and compare the exact draft with original proof, final checkout price and delivered manifest. Record verification dates, tick the confirmation and publish. Use Notify if checkout is unavailable and record opt-ins separately from orders. Before changing a price, hide the listing and native sale, save and recheck the new price, then republish. For a credible takedown, immediately stop both storefront and Gumroad sales, preserve records, acknowledge within one business day and follow [document 10](../10-risk-and-legal-assessment.md#similarity-complaints-and-piracy). Restore only after a documented resolution.

## Promotion and launch verification

Run independent workflow checks and observe five creator walkthroughs. Confirm at least one cleared pack, the buyer obligations, native purchase and recovery, a real mobile-data visit, actual Access MFA, privacy and analytics, backup/restore and a production rollback rehearsal. Check the [acceptance record](../ACCEPTANCE.md) for unverified gates before promoting.

Append these tags to the real public character URL from the matching placement. Confirm placement permission and use disclosed review access when applicable.

| Placement | Query |
|---|---|
| Small tutorial creators | `?utm_source=tutorial_creator&utm_medium=partner&utm_campaign=launch` |
| Direct, permissioned conversations | `?utm_source=direct_conversation&utm_medium=permissioned&utm_campaign=launch` |
| Existing creator communities | `?utm_source=creator_community&utm_medium=community&utm_campaign=launch` |
| Owned demonstrations | `?utm_source=owned_demo&utm_medium=organic_video&utm_campaign=launch` |

Reconcile provider figures privately in Bangkok time using [the weekly template](weekly-tally.csv). Follow up personally only with affirmative permission. Open Bestie sends no automated email.
