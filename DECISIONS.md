# Decisions

- The catalog begins empty in every normal environment. All synthetic pictures, video and local identity live in test fixtures and evidence. The home page adjusts to a real empty catalog and gives visitors a feedback route.
- The first license is version 1.0, effective November 27, 2026 (Bangkok project date). Its scope comes from the commerce and risk documents. The seller identity and monitored address are configuration values.
- The launch uses a distinct preview Worker with separate resources and version preview URLs disabled. Admin authenticates only on the configured production owner hostname. The browser harness exercises the same JWT verifier with local keys bundled in a separate, loopback-only Worker.
- Initial prices default to USD 29. Conditional opening-offer copy applies at the USD 29 base price. The owner updates Gumroad and store settings together, verifies price, and turns off the offer when exhausted.
- The owner saves a draft revision, previews it, and publishes that same revision. R2 object ETags pin approved preview bytes. Shot 1 serves as the full-subject card image. Each still has a 150 KB ceiling and together they have a 250 KB ceiling to leave room for fonts, CSS and markup.
- Feedback with consent is deduplicated by normalized email. Other reports use a random first-party identifier for the 14-day summary. A five-minute, server-validated confirmation cookie keeps submission analytics at most once.
- Plain URL-encoded forms cover all commerce and owner workflows. The video uses a native disclosure and player. JavaScript is limited to optional analytics.
- Registry checks confirmed Cloudflare's renamed `@cloudflare/vitest-plugin`. Geist is vendored from the official Geist distribution with its OFL license to avoid pulling unused framework dependencies.
- A public GitHub account identity does not establish a store's legal seller name, monitored support mailbox or intended MFA login. Those settings remain explicit.
