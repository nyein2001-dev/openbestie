import { type Context, Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { html } from "hono/html";
import type { Child } from "hono/jsx";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  AdminCatalog,
  CharacterEditor,
  editorValues,
  FeedbackForm,
  FeedbackItem,
  Inbox,
  Settings,
} from "./forms";
import {
  characterPath,
  Detail,
  Help,
  Home,
  License,
  Page,
  Privacy,
  Purchases,
  Refunds,
  TextPage,
} from "./pages";
import {
  accessKeys,
  analyticsScript,
  authorize,
  digest,
  formValues,
  sameOrigin,
  securityHeaders,
} from "./security";
import {
  blockers,
  byId,
  bySlug,
  catalog,
  checkout,
  contexts,
  type Env,
  type Errors,
  extension,
  type Feedback,
  feedbackStatuses,
  fields,
  getOffer,
  integer,
  isEmail,
  licenseVersion,
  mediaTypes,
  outcomes,
  previewType,
  slugPattern,
  validateListing,
  validDate,
  validMediaKey,
} from "./store";

type App = { Bindings: Env; Variables: { csrf: string; analytics: boolean } };
type C = Context<App>;
type PageProps = Omit<Parameters<typeof Page>[0], "env" | "children" | "analytics">;
const publicPages = [
  "/",
  "/purchases",
  "/help",
  "/feedback",
  "/license",
  `/license/${licenseVersion}`,
  "/refunds",
  "/privacy",
];
const staticPaths = new Set(["/site.css", "/analytics.js", "/Geist.woff2", "/Geist-OFL.txt"]);
const confirmationCookie = "ob-thanks";
const reporterCookie = "ob-reporter";
const optOutCookie = "ob-analytics-off";
const randomId = /^[a-f0-9-]{36}$/;
const feedbackQuery =
  "SELECT f.*, json_extract(c.details, '$.name') AS character_name FROM feedback AS f LEFT JOIN characters AS c ON c.id = f.character_id";

function render(c: C, options: PageProps, child: Child, status: ContentfulStatusCode = 200) {
  const track =
    (options.path === "/" || options.path?.startsWith("/characters/") || c.req.path === "/feedback/thanks") &&
    !options.owner &&
    !options.preview &&
    !getCookie(c, optOutCookie) &&
    new URL(c.req.url).origin === c.env.PUBLIC_URL;
  const script = track ? analyticsScript(c.env) : undefined;
  if (script) c.set("analytics", true);
  if (options.privatePage || !options.path || script) c.header("Cache-Control", "no-store");
  if (script || options.path === "/" || options.path?.startsWith("/characters/")) c.header("Vary", "Cookie");
  return c.html(
    html`<!doctype html>${(
      <Page env={c.env} {...options} analytics={script}>
        {child}
      </Page>
    )}`,
    status,
  );
}

function errorPage(c: C, status: 400 | 403 | 404 | 413 | 415 | 500) {
  const text = {
    400: ["Request couldn’t be read", "Return to the form and try again."],
    403: ["Access denied", "This page requires authorized access or a new form submission."],
    404: ["Page not found", "The address may have changed or the character may be unavailable."],
    413: ["Form is too large", "Return to the form and shorten the submission."],
    415: ["Unsupported form format", "Return to the form and submit using its original controls."],
    500: ["Something went wrong", "Please try again in a moment."],
  }[status];
  return render(
    c,
    { title: text[0], privatePage: true },
    <TextPage title={text[0]}>
      <p>{text[1]}</p>
      <div class="actions">
        <a href="/">Browse characters</a>
        <a href="/help">Help &amp; support</a>
      </div>
    </TextPage>,
    status,
  );
}

function cookieOptions(c: C, path: string, maxAge: number) {
  return { path, maxAge, secure: c.env.STAGE !== "local", httpOnly: true, sameSite: "Lax" as const };
}

function feedbackContext(value?: string): keyof typeof contexts {
  return value && Object.hasOwn(contexts, value) ? (value as keyof typeof contexts) : "before";
}

async function submitFeedback(c: C) {
  const parsed = await formValues(c.req.raw, 16384);
  if (!parsed.values) return errorPage(c, parsed.status);
  const values = parsed.values;
  const errors: Errors = {};
  const context = feedbackContext(values.context);
  if (values.context !== context) errors.form = "Choose a feedback type and try again.";
  values.context = context;
  const reply = values.reply === "on";
  const research = values.research === "on";
  const notify = context === "notify" && values.notify === "on";
  const contact = reply || research || notify;
  const email = values.email ?? "";
  const message = values.message ?? "";
  if (email && !isEmail(email)) errors.email = "Enter a valid email address.";
  if (contact && !email) errors.email = "Enter your email to use the contact permissions you selected.";
  if (message.length > 1000) errors.message = "Use 1,000 characters or fewer.";
  if (context === "after" && !Object.hasOwn(outcomes, values.outcome ?? ""))
    errors.outcome = "Choose a shot outcome.";
  if (context === "notify" && !notify) errors.notify = "Select permission to receive an availability email.";
  let published: Awaited<ReturnType<typeof catalog>> = [];
  let status: 400 | 429 | 503 = 400;
  try {
    published = await catalog(c.env.DB);
    const selected = published.find((character) => character.slug === values.character);
    if (
      (context === "notify" &&
        (!selected || (selected.sale_mode === "buy" && checkout(c.env, selected.details.checkoutUrl)))) ||
      (values.character && !selected)
    )
      errors.character =
        context === "notify"
          ? "Choose a character that is awaiting availability."
          : "Choose an available character.";
    const ip = c.req.header("CF-Connecting-IP") ?? "local";
    const rate = await c.env.FEEDBACK_LIMIT.limit({ key: ip });
    if (!rate.success) {
      errors.form = "Too many attempts. Wait one minute and try again.";
      c.header("Retry-After", "60");
      status = 429;
    } else if (values.website) {
      errors.form = "We couldn’t accept this submission. Try again or contact support.";
    } else if (!Object.keys(errors).length) {
      const existing = getCookie(c, reporterCookie);
      const reporter = existing && randomId.test(existing) ? existing : crypto.randomUUID();
      const confirmation = crypto.randomUUID();
      const stored = await c.env.DB.prepare(
        "INSERT INTO feedback (character_id, context, outcome, message, email, reply, research, notify, reporter, confirmation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          selected?.id ?? null,
          context,
          context === "after" ? values.outcome : null,
          message || null,
          contact ? email : null,
          Number(reply),
          Number(research),
          Number(notify),
          reporter,
          await digest(confirmation),
        )
        .run();
      if (!stored.success) throw new Error("Feedback insert failed.");
      setCookie(c, reporterCookie, reporter, cookieOptions(c, "/feedback", 14 * 86400));
      setCookie(c, confirmationCookie, confirmation, cookieOptions(c, "/feedback/thanks", 300));
      return c.redirect("/feedback/thanks", 303);
    }
  } catch {
    errors.form = "Your feedback couldn’t be saved. Your answers are still here. Please try again.";
    status = 503;
  }
  return render(
    c,
    { title: "Share feedback", privatePage: true },
    <FeedbackForm env={c.env} catalog={published} values={values} errors={errors} />,
    status,
  );
}

async function media(c: C, keys: typeof accessKeys) {
  const path = new URL(c.req.raw.url).pathname;
  const key = path.slice("/media/".length);
  if (!path.startsWith("/media/") || !validMediaKey(key)) return errorPage(c, 404);
  const live = await c.env.DB.prepare(
    "SELECT m.etag FROM character_media m JOIN characters c ON c.id = m.character_id WHERE m.media_key = ? AND c.status = 'published'",
  )
    .bind(key)
    .all<{ etag: string }>();
  const isLive = live.results.length > 0;
  const preview = !isLive && (await authorize(c.req.raw, c.env, keys));
  if (!isLive && !preview) return errorPage(c, 404);
  const object = await c.env.MEDIA.head(key);
  if (
    !object?.size ||
    (preview
      ? !(await previewType(c.env.MEDIA, key, object))
      : !live.results.some((row) => row.etag === object.etag))
  )
    return errorPage(c, 404);
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Type": mediaTypes[extension(key)],
    ETag: object.httpEtag,
    "Last-Modified": object.uploaded.toUTCString(),
    "Cache-Control": preview ? "private, no-store" : "public, max-age=300, must-revalidate",
  });
  if (preview) headers.set("X-Robots-Tag", "noindex, nofollow");
  const match = c.req.header("If-None-Match");
  if (
    match
      ?.split(",")
      .some((etag) => etag.trim().replace(/^W\//, "") === object.httpEtag || etag.trim() === "*")
  ) {
    return new Response(null, { status: 304, headers });
  }
  const requested = c.req.header("Range");
  const ifRange = c.req.header("If-Range");
  let range: { offset: number; length: number } | undefined;
  if (requested && (!ifRange || ifRange === object.httpEtag || ifRange === object.uploaded.toUTCString())) {
    const bytes = /^bytes=(\d*)-(\d*)$/i.exec(requested);
    const start = bytes?.[1] ?? "";
    const end = bytes?.[2] ?? "";
    const offset = start ? Number(start) : Math.max(0, object.size - Number(end));
    const last = start && end ? Math.min(Number(end), object.size - 1) : object.size - 1;
    if (
      !bytes ||
      (!start && !end) ||
      !Number.isSafeInteger(offset) ||
      offset >= object.size ||
      last < offset
    ) {
      headers.set("Content-Range", `bytes */${object.size}`);
      return new Response(null, { status: 416, headers });
    }
    range = { offset, length: last - offset + 1 };
    headers.set("Content-Range", `bytes ${offset}-${last}/${object.size}`);
  }
  headers.set("Content-Length", String(range?.length ?? object.size));
  if (c.req.method === "HEAD") return new Response(null, { status: range ? 206 : 200, headers });
  const body = await c.env.MEDIA.get(key, { range, onlyIf: { etagMatches: object.etag } });
  if (!body || !("body" in body)) return errorPage(c, 404);
  return new Response(body.body, { status: range ? 206 : 200, headers });
}

export async function cleanup(db: D1Database) {
  await db
    .prepare(`UPDATE feedback SET email = NULL, message = NULL, note = NULL, order_ref = NULL,
    reporter = NULL, confirmation = NULL, scrubbed = 1
    WHERE research = 0 AND scrubbed = 0 AND created_at < datetime('now', '-90 days')`)
    .run();
}

export function createApp(keys = accessKeys) {
  const app = new Hono<App>();
  app.use("*", async (c, next) => {
    await next();
    const admin = /^\/admin(?:\/|$)/i.test(c.req.path);
    const privatePage =
      admin ||
      ["/feedback/thanks", "/analytics-opt-out", "/healthz"].includes(c.req.path) ||
      c.req.method === "POST";
    c.res = securityHeaders(c.res, {
      analytics: c.get("analytics"),
      privatePage,
      noIndex: privatePage || c.res.status >= 400 || c.env.STAGE !== "production",
    });
  });
  app.notFound((c) => errorPage(c, 404));
  app.onError((_error, c) => errorPage(c, 500));
  app.use("*", async (c, next) => {
    if (c.req.method === "POST" && !sameOrigin(c.req.raw)) return errorPage(c, 403);
    await next();
  });
  app.use("/admin/*", async (c, next) => {
    const identity = await authorize(c.req.raw, c.env, keys);
    if (!identity) return errorPage(c, 403);
    c.set("csrf", identity);
    await next();
  });

  app.get("/", async (c) => {
    const [characters, offer] = await Promise.all([catalog(c.env.DB), getOffer(c.env.DB)]);
    return render(
      c,
      {
        title: "Open Bestie",
        path: "/",
        description: "Original nonhuman character reference packs with two-shot proof for AI video creators.",
      },
      <Home env={c.env} catalog={characters} offer={offer} />,
    );
  });
  app.get("/characters/:slug", async (c) => {
    const slug = c.req.param("slug");
    const character = slug.length <= 70 && slugPattern.test(slug) ? await bySlug(c.env.DB, slug) : null;
    if (!character) return errorPage(c, 404);
    const { details } = character;
    return render(
      c,
      {
        title: `${details.name} character pack`,
        path: characterPath(slug),
        description: details.summary,
        social: details.social,
        socialAlt: details.socialAlt,
      },
      <Detail env={c.env} character={character} offer={await getOffer(c.env.DB)} />,
    );
  });
  app.on(["GET", "HEAD"], "/media/*", (c) => media(c, keys));

  app.get("/purchases", (c) =>
    render(c, { title: "Purchases & downloads", path: "/purchases" }, <Purchases />),
  );
  app.get("/help", (c) => render(c, { title: "Help & support", path: "/help" }, <Help env={c.env} />));
  app.get("/license", (c) =>
    render(c, { title: "Character pack license", path: "/license" }, <License index />),
  );
  app.get("/license/:version", (c) =>
    c.req.param("version") === licenseVersion
      ? render(
          c,
          { title: `Character pack license ${licenseVersion}`, path: `/license/${licenseVersion}` },
          <License index={false} />,
        )
      : errorPage(c, 404),
  );
  app.get("/refunds", (c) => render(c, { title: "Refund policy", path: "/refunds" }, <Refunds />));
  app.get("/privacy", (c) => render(c, { title: "Privacy", path: "/privacy" }, <Privacy env={c.env} />));
  app.get("/feedback", async (c) => {
    const published = await catalog(c.env.DB);
    const character = c.req.query("character");
    return render(
      c,
      { title: "Share feedback", path: "/feedback" },
      <FeedbackForm
        env={c.env}
        catalog={published}
        values={{
          context: feedbackContext(c.req.query("context")),
          character: published.some((item) => item.slug === character) ? character : "",
        }}
        errors={{}}
      />,
    );
  });
  app.post("/feedback", submitFeedback);
  app.get("/feedback/thanks", async (c) => {
    const id = getCookie(c, confirmationCookie);
    let submitted = false;
    let confirmed = false;
    if (id && randomId.test(id)) {
      const key = await digest(id);
      const consumed = await c.env.DB.prepare(
        "UPDATE feedback SET confirmation_seen = 1 WHERE confirmation = ? AND confirmation_seen = 0 AND created_at >= datetime('now', '-5 minutes') RETURNING id",
      )
        .bind(key)
        .first();
      submitted = Boolean(consumed);
      confirmed =
        submitted ||
        Boolean(
          await c.env.DB.prepare(
            "SELECT id FROM feedback WHERE confirmation = ? AND created_at >= datetime('now', '-5 minutes')",
          )
            .bind(key)
            .first(),
        );
    }
    return render(
      c,
      { title: "Feedback confirmation", privatePage: true, submitted },
      <TextPage title={confirmed ? "Thanks for your feedback" : "Feedback"}>
        <p>
          {confirmed
            ? "Your feedback helps us understand what video creators need."
            : "Use the feedback form to share what worked or what got in your way."}
        </p>
        <div class="actions">
          <a href={confirmed ? "/" : "/feedback"}>{confirmed ? "Browse characters" : "Share feedback"}</a>
          <a href="/help">Help &amp; support</a>
        </div>
      </TextPage>,
    );
  });

  function optOut(c: C, status?: string) {
    return render(
      c,
      { title: "Analytics preferences", privatePage: true },
      <TextPage title="Analytics preferences">
        <p>
          {getCookie(c, optOutCookie)
            ? "Analytics is disabled for this browser."
            : "You can exclude this browser from storefront analytics."}
        </p>
        {status && <p role="status">{status}</p>}
        <form method="post" action="/analytics-opt-out">
          <div class="actions">
            <button type="submit" name="tracking" value="off">
              Exclude this browser
            </button>
            <button type="submit" name="tracking" value="on">
              Allow analytics
            </button>
          </div>
        </form>
      </TextPage>,
    );
  }

  app.get("/analytics-opt-out", (c) =>
    optOut(c, c.req.query("saved") === "1" ? "Preference saved." : undefined),
  );
  app.post("/analytics-opt-out", async (c) => {
    const parsed = await formValues(c.req.raw, 512);
    if (!parsed.values) return errorPage(c, parsed.status);
    const preference = parsed.values.tracking;
    if (preference === "off") setCookie(c, optOutCookie, "1", cookieOptions(c, "/", 365 * 86400));
    else if (preference === "on") deleteCookie(c, optOutCookie, cookieOptions(c, "/", 0));
    else return errorPage(c, 400);
    return c.redirect("/analytics-opt-out?saved=1", 303);
  });

  app.get("/robots.txt", (c) =>
    c.text(
      c.env.STAGE === "production"
        ? `User-agent: *\nDisallow: /admin\nDisallow: /feedback/thanks\nDisallow: /healthz\nDisallow: /analytics-opt-out\n${c.env.PUBLIC_URL ? `Sitemap: ${new URL("/sitemap.xml", c.env.PUBLIC_URL).href}\n` : ""}`
        : "User-agent: *\nDisallow: /\n",
    ),
  );
  app.get("/sitemap.xml", async (c) => {
    const origin = c.env.PUBLIC_URL;
    const paths =
      c.env.STAGE === "production" && origin
        ? [...publicPages, ...(await catalog(c.env.DB)).map((character) => characterPath(character.slug))]
        : [];
    const urls = paths
      .map(
        (path) =>
          `<url><loc>${new URL(path, origin).href.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</loc></url>`,
      )
      .join("");
    return c.body(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
      200,
      { "Content-Type": "application/xml; charset=utf-8" },
    );
  });
  app.get("/healthz", async (c) => {
    const ready = await c.env.DB.prepare("SELECT id FROM settings WHERE id = 1").first();
    return c.json({ ok: Boolean(ready) }, ready ? 200 : 503);
  });

  app.get("/admin", async (c) =>
    render(c, { title: "Characters", owner: true }, <AdminCatalog catalog={await catalog(c.env.DB, true)} />),
  );
  app.get("/admin/characters/new", (c) =>
    render(
      c,
      { title: "New character", owner: true },
      <CharacterEditor c={null} csrf={c.get("csrf")} values={editorValues(null)} errors={{}} />,
    ),
  );
  app.get("/admin/characters/:id", async (c) => {
    const character = await byId(c.env.DB, c.req.param("id"));
    if (!character) return errorPage(c, 404);
    const notices: Record<string, string> = {
      draft: "Draft saved.",
      saved: "Changes saved.",
      published: "Character published.",
      hidden: "Listing hidden.",
      order: "Display order saved.",
    };
    return render(
      c,
      { title: "Edit character", owner: true },
      <CharacterEditor
        c={character}
        csrf={c.get("csrf")}
        values={editorValues(character)}
        errors={{}}
        notice={notices[c.req.query("saved") ?? ""]}
      />,
    );
  });
  app.get("/admin/characters/:id/preview", async (c) => {
    const character = await byId(c.env.DB, c.req.param("id"));
    if (!character) return errorPage(c, 404);
    return render(
      c,
      { title: "Listing preview", preview: true, privatePage: true },
      <Detail env={c.env} character={character} offer={await getOffer(c.env.DB)} />,
    );
  });

  async function adminForm(c: C) {
    const parsed = await formValues(c.req.raw);
    if (!parsed.values) return errorPage(c, parsed.status);
    if (parsed.values._csrf !== c.get("csrf")) return errorPage(c, 403);
    return parsed.values;
  }

  async function editCharacter(c: C, id?: string) {
    const values = await adminForm(c);
    if (values instanceof Response) return values;
    const character = id ? await byId(c.env.DB, id) : null;
    if (id && !character) return errorPage(c, 404);
    const action = values.action;
    const path = `/admin/characters/${id}`;
    const fail = (errors: Errors, status: 400 | 409 = 400, fields = values) =>
      render(
        c,
        { title: "Edit character", owner: true },
        <CharacterEditor c={character} csrf={c.get("csrf")} values={fields} errors={errors} />,
        status,
      );
    if (values.revision !== String(character?.revision ?? 0))
      return fail(
        { form: "This listing changed. Review the current values and try again." },
        409,
        editorValues(character),
      );
    const order = integer(values.displayOrder ?? "", 0, 99999);
    if (character?.status === "published") {
      if (action !== "hide" && action !== "order")
        return fail({ form: "Hide this listing before changing its details." }, 409);
      if (action === "order" && order === null)
        return fail({ displayOrder: "Enter a whole number from 0 to 99999." });
      const result =
        await c.env.DB.prepare(`UPDATE characters SET status = ?, display_order = ?, revision = revision + 1,
        updated_at = datetime('now') WHERE id = ? AND revision = ? AND status = 'published'`)
          .bind(
            action === "hide" ? "hidden" : "published",
            action === "hide" ? character.display_order : order,
            character.id,
            character.revision,
          )
          .run();
      if (!result.meta.changes)
        return fail({ form: "This listing changed. Reopen it before trying again." }, 409);
      return c.redirect(`${path}?saved=${action === "hide" ? "hidden" : "order"}`, 303);
    }
    if (action !== "save" && (action !== "publish" || !character))
      return fail({ form: "Choose an available listing action." });
    const publish = action === "publish";
    if (publish && character) {
      const saved = editorValues(character);
      if (fields.some(([key]) => (values[key] ?? "") !== (saved[key] ?? ""))) {
        return fail({ form: "Save these changes and open their preview before publishing." }, 409);
      }
    }
    const next = await validateListing(c.env, values, publish, character);
    if (Object.keys(next.errors).length) return fail(next.errors);

    const db = c.env.DB;
    let listingId = character?.id;
    const details = JSON.stringify(next.details);
    try {
      if (!character) {
        const row = await db
          .prepare(`INSERT INTO characters (slug, display_order, price, sale_mode, product_id, details)
          VALUES (?, ?, ?, ?, ?, ?) RETURNING id`)
          .bind(next.slug, next.displayOrder, next.price, next.saleMode, next.productId, details)
          .first<{ id: number }>();
        listingId = row?.id;
      } else {
        const statements = [
          db
            .prepare(`DELETE FROM character_media WHERE character_id = ? AND EXISTS
            (SELECT 1 FROM characters WHERE id = ? AND revision = ? AND status <> 'published')`)
            .bind(character.id, character.id, character.revision),
          ...[...next.publishedMedia].map(([key, etag]) =>
            db
              .prepare(`INSERT INTO character_media (character_id, media_key, etag)
            SELECT id, ?, ? FROM characters WHERE id = ? AND revision = ? AND status <> 'published'`)
              .bind(key, etag, character.id, character.revision),
          ),
          db
            .prepare(`UPDATE characters SET slug = ?, display_order = ?, price = ?, sale_mode = ?, product_id = ?, details = ?,
            status = ?, first_published = CASE WHEN ? THEN COALESCE(first_published, datetime('now')) ELSE first_published END,
            revision = revision + 1, updated_at = datetime('now') WHERE id = ? AND revision = ? AND status <> 'published'`)
            .bind(
              next.slug,
              next.displayOrder,
              next.price,
              next.saleMode,
              next.productId,
              details,
              publish ? "published" : character.status,
              Number(publish),
              character.id,
              character.revision,
            ),
        ];
        const result = await db.batch(statements);
        if (!result.at(-1)?.meta.changes)
          return fail({ form: "This listing changed. Reopen it before trying again." }, 409);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed: characters.slug")) {
        return fail({ slug: "This slug is already in use." }, 409);
      }
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed: characters.product_id")
      ) {
        return fail({ productId: "This product ID is already in use." }, 409);
      }
      throw error;
    }
    return c.redirect(
      `/admin/characters/${listingId}?saved=${publish ? "published" : character ? "saved" : "draft"}`,
      303,
    );
  }

  app.post("/admin/characters/new", (c) => editCharacter(c));
  app.post("/admin/characters/:id", (c) => editCharacter(c, c.req.param("id")));
  app.get("/admin/settings", async (c) =>
    render(
      c,
      { title: "Store settings", owner: true },
      <Settings
        offer={await getOffer(c.env.DB)}
        csrf={c.get("csrf")}
        errors={{}}
        saved={c.req.query("saved") === "1"}
      />,
    ),
  );
  app.post("/admin/settings", async (c) => {
    const values = await adminForm(c);
    if (values instanceof Response) return values;
    const offer = await getOffer(c.env.DB);
    const errors: Errors = {};
    const price = integer(values.offer_price ?? "", 1, 2899);
    const cap = integer(values.offer_cap ?? "", 1, 10);
    if (price === null) errors.offer_price = "Enter an offer price below 2,900 cents.";
    if (cap === null) errors.offer_cap = "Enter between 1 and 10 packs.";
    if (Object.keys(errors).length)
      return render(
        c,
        { title: "Store settings", owner: true },
        <Settings offer={offer} values={values} errors={errors} csrf={c.get("csrf")} />,
        400,
      );
    await c.env.DB.prepare("UPDATE settings SET offer_on = ?, offer_price = ?, offer_cap = ? WHERE id = 1")
      .bind(Number(values.offer_on === "on"), price, cap)
      .run();
    return c.redirect("/admin/settings?saved=1", 303);
  });
  app.get("/admin/feedback", async (c) => {
    const [inbox, summary] = await Promise.all([
      c.env.DB.prepare(`${feedbackQuery} ORDER BY (f.status <> 'new'), f.created_at, f.id`).all<Feedback>(),
      c.env.DB.prepare(`SELECT blocker, count(DISTINCT coalesce('email:' || lower(email), reporter)) AS count
        FROM feedback WHERE blocker IS NOT NULL AND created_at >= datetime('now', '-14 days') GROUP BY blocker`).all<{
        blocker: string;
        count: number;
      }>(),
    ]);
    return render(
      c,
      { title: "Feedback inbox", owner: true },
      <Inbox
        rows={inbox.results}
        counts={Object.fromEntries(summary.results.map((row) => [row.blocker, row.count]))}
      />,
    );
  });
  app.get("/admin/feedback/:id", async (c) => {
    const row = await c.env.DB.prepare(`${feedbackQuery} WHERE f.id = ?`)
      .bind(c.req.param("id"))
      .first<Feedback>();
    return row
      ? render(
          c,
          { title: "Feedback report", owner: true },
          <FeedbackItem row={row} csrf={c.get("csrf")} errors={{}} saved={c.req.query("saved") === "1"} />,
        )
      : errorPage(c, 404);
  });
  app.post("/admin/feedback/:id", async (c) => {
    const values = await adminForm(c);
    if (values instanceof Response) return values;
    const row = await c.env.DB.prepare(`${feedbackQuery} WHERE f.id = ?`)
      .bind(c.req.param("id"))
      .first<Feedback>();
    if (!row) return errorPage(c, 404);
    const errors: Errors = {};
    if (!Object.hasOwn(feedbackStatuses, values.status ?? "")) errors.status = "Choose a feedback status.";
    if (values.blocker && !Object.hasOwn(blockers, values.blocker))
      errors.blocker = "Choose a blocker label.";
    if (values.reply_date && !validDate(values.reply_date))
      errors.reply_date = "Enter a valid date on or before today.";
    for (const [field, max] of [
      ["note", 1000],
      ["resolution", 200],
      ["order_ref", 120],
    ] as const) {
      if ((values[field]?.length ?? 0) > max) errors[field] = `Use ${max} characters or fewer.`;
    }
    if (Object.keys(errors).length)
      return render(
        c,
        { title: "Feedback report", owner: true },
        <FeedbackItem row={row} values={values} errors={errors} csrf={c.get("csrf")} />,
        400,
      );
    await c.env.DB.prepare(`UPDATE feedback SET blocker = ?, status = ?, reply_date = ?, resolution = ?, note = ?,
      order_ref = ?, scrubbed = CASE WHEN ? IS NOT NULL OR ? IS NOT NULL THEN 0 ELSE scrubbed END WHERE id = ?`)
      .bind(
        values.blocker || null,
        values.status,
        values.reply_date || null,
        values.resolution || null,
        values.note || null,
        values.order_ref || null,
        values.note || null,
        values.order_ref || null,
        row.id,
      )
      .run();
    return c.redirect(`/admin/feedback/${row.id}?saved=1`, 303);
  });

  app.get("*", (c) => (staticPaths.has(c.req.path) ? c.env.ASSETS.fetch(c.req.raw) : errorPage(c, 404)));
  return app;
}

export default {
  fetch: createApp().fetch,
  scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanup(env.DB));
  },
} satisfies ExportedHandler<Env>;
