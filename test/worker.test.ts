import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { generateKeyPair } from "jose";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup } from "../src/index";
import { digest } from "../src/security";
import { type Env, fields } from "../src/store";
import { fixtureAuth, fixtureEnv, fixtureSlug, fixtureValues, mediaFixtures } from "./fixture";

const bindings = env as unknown as Env & { TEST_MIGRATIONS: D1Migration[] };
const db = bindings.DB;
const appEnv = { ...bindings, ...fixtureEnv };
const admin = "https://owner.fixture.invalid";
const publicSite = fixtureEnv.PUBLIC_URL;
let auth: Awaited<ReturnType<typeof fixtureAuth>>;
let token: string;
let csrf: string;

const responseCookie = (response: Response, name: string) =>
  response.headers
    .getSetCookie()
    .find((item) => item.startsWith(`${name}=`))
    ?.split(";")[0] ?? "";

function fakeBytes(key: string) {
  if (key.endsWith(".jpg")) return Uint8Array.of(255, 216, 255, 224, 12, 9, 8, 7);
  if (key.endsWith(".webm")) return Uint8Array.of(26, 69, 223, 163, 6, 1, 5, 0);
  if (key.endsWith(".vtt")) return new TextEncoder().encode("WEBVTT\n\n");
  return new TextEncoder().encode("RIFFabcdWEBP1234");
}

beforeAll(async () => {
  await applyD1Migrations(db, bindings.TEST_MIGRATIONS);
  auth = await fixtureAuth();
  token = await auth.sign();
  csrf = await digest(token);
  await Promise.all(
    Object.entries(mediaFixtures).map(([key, contentType]) =>
      bindings.MEDIA.put(key, fakeBytes(key), { httpMetadata: { contentType } }),
    ),
  );
});

beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM feedback"),
    db.prepare("DELETE FROM character_media"),
    db.prepare("DELETE FROM characters"),
    db.prepare("UPDATE settings SET offer_on=0, offer_price=1900, offer_cap=10"),
  ]);
});

function get(
  path: string,
  url: string = publicSite,
  headers: Record<string, string> = {},
  configuration: Env = appEnv,
) {
  return auth.app.request(url + path, { headers }, configuration);
}

function post(
  path: string,
  fields: Record<string, string>,
  opts: {
    url?: string;
    origin?: string;
    auth?: string;
    config?: Env;
    headers?: Record<string, string>;
  } = {},
) {
  const url = opts.url ?? admin;
  return auth.app.request(
    url + path,
    {
      method: "POST",
      body: new URLSearchParams(fields),
      headers: {
        Origin: opts.origin ?? url,
        ...(opts.auth ? { "Cf-Access-Jwt-Assertion": opts.auth } : {}),
        ...opts.headers,
      },
    },
    opts.config ?? appEnv,
  );
}

function owner(path: string, data: Record<string, string>) {
  return post(path, { _csrf: csrf, ...data }, { auth: token });
}

async function draft(values = fixtureValues) {
  const created = await owner("/admin/characters/new", { ...values, revision: "0", action: "save" });
  expect(created.status).toBe(303);
  const id = /characters\/(\d+)/.exec(created.headers.get("Location") ?? "")?.[1];
  if (!id) throw new Error("Draft ID missing");
  return `/admin/characters/${id}`;
}

async function publish(path: string, values = fixtureValues, revision = "0") {
  return owner(path, { ...values, revision, action: "publish", confirm: "on" });
}

describe("Access and request validation", () => {
  it.each([
    "no token",
    "bad signature",
    "wrong issuer",
    "wrong audience",
    "expired",
    "wrong email",
    "wrong host",
    "missing config",
    "preview env",
  ])("denies %s on reads and writes", async (failure) => {
    let requestToken = token;
    let host = admin;
    let config: Env = appEnv;
    if (failure === "no token") requestToken = "";
    if (failure === "bad signature")
      requestToken = await auth.sign({}, (await generateKeyPair("RS256")).privateKey);
    if (failure === "wrong issuer")
      requestToken = await auth.sign({ iss: "https://wrong.cloudflareaccess.com" });
    if (failure === "wrong audience") requestToken = await auth.sign({ aud: "wrong" });
    if (failure === "expired") requestToken = await auth.sign({ exp: 1000 });
    if (failure === "wrong email") requestToken = await auth.sign({ email: "other@fixture.invalid" });
    if (failure === "wrong host") host = publicSite;
    if (failure === "missing config") config = { ...appEnv, OWNER_EMAIL: undefined };
    if (failure === "preview env") config = { ...appEnv, STAGE: "preview" };
    const headers = { "Cf-Access-Jwt-Assertion": requestToken };
    const read = await auth.app.request(`${host}/admin`, { headers }, config);
    expect(read.status).toBe(403);
    const write = await post("/admin/settings", { _csrf: csrf }, { url: host, auth: requestToken, config });
    expect(write.status).toBe(403);
    expect(read.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects cross-origin mutations and missing or incorrect CSRF", async () => {
    expect((await post("/feedback", {}, { url: publicSite, origin: admin })).status).toBe(403);
    expect((await post("/admin/settings", { _csrf: csrf }, { origin: publicSite, auth: token })).status).toBe(
      403,
    );
    for (const value of ["", "invalid"]) {
      expect((await owner("/admin/settings", { _csrf: value })).status).toBe(403);
    }
  });

  it("rejects binary forms and oversized bodies", async () => {
    expect(
      (
        await auth.app.request(
          `${publicSite}/feedback`,
          {
            method: "POST",
            body: new Uint8Array([100]),
            headers: {
              Origin: publicSite,
              "Content-Type": "application/octet-stream",
            },
          },
          appEnv,
        )
      ).status,
    ).toBe(415);
    expect((await post("/feedback", { message: "x".repeat(17000) }, { url: publicSite })).status).toBe(413);
  });
});

describe("Publication and merchandising", () => {
  it("keeps drafts and hidden records out of the home, detail, media and sitemap", async () => {
    const path = await draft();
    const detail = `/characters/${fixtureSlug}`;
    for (const state of ["draft", "hidden"]) {
      if (state === "hidden") {
        expect((await publish(path)).status).toBe(303);
        expect((await owner(path, { action: "hide", revision: "1" })).status).toBe(303);
      }
      expect((await get(detail)).status).toBe(404);
      expect((await get("/media/fixture/shot1.webp")).status).toBe(404);
      expect(await (await get("/")).text()).not.toContain(fixtureValues.name);
      expect(await (await get("/sitemap.xml")).text()).not.toContain(fixtureSlug);
    }
    const preview = await get(`${path}/preview`, admin, { "Cf-Access-Jwt-Assertion": token });
    expect(await preview.text()).toContain("Owner preview");
    expect(preview.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it.each(
    fields
      .map(([key]) => key)
      .filter((key) => !["slug", "price", "displayOrder", "saleMode", "captions"].includes(key)),
  )("requires publish field %s", async (key) => {
    const values = { ...fixtureValues, [key]: "" };
    const path = await draft(values);
    const result = await publish(path, values);
    expect(result.status).toBe(400);
    expect(await result.text()).toContain(`id="${key}-error"`);
  });

  it("requires confirmation and publication of the saved revision", async () => {
    const path = await draft();
    expect((await owner(path, { ...fixtureValues, revision: "0", action: "publish" })).status).toBe(400);
    expect((await publish(path, { ...fixtureValues, price: "3000" })).status).toBe(409);
  });

  it.each([
    ["shot1", "fixture/missing.webp"],
    ["shot2", "fixture/oversize.webp"],
    ["crop", "fixture/fake.webp"],
  ])("gates absent, oversized and mismatched media (%s)", async (key, file) => {
    const oversized = new Uint8Array(150001);
    oversized.set(fakeBytes("big.webp"));
    await bindings.MEDIA.put("fixture/oversize.webp", oversized);
    await bindings.MEDIA.put("fixture/fake.webp", "PK\x03\x04");
    const values = { ...fixtureValues, [key]: file };
    const response = await publish(await draft(values), values);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain(`id="${key}-error"`);
  });

  it("checks exact license, native host, unique product ID, and dimensions", async () => {
    const invalid = await owner("/admin/characters/new", {
      ...fixtureValues,
      licenseVersion: "3.0",
      checkoutUrl: "https://bad.fixture.invalid/l/product",
      sideWidth: "0",
      revision: "0",
      action: "save",
    });
    expect(invalid.status).toBe(400);
    const body = await invalid.text();
    for (const field of ["licenseVersion", "checkoutUrl", "sideWidth"])
      expect(body).toContain(`id="${field}-error"`);
    await draft();
    const duplicate = await owner("/admin/characters/new", {
      ...fixtureValues,
      slug: "another",
      revision: "0",
      action: "save",
    });
    expect(await duplicate.text()).toContain('id="productId-error"');
  });

  it("locks published content, permits display order, and makes the slug permanent", async () => {
    const path = await draft();
    expect((await publish(path)).status).toBe(303);
    expect(
      (await owner(path, { ...fixtureValues, action: "save", revision: "1", price: "3900" })).status,
    ).toBe(409);
    expect(
      (await owner(path, { action: "order", revision: "1", displayOrder: "2", price: "3900" })).status,
    ).toBe(303);
    expect(await db.prepare("SELECT price, display_order FROM characters").first()).toEqual({
      price: 2900,
      display_order: 2,
    });
    expect((await owner(path, { action: "hide", revision: "2" })).status).toBe(303);
    const changed = await owner(path, { ...fixtureValues, slug: "different", action: "save", revision: "3" });
    expect(await changed.text()).toContain("The published slug is permanent.");
  });

  it("shows configured offer values only when enabled, and routes Buy and Notify correctly", async () => {
    await publish(await draft());
    const detail = `/characters/${fixtureSlug}`;
    const normal = await (await get(detail)).text();
    expect(normal).toContain("wanted=true");
    expect(normal).toContain("USD 29");
    expect(normal).not.toContain("USD 19");
    expect(
      (await owner("/admin/settings", { offer_on: "on", offer_price: "1900", offer_cap: "10" })).status,
    ).toBe(303);
    expect(await (await get(detail)).text()).toContain(
      "USD 29 per pack. First 10 packs USD 19 at checkout, while available.",
    );
    const notify = {
      ...fixtureValues,
      slug: "notice-only",
      saleMode: "notify",
      productId: "",
      checkoutUrl: "",
      editUrl: "",
      purchaseDate: "",
    };
    expect((await publish(await draft(notify), notify)).status).toBe(303);
    const response = await (await get("/characters/notice-only")).text();
    expect(response).toContain("Notify me when this pack is available");
    expect(response).not.toContain("data-checkout");
  });

  it("serves allowlisted R2 preview media and correct byte ranges", async () => {
    const values = { ...fixtureValues, captions: "fixture/notes.vtt" };
    await publish(await draft(values), values);
    const clip = "/media/fixture/proof.webm";
    const full = await get(clip);
    expect(full.headers.get("Content-Type")).toBe("video/webm");
    expect((await full.arrayBuffer()).byteLength).toBe(8);
    for (const header of ["bytes=6-7", "bytes=-2", "bytes=6-"]) {
      const response = await get(clip, publicSite, { Range: header });
      expect(response.status).toBe(206);
      expect(response.headers.get("Content-Range")).toBe("bytes 6-7/8");
      expect((await response.arrayBuffer()).byteLength).toBe(2);
    }
    expect((await get(clip, publicSite, { Range: "bytes=9-10" })).status).toBe(416);
    expect((await get(clip, publicSite, { "If-None-Match": full.headers.get("ETag") ?? "" })).status).toBe(
      304,
    );
    expect((await get("/media/fixture/notes.vtt")).headers.get("Content-Type")).toBe("text/vtt");
    for (const key of [
      "file.zip",
      "file.png",
      "%2e%2e%2fproof.webm",
      "%66ixture/shot1.webp",
      "fixture%2Fshot1.webp",
    ]) {
      expect((await get(`/media/${key}`)).status).toBe(404);
    }
  });
});

describe("Feedback, privacy and discovery", () => {
  it("validates email, after-use outcome, notify consent and preserves input", async () => {
    const result = await post(
      "/feedback",
      { context: "after", message: "<private note>", research: "on" },
      { url: publicSite },
    );
    expect(result.status).toBe(400);
    const text = await result.text();
    expect(text).toContain("&lt;private note&gt;");
    expect(text).toContain('id="outcome-error"');
    expect(text).toContain('id="email-error"');
    expect(text).toContain(fixtureEnv.SUPPORT_EMAIL);
    const notify = await post("/feedback", { context: "notify" }, { url: publicSite });
    expect(await notify.text()).toContain('id="notify-error"');
  });

  it("keeps bots, throttled requests and storage failures out of the inbox", async () => {
    expect((await post("/feedback", { context: "before", website: "bot" }, { url: publicSite })).status).toBe(
      400,
    );
    const data = { context: "before", message: "Keep this text" };
    const rate = await post("/feedback", data, {
      url: publicSite,
      config: { ...appEnv, FEEDBACK_LIMIT: { limit: async () => ({ success: false }) } },
    });
    expect(rate.status).toBe(429);
    expect(rate.headers.get("Retry-After")).toBe("60");
    const failed = await post("/feedback", data, {
      url: publicSite,
      config: {
        ...appEnv,
        DB: {
          ...db,
          prepare: (query: string) => {
            if (query.startsWith("INSERT")) throw new Error("Storage unavailable");
            return db.prepare(query);
          },
        } as D1Database,
      },
    });
    expect(failed.status).toBe(503);
    expect(await failed.text()).toContain("Keep this text");
    expect(await db.prepare("SELECT count(*) AS count FROM feedback").first()).toEqual({ count: 0 });
  });

  it("confirms only a stored submission and marks analytics only once", async () => {
    const response = await post(
      "/feedback",
      { context: "support", email: "declined@fixture.invalid", message: "Saved" },
      { url: publicSite },
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/feedback/thanks");
    expect(await db.prepare("SELECT message, email FROM feedback").first()).toEqual({
      message: "Saved",
      email: null,
    });
    const cookie = responseCookie(response, "ob-thanks");
    expect(cookie).not.toBe("");
    const first = await get("/feedback/thanks", publicSite, { Cookie: cookie });
    expect(await first.text()).toContain('data-submitted="yes"');
    const replay = await get("/feedback/thanks", publicSite, { Cookie: cookie });
    expect(await replay.text()).not.toContain('data-submitted="yes"');
  });

  it("scrubs nonresearch data older than 90 days and preserves opted-in research", async () => {
    for (const [days, research] of [
      [91, 0],
      [91, 1],
      [89, 0],
    ]) {
      await db
        .prepare(`INSERT INTO feedback(context, message,email,note,order_ref,reply,research,notify,created_at)
        VALUES ('support','message','test@fixture.invalid','note','order',1,?,0,datetime('now',?))`)
        .bind(research, `-${days} days`)
        .run();
    }
    await cleanup(db);
    const rows = (await db.prepare("SELECT email, message, note, order_ref FROM feedback ORDER BY id").all())
      .results;
    expect(rows[0]).toEqual({ email: null, message: null, note: null, order_ref: null });
    expect(rows.slice(1).every((row) => row.email === "test@fixture.invalid")).toBe(true);
  });

  it("limits indexing and analytics to the intended stages and routes", async () => {
    const local = { ...appEnv, STAGE: "local" } as const;
    expect(await (await get("/robots.txt", publicSite, {}, local)).text()).toContain("Disallow: /\n");
    expect((await get("/", publicSite, {}, local)).headers.get("X-Robots-Tag")).toContain("noindex");
    expect(await (await get("/", publicSite, {}, local)).text()).not.toContain("/analytics.js");
    expect(await (await get("/")).text()).toContain("/analytics.js");
    expect(await (await get("/", publicSite, { Cookie: "ob-analytics-off=1" })).text()).not.toContain(
      "/analytics.js",
    );
    expect(await (await get("/privacy")).text()).not.toContain("/analytics.js");
    expect(await (await get("/robots.txt")).text()).toContain("Disallow: /admin");
    expect(await (await get("/sitemap.xml")).text()).toContain("/license/1.0");
    expect(await (await get("/sitemap.xml")).text()).not.toContain("/feedback/thanks");
  });
});
