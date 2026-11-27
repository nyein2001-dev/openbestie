import type { Child } from "hono/jsx";
import {
  type Character,
  checkout,
  type Env,
  extension,
  licenseVersion,
  mailto,
  type Offer,
  offerText,
} from "./store";

const brand = "Open Bestie";
const refund =
  "Request a full refund within 14 calendar days of purchase for any reason. Reply to your receipt or contact Open Bestie with your order email or receipt number. If files are missing, damaged or materially different from the listing, contact us for a working replacement or the remedy you are entitled to. Your statutory rights still apply.";
const licenseEffective = "November 27, 2026";
export const characterPath = (slug: string) => `/characters/${slug}`;
const mediaPath = (key?: string) => `/media/${key}`;

interface PageOptions {
  env: Env;
  title: string;
  description?: string;
  path?: string;
  social?: string;
  socialAlt?: string;
  privatePage?: boolean;
  owner?: boolean;
  preview?: boolean;
  analytics?: string;
  submitted?: boolean;
  children: Child;
}

export function Page({
  env,
  title,
  description,
  path,
  social,
  socialAlt,
  privatePage,
  owner,
  preview,
  analytics,
  submitted,
  children,
}: PageOptions) {
  const canonical = env.PUBLIC_URL && path ? new URL(path, env.PUBLIC_URL).href : undefined;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#101522" />
        <title>{title === brand ? title : `${title} · ${brand}`}</title>
        {description && <meta name="description" content={description} />}
        {(privatePage || env.STAGE !== "production") && <meta name="robots" content="noindex, nofollow" />}
        {canonical && <link rel="canonical" href={canonical} />}
        {canonical && <meta property="og:url" content={canonical} />}
        {canonical && <meta property="og:title" content={title} />}
        {canonical && description && <meta property="og:description" content={description} />}
        {canonical && social && (
          <meta property="og:image" content={new URL(mediaPath(social), canonical).href} />
        )}
        {canonical && socialAlt && <meta property="og:image:alt" content={socialAlt} />}
        {canonical && social && <meta name="twitter:card" content="summary_large_image" />}
        <link rel="stylesheet" href="/site.css" />
        {analytics && (
          <script
            defer
            src="/analytics.js"
            data-script={analytics}
            data-submitted={submitted ? "yes" : "no"}
          />
        )}
      </head>
      <body>
        <a class="skip button" href="#main">
          Skip to content
        </a>
        <header class="site-header">
          <div class="wrap header-inner">
            <a class="wordmark" href={owner ? "/admin" : "/"}>
              Open <span>Bestie</span>
            </a>
            <nav aria-label={owner ? "Owner navigation" : "Primary navigation"}>
              {owner ? (
                <>
                  <a href="/admin">Characters</a>
                  <a href="/admin/feedback">Feedback</a>
                  <a href="/admin/settings">Settings</a>
                </>
              ) : (
                <>
                  <a href="/#characters">Characters</a>
                  <a href="/purchases" aria-label="Purchases & downloads">
                    <span class="long-nav">Purchases &amp; downloads</span>
                    <span class="short-nav">Downloads</span>
                  </a>
                </>
              )}
            </nav>
          </div>
        </header>
        {preview && <div class="preview-banner">Owner preview · This page is private.</div>}
        <main id="main" tabindex={-1} class="wrap">
          {children}
        </main>
        <footer class="site-footer">
          <div class="wrap footer-inner">
            <a class="wordmark" href="/">
              Open <span>Bestie</span>
            </a>
            <nav aria-label="Footer">
              <a href="/purchases">Purchases &amp; downloads</a>
              <a href="/privacy">Privacy</a>
              <a href="/license">License</a>
              <a href="/refunds">Refunds</a>
              <a href="/help">Contact</a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

export function Support({ env }: { env: Env }) {
  return env.SUPPORT_EMAIL ? (
    <a href={mailto(env.SUPPORT_EMAIL)}>{env.SUPPORT_EMAIL}</a>
  ) : (
    <a href="/help">Help &amp; support</a>
  );
}

function Credit({ env }: { env: Env }) {
  return (
    <p>
      {env.SELLER_NAME && <>Original packs by {env.SELLER_NAME}. </>}Gumroad processes payments and delivers
      the files. Tool names identify compatibility only. Open Bestie is unaffiliated with and unendorsed by
      the tool provider.
    </p>
  );
}

function Proof({ character, featured = false }: { character: Character; featured?: boolean }) {
  const d = character.details;
  return (
    <section class={featured ? "proof featured-proof" : "proof"} aria-label="Two-shot proof">
      <div class="shots">
        {([1, 2] as const).map((n) => (
          <figure key={n}>
            {d[`shot${n}`] && (
              <img
                src={mediaPath(d[`shot${n}`])}
                width="640"
                height="360"
                fetchpriority={featured && n === 1 ? "high" : "auto"}
                alt={d[`shot${n}Alt`] ?? ""}
              />
            )}
            <figcaption>
              <strong>Shot {n}</strong> <span>{d[`setting${n}`]}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p class="proof-meta">
        Generated with Kling AI · {d.model} · {d.mode} · {d.plan} · {d.tested}
      </p>
      <p class="proof-drift">
        <strong>Visible drift.</strong> {d.drift}
      </p>
      {d.clip && (
        <details class="play-proof">
          <summary>Play the two-shot clip</summary>
          <video
            aria-label="Two-shot demonstration"
            aria-describedby="clip-description"
            controls
            muted
            playsinline
            preload="none"
            width="640"
            height="360"
            src={mediaPath(d.clip)}
          >
            {d.captions && <track kind="captions" label="English" srclang="en" src={mediaPath(d.captions)} />}
            <a href={mediaPath(d.clip)}>Open the demo video</a>
          </video>
          <p id="clip-description">{d.clipDescription}</p>
          <a href={mediaPath(d.clip)}>Open the video directly</a>
        </details>
      )}
    </section>
  );
}

export function Home({ env, catalog, offer }: { env: Env; catalog: Character[]; offer: Offer }) {
  const feature = catalog[0];
  return (
    <>
      <section class={feature ? "hero" : "hero empty-hero"} aria-labelledby="home-title">
        <div class="hero-copy">
          <h1 id="home-title">Cast a character for your next AI video.</h1>
          {feature ? (
            <>
              <p class="lede">Download the references and prompts used to make these two shots.</p>
              <div class="actions">
                <a class="button primary" href={characterPath(feature.slug)}>
                  View {feature.details.name} pack
                </a>
                <a href="#characters">Browse all characters</a>
              </div>
              <p class="price-line">{offerText(feature.price, offer)}</p>
            </>
          ) : (
            <>
              <p class="lede">
                Original, nonhuman character packs for video creators. The first packs are still being tested.
              </p>
              <div class="actions">
                <a class="button primary" href="/feedback">
                  Share feedback
                </a>
              </div>
            </>
          )}
        </div>
        {feature && <Proof character={feature} featured />}
      </section>
      <section id="characters" class="shelf section">
        <h2>Browse characters</h2>
        {catalog.length ? (
          <div class="cards">
            {catalog.map((c) => (
              <a key={c.id} class="card" href={characterPath(c.slug)}>
                <img
                  src={mediaPath(c.details.shot1)}
                  alt={c.details.shot1Alt ?? ""}
                  width="640"
                  height="360"
                  loading="lazy"
                />
                <div class="card-body">
                  <h3>{c.details.name}</h3>
                  <p>{c.details.role}</p>
                  <p class="small">Tested with Kling AI</p>
                  <p>{offerText(c.price, offer)}</p>
                  <span class="card-link">View pack →</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p>Packs will appear here after their workflows are tested.</p>
        )}
      </section>
      <section class="section split" aria-labelledby="inside-title">
        <div>
          <h2 id="inside-title">Inside a pack</h2>
          <p>
            Each ZIP contains three separate PNG views, two copyable shot prompts, a quick-start guide and a
            license.
          </p>
          <p>
            Unzip the pack, upload the references where the guide specifies, then generate with one of the
            supplied prompts. You supply your own eligible Kling AI account and generation credits.
          </p>
          <p>
            The public proof footage is available to watch on the store. The download contains the reference
            files and instructions.
          </p>
          {feature && (
            <a href={`${characterPath(feature.slug)}#pack-contents`}>See exact files and workflow</a>
          )}
        </div>
        {feature && (
          <figure class="crop">
            <img
              src={mediaPath(feature.details.crop)}
              alt={feature.details.cropAlt ?? ""}
              width="640"
              height="480"
              loading="lazy"
            />
            <figcaption>Cropped preview of a supplied reference</figcaption>
          </figure>
        )}
      </section>
      <section class="section split" aria-labelledby="use-title">
        <div>
          <h2 id="use-title">Use, limits and support</h2>
          <p>
            The nonexclusive license permits commercial use of finished videos and restricts resale or
            redistribution of source files. Generation results can vary. Use an eligible paid Kling AI plan.
          </p>
          <p>
            Request a full refund within 14 calendar days of purchase.{" "}
            <a href="/refunds">Read the refund policy</a> or <a href="/help">contact support</a>.
          </p>
        </div>
        <div class="surface callout">
          <Credit env={env} />
          <div class="actions">
            <a href="/license">Read the license</a>
            <a href="#characters">Browse characters</a>
          </div>
        </div>
      </section>
    </>
  );
}

export function Detail({ env, character: c, offer }: { env: Env; character: Character; offer: Offer }) {
  const d = c.details;
  const buyUrl = c.sale_mode === "buy" ? checkout(env, d.checkoutUrl) : undefined;
  const version = d.licenseVersion || licenseVersion;
  const feedback = `/feedback?context=before&character=${c.slug}`;
  return (
    <>
      <div class="detail-intro">
        <a href="/#characters">← Browse characters</a>
        <h1>{d.name || "Untitled character"}</h1>
        <p class="lede">{d.role}</p>
      </div>
      <div class="detail-grid">
        <div class="detail-proof">
          <Proof character={c} />
          <dl class="proof-notes">
            <dt>What stayed constant</dt>
            <dd>{d.constant}</dd>
            <dt>What changed</dt>
            <dd>{d.changed}</dd>
            <dt>Observed limitation</dt>
            <dd>{d.limitation}</dd>
          </dl>
          {d.crop && (
            <figure class="crop">
              <img src={mediaPath(d.crop)} alt={d.cropAlt ?? ""} width="640" height="480" loading="lazy" />
              <figcaption>Cropped preview of the original reference</figcaption>
            </figure>
          )}
        </div>
        <div>
          <p class="detail-summary">{d.summary}</p>
          <section class="surface purchase" aria-labelledby="purchase-title">
            <h2 id="purchase-title">Character pack</h2>
            <p class="purchase-price">{offerText(c.price, offer)}</p>
            <p>
              Gumroad shows tax and the final total at checkout. No shop account is needed. You supply an
              eligible Kling AI account and generation credits.
            </p>
            {buyUrl ? (
              <a class="button primary" data-checkout href={buyUrl} rel="noreferrer">
                Buy character pack
              </a>
            ) : (
              <a class="button primary" href={`/feedback?context=notify&character=${c.slug}`}>
                Notify me when this pack is available
              </a>
            )}
            <p>
              Commercial use of finished videos and upload to the tested tool are permitted. The license is
              nonexclusive. Redistribution of source files is prohibited. Public footage is excluded from the
              ZIP and license.
            </p>
            <p>{refund}</p>
            <div class="actions">
              <a href={`/license/${version}`}>License {version}</a>
              <a href="/refunds">Refund policy</a>
            </div>
          </section>
        </div>
      </div>
      <section class="section split" id="pack-contents">
        <div>
          <h2>Pack contents</h2>
          <p>
            ZIP {d.zipVersion} · {Number(d.zipSize || 0).toLocaleString("en-US")} bytes
          </p>
          <ul class="manifest">
            {(["front", "side", "threeQuarter"] as const).map((key, index) => (
              <li key={key}>
                <strong>{["Front", "Side", "Three-quarter"][index]}</strong> {d[key]} · PNG ·{" "}
                {d[`${key}Width`]} × {d[`${key}Height`]} px
              </li>
            ))}
            {(["promptsFile", "quickStartFile", "licenseFile"] as const).map((key, index) => (
              <li key={key}>
                <strong>{["Two copyable prompts", "Quick-start", "License"][index]}</strong> {d[key]} ·{" "}
                {extension(d[key] ?? "").toUpperCase()}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Tested workflow</h2>
          <p>
            Kling AI · {d.model} · {d.mode} · {d.plan} · {d.tested}
          </p>
          <dl>
            <dt>Reference inputs</dt>
            <dd>{d.mapping}</dd>
            <dt>Shot 1 prompt purpose</dt>
            <dd>{d.prompt1}</dd>
            <dt>Shot 2 prompt purpose</dt>
            <dd>{d.prompt2}</dd>
          </dl>
          <Credit env={env} />
          <a href={feedback}>What's stopping you using this pack?</a>
        </div>
      </section>
    </>
  );
}

export function TextPage({ title, children }: { title: string; children: Child }) {
  return (
    <article class="text-page">
      <h1>{title}</h1>
      {children}
    </article>
  );
}

export function Purchases() {
  return (
    <TextPage title="Purchases & downloads">
      <p class="lede">Your Gumroad receipt is the simplest way back to your files.</p>
      <ol>
        <li>Find the Gumroad receipt in the inbox you used at checkout.</li>
        <li>
          Select <strong>View content</strong>.
        </li>
        <li>If prompted, verify the email address used to buy the pack.</li>
        <li>Download the ZIP and unzip it on your device.</li>
      </ol>
      <p>
        If you use a Gumroad account, you can also open your{" "}
        <a href="https://gumroad.com/library">Gumroad Library</a>.
      </p>
      <h2>Missing a receipt?</h2>
      <p>
        Check spam and any other inbox you might have used. <a href="/help">Contact support</a> for recovery.
        We verify the purchase and resend the receipt to the original address. For a mistyped address, Gumroad
        verifies any change.
      </p>
    </TextPage>
  );
}

export function Help({ env }: { env: Env }) {
  return (
    <TextPage title="Help & support">
      <p class="lede">We reply within one business day.</p>
      {env.SUPPORT_EMAIL ? (
        <p>
          Email <Support env={env} />.
        </p>
      ) : (
        <p>
          <a href="/feedback?context=support">Send a support request</a> and select permission for a reply.
        </p>
      )}
      <h2>Purchases and refunds</h2>
      <p>
        Start with <a href="/purchases">purchases and downloads</a> to recover your files. For a{" "}
        <a href="/refunds">refund</a>, reply to your Gumroad receipt or contact support with your order email
        or receipt number.
      </p>
      <h2>Rights and takedown</h2>
      <p>
        Send the listing URL, the work or right you claim, your contact details and supporting material. We
        acknowledge reports within one business day.
      </p>
      <h2>Pack feedback</h2>
      <p>
        <a href="/feedback?context=before">What's stopping you using this pack?</a>
      </p>
    </TextPage>
  );
}

export function License({ index }: { index: boolean }) {
  return (
    <TextPage title={index ? "Character pack license" : "Character pack license 1.0"}>
      <p>
        Version {licenseVersion} · Effective {licenseEffective}
        {index && (
          <>
            {" "}
            · <a href="/license/1.0">Permanent version link</a>
          </>
        )}
      </p>
      <h2>Who can use the pack</h2>
      <p>
        One named purchaser may use the purchased version worldwide on a nonexclusive basis, indefinitely
        while complying with these terms and applicable law. There is no recurring license fee. Other
        purchasers can license the same character.
      </p>
      <h2>What you can make</h2>
      <p>
        You may edit the references and prompts, make and monetize finished videos and ads across multiple
        projects, and deliver the rendered works to clients for distribution. Clients receive the finished
        output only. The public sample footage is excluded from this license.
      </p>
      <h2>Uploading to Kling AI</h2>
      <p>
        You may upload the references to the paid Kling AI workflow listed for your pack and grant the
        permissions Kling requires for that workflow. Kling's terms may allow retention, display, improvement
        and training with inputs. Use other tools only when their terms are compatible with this license. You
        supply your own eligible plan and credits. Results vary.
      </p>
      <h2>Source files and identity</h2>
      <p>
        Keep the ZIP, reference PNGs, prompts and equivalent source material private except for permitted
        processing. You may not distribute, resell, sublicense, post the files publicly, upload them to asset
        libraries, share team access, claim exclusive ownership or register the character as a trademark. Do
        not use the assets for impersonation, false affiliation or unlawful activity. Tool names identify
        compatibility only.
      </p>
      <h2>Refunds and rights</h2>
      <p>
        A full refund ends licensed use. Your mandatory consumer remedies and applicable liability limits
        still apply. See the <a href="/refunds">refund policy</a> and{" "}
        <a href="/help">support and rights contact</a>.
      </p>
    </TextPage>
  );
}

export function Refunds() {
  return (
    <TextPage title="Refund policy">
      <p class="lede">{refund}</p>
      <p>
        We respond within one business day and process refunds through the original Gumroad order. A full
        refund ends licensed use and access to hosted content. Previously downloaded copies cannot be
        recalled.
      </p>
      <p>
        <a href="/help">Contact support</a>
      </p>
    </TextPage>
  );
}

export function Privacy({ env }: { env: Env }) {
  return (
    <TextPage title="Privacy">
      {env.SELLER_NAME ? (
        <p>
          {env.SELLER_NAME}, the individual behind Open Bestie in Thailand, controls the storefront's data.
          Contact <Support env={env} /> for privacy requests.
        </p>
      ) : (
        <p>
          For privacy requests, contact Open Bestie through <a href="/help">support</a>.
        </p>
      )}
      <h2>What we collect and why</h2>
      <p>
        Feedback can include a character, context, shot outcome, optional message, contact permissions and,
        when you opt in, your email. Support records may include a blocker, reply date, outcome, private note
        and optional order reference. We use requested support and order recovery to fulfill the purchase or
        take steps you request. Reply, availability updates and research interviews use your separate
        consents. To count distinct reports we use the email you opted to share or a random browser identifier
        stored for 14 days. We also use the IP address to limit abusive submissions. These measures support
        our legitimate interests in improving and protecting the service.
      </p>
      <p>
        Gumroad handles checkout, buyer tax, payment details, receipts, delivery and refunds. We use necessary
        order details for fulfillment and requested support and retain required financial records to comply
        with applicable legal obligations. Our storefront does not collect card details.
      </p>
      <p>
        When configured, Plausible measures public merchandising pages and the feedback confirmation on our
        legitimate interest in understanding usage. It measures page paths, campaign and referral information
        and aggregate proof plays, checkout clicks and feedback submissions. It uses no tracking cookies. We
        exclude form contents and buyer identifiers. <a href="/analytics-opt-out">Opt this browser out</a>.
      </p>
      <h2>Providers and international processing</h2>
      <ul>
        <li>
          Cloudflare provides hosting, private storage and security through its global network, which can
          process data in the United States and elsewhere.{" "}
          <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare privacy policy</a>
        </li>
        <li>
          Gumroad acts as reseller for transactions and processes account and order information in the United
          States and through providers in other countries.{" "}
          <a href="https://gumroad.com/privacy">Gumroad privacy policy</a>
        </li>
        <li>
          Plausible Insights OÜ is based in Estonia and processes visitor data within the European Union,
          including Germany, Slovenia and Finland.{" "}
          <a href="https://plausible.io/data-policy">Plausible data policy</a>
        </li>
      </ul>
      <h2>Retention</h2>
      <p>
        A daily cleanup erases the email, message, private note and order reference from feedback older than
        90 days unless you agreed to research contact. We review identifiable research records and keep them
        only while needed for the agreed purpose. Finance and dispute records are kept for applicable
        statutory or evidentiary periods.
      </p>
      <h2>Your choices and rights</h2>
      <p>
        Contact us to withdraw consent, request access, correction or deletion, or exercise other rights such
        as objection, restriction and portability where applicable. Some records must be kept for legal
        reasons. You can complain to Thailand's Personal Data Protection Committee or your applicable data
        protection authority. For provider-controlled data, consult the relevant provider's privacy notice.
      </p>
    </TextPage>
  );
}
