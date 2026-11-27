import { mkdir, readFile, writeFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Locator, type Page, test } from "@playwright/test";
import { fixtureName, fixtureSlug, fixtureValues, mediaFixtures, scriptUrl } from "./fixture";

const root = "http://127.0.0.1:8791";
const detail = `/characters/${fixtureSlug}`;
const evidence = process.env.OPENBESTIE_EVIDENCE === "1";
const viewports = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 1440, height: 900 },
  { width: 320, height: 740 },
];
const eventNames: string[] = [];
let token: string;

async function capture(target: Page | Locator, area: string, name: string) {
  if (!evidence) return;
  const folder = `docs/evidence/${area}`;
  await mkdir(folder, { recursive: true });
  await target.screenshot({ path: `${folder}/${name}.png`, animations: "disabled" });
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations.map((entry) => [entry.id, entry.nodes.map((node) => node.target)])).toEqual([]);
}

async function mockAnalytics(context: BrowserContext, block = false) {
  await context.route(scriptUrl, (route) => {
    if (block) return route.abort("blockedbyclient");
    return route.fulfill({
      contentType: "text/javascript",
      body: `const options = window.plausible.o; const queue = window.plausible.q || [];
        window.plausible = (n) => { const payload = options.transformRequest({ n, u: location.href, r: document.referrer });
          fetch("https://plausible.io/api/event", { method: "POST", body: JSON.stringify(payload), keepalive: true }).catch(() => {}); };
        window.plausible("pageview"); queue.forEach((args) => window.plausible(...args));`,
    });
  });
  await context.route("https://plausible.io/api/event", (route) => {
    eventNames.push(route.request().postData() ?? "");
    return route.fulfill({ status: 202, headers: { "access-control-allow-origin": "*" } });
  });
}

async function own(context: BrowserContext) {
  await context.route(`${root}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!/^\/(admin|media)(\/|$)/.test(path)) return route.continue();
    return route.continue({ headers: { ...route.request().headers(), "cf-access-jwt-assertion": token } });
  });
}

async function assertReflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page.evaluate(() => ({
        width: window.innerWidth,
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      })),
    )
    .toMatchObject({ overflow: 0 });
}

async function fillCharacter(page: Page, values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    if (key === "saleMode") await page.locator("#saleMode").selectOption(value);
    else await page.locator(`#${key}`).fill(value);
  }
}

test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => {
  token = await (await request.post("/_local-fixture/reset")).text();
  for (const key of Object.keys(mediaFixtures)) {
    const data = key.endsWith(".vtt")
      ? Buffer.from("WEBVTT\n\n00:00:00.000 --> 00:00:01.800\nThe robot moves right.\n")
      : await readFile(`test/fixtures/${key.split("/").at(-1)}`);
    const put = await request.post(`/_local-fixture/media?key=${encodeURIComponent(key)}`, { data });
    expect(put.status()).toBe(204);
  }
});

test("empty storefront, public utility pages and access denial", async ({ page, context }) => {
  await mockAnalytics(context);
  await page.setViewportSize(viewports[0]);
  await page.goto("/");
  await expect(page.getByText("The first packs are still being tested.", { exact: false })).toBeVisible();
  await capture(page, "public", "empty-catalog");
  await axe(page);
  await page.getByRole("link", { name: "Purchases & downloads" }).first().click();
  await expect(page.getByText("View content", { exact: true })).toBeVisible();
  await capture(page, "public", "purchase-recovery");
  await axe(page);
  await page.getByRole("link", { name: "Contact support" }).click();
  await expect(page.getByText("We reply within one business day.")).toBeVisible();
  await capture(page, "public", "support-and-takedown");
  await axe(page);
  await page.getByRole("link", { name: "License", exact: true }).click();
  await capture(page, "legal", "license-index");
  await axe(page);
  await page.getByRole("link", { name: "Permanent version link" }).click();
  await expect(page).toHaveURL("/license/1.0");
  await capture(page, "legal", "versioned-license");
  await page.getByRole("link", { name: "Refunds", exact: true }).click();
  await capture(page, "legal", "refund-policy");
  await axe(page);
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await capture(page, "legal", "privacy-notice");
  await axe(page);
  await page.getByRole("link", { name: "Opt this browser out" }).click();
  await page.getByRole("button", { name: "Exclude this browser" }).click();
  await expect(page.getByRole("status")).toHaveText("Preference saved.");
  await capture(page, "public", "analytics-opt-out");
  await axe(page);
  await page.goto("/");
  await expect(page.locator("script[data-script]")).toHaveCount(0);
  await page.goto("/analytics-opt-out");
  await page.getByRole("button", { name: "Allow analytics" }).click();
  await page.goto("/");
  await expect(page.locator("script[data-script]")).toHaveCount(1);
  const denied = await page.goto("/admin");
  expect(denied?.status()).toBe(403);
  await capture(page, "owner", "anonymous-disallowed");
  expect((await page.goto("/missing-page"))?.status()).toBe(404);
  await capture(page, "public", "not-found");
  expect((await page.goto("/fixture-storage-error"))?.status()).toBe(500);
  await capture(page, "public", "server-error");
});

test("local test identity saves a draft, previews, validates publication and publishes", async ({
  page,
  context,
  request,
}) => {
  await own(context);
  await page.setViewportSize(viewports[2]);
  await page.goto("/admin");
  await page.getByRole("link", { name: "New character" }).click();
  await capture(page, "owner", "empty-listing-editor");
  await fillCharacter(page, fixtureValues);
  await page.locator("#captions").fill("fixture/notes.vtt");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toHaveText("Draft saved.");
  const editor = page.url();
  expect((await request.get(detail)).status()).toBe(404);
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(page.getByText("Owner preview · This page is private.")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator("script[data-script]")).toHaveCount(0);
  await expect(page.getByRole("img", { name: fixtureValues.shot1Alt })).toBeVisible();
  await capture(page, "owner", "draft-preview");
  await axe(page);
  await page.goto(editor);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator("#confirm-error")).toBeVisible();
  await capture(page.locator("form .actions"), "owner", "draft-actions");
  await page.locator("#confirm").check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Character published.");
  await capture(page, "owner", "published-lock");
  await page.getByRole("spinbutton", { name: "Display order" }).fill("2");
  await page.getByRole("button", { name: "Save order" }).click();
  await expect(page.getByRole("status")).toHaveText("Display order saved.");
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByRole("checkbox", { name: "Show the opening offer" }).check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Settings saved.");
  await capture(page, "owner", "offer-settings");
  await axe(page);
  await page
    .getByRole("navigation", { name: "Owner navigation" })
    .getByRole("link", { name: "Characters" })
    .click();
  await capture(page, "owner", "catalog-desktop");
  await page.setViewportSize(viewports[3]);
  await assertReflow(page);
  await axe(page);
  await capture(page, "owner", "catalog-mobile");
});

test("published merchandising reflows, plays on demand and sends cleaned analytics", async ({
  page,
  context,
}) => {
  await mockAnalytics(context);
  const video: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "media") video.push(request.url());
  });
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(
      "/?utm_source=test_channel&ref=article&source=lab&email=private%40fixture.invalid&receipt=local-secret",
    );
    await assertReflow(page);
    await expect(page.getByRole("link", { name: `View ${fixtureName} pack` })).toBeVisible();
    await capture(page, "home", `home-${viewport.width}`);
    await axe(page);
  }
  await page.setViewportSize(viewports[2]);
  await page.goto("/");
  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px");
  await assertReflow(page);
  await capture(page, "home", "text-resize-200");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize(viewports[2]);
  await capture(page.locator(".site-header"), "home", "header");
  await capture(page.locator(".hero"), "home", "hero-and-two-shots");
  await capture(page.locator("#characters"), "home", "all-characters");
  await capture(
    page.locator("section").filter({ has: page.getByRole("heading", { name: "Inside a pack" }) }),
    "home",
    "inside-a-pack",
  );
  await capture(
    page.locator("section").filter({ has: page.getByRole("heading", { name: "Use, limits and support" }) }),
    "home",
    "license-risk-support",
  );
  await capture(page.locator(".site-footer"), "home", "footer");
  expect(video).toHaveLength(0);
  await page.getByText("Play the two-shot clip").click();
  const element = page.locator("video");
  await expect(element).toBeVisible();
  expect(video).toHaveLength(0);
  await element.focus();
  await page.keyboard.press("Space");
  await expect.poll(() => video.length).toBeGreaterThan(0);
  await expect.poll(() => eventNames.filter((value) => value.includes('"proof_play"')).length).toBe(1);
  await capture(page.locator(".play-proof"), "home", "inline-playback");
  const campaign = eventNames.find((value) => value.includes("test_channel"));
  expect(campaign).toContain("ref=article");
  expect(campaign).not.toMatch(/email|receipt|local-secret/);
  await page.getByRole("link", { name: `View ${fixtureName} pack` }).click();
  await expect(page).toHaveURL(detail);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", root + detail);
  await capture(page.locator(".detail-grid"), "character", "proof-summary-purchase");
  await capture(page.locator("#pack-contents"), "character", "pack-manifest-workflow");
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await assertReflow(page);
    await axe(page);
  }
  await page.setViewportSize(viewports[0]);
  await capture(page, "character", "detail-mobile");
  await context.route("https://fixture.gumroad.com/**", (route) =>
    route.fulfill({ body: "Local checkout handoff fixture" }),
  );
  await page.getByRole("link", { name: "Buy character pack" }).click();
  await expect(page).toHaveURL("https://fixture.gumroad.com/l/local-only?wanted=true");
  await expect.poll(() => eventNames.some((value) => value.includes('"checkout_click"'))).toBe(true);
  await page.goBack();
  await page.getByRole("link", { name: "What's stopping you using this pack?" }).click();
  await expect(page.getByLabel("Character")).toHaveValue(fixtureSlug);
});

test("keyboard and JavaScript-disabled feedback, purchase link and recovery", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL: root,
    viewport: viewports[1],
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.getByRole("link", { name: `View ${fixtureName} pack` }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(detail);
  await expect(page.getByRole("link", { name: "Buy character pack" })).toHaveAttribute("href", /wanted=true/);
  await page.getByText("Play the two-shot clip").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("video")).toBeVisible();
  await page.getByRole("link", { name: "What's stopping you using this pack?" }).focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Message (optional)").fill("Local test blocker from a keyboard-only session");
  await page.getByLabel("Message (optional)").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel(/Email \(needed/)).toBeFocused();
  await page.getByRole("checkbox", { name: /email me a reply/ }).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Send feedback" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#email-error")).toBeVisible();
  await expect(page.getByLabel("Message (optional)")).toHaveValue(
    "Local test blocker from a keyboard-only session",
  );
  await capture(page, "feedback", "keyboard-validation");
  await page.getByLabel(/Email \(needed/).fill("reader@fixture.invalid");
  await page.getByRole("button", { name: "Send feedback" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Thanks for your feedback" })).toBeVisible();
  await capture(page, "feedback", "stored-confirmation");
  await context.close();
});

test("failed video and blocked analytics leave stills, terms and checkout working", async ({
  page,
  context,
}) => {
  await mockAnalytics(context, true);
  await context.route("**/media/fixture/proof.webm", (route) => route.abort());
  await page.setViewportSize(viewports[0]);
  await page.goto(detail);
  await page.getByText("Play the two-shot clip").click();
  await page.locator("video").focus();
  await page.keyboard.press("Space");
  await expect
    .poll(() => page.locator("video").evaluate((element: HTMLVideoElement) => Boolean(element.error)))
    .toBe(true);
  await expect(page.getByRole("img", { name: fixtureValues.shot1Alt })).toBeVisible();
  await expect(page.getByRole("img", { name: fixtureValues.shot2Alt })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy character pack" })).toBeVisible();
  await capture(page.locator(".detail-proof"), "character", "failed-video-fallback");
});

test("owner hides, edits and republishes notify, then reviews distinct feedback", async ({
  page,
  context,
  request,
}) => {
  await own(context);
  await mockAnalytics(context);
  await page.setViewportSize(viewports[0]);
  await page.goto("/admin");
  await page.getByRole("link", { name: fixtureName, exact: true }).click();
  const editor = page.url();
  await page.getByRole("button", { name: "Hide listing" }).click();
  await expect(page.getByRole("status")).toHaveText("Listing hidden.");
  expect((await request.get(detail)).status()).toBe(404);
  await capture(page, "owner", "hidden-listing");
  await page.getByLabel("Sale mode").selectOption("notify");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("link", { name: "Notify me when this pack is available" })).toBeVisible();
  await page.goto(editor);
  await page.locator("#confirm").check();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.goto(detail);
  await page.getByRole("link", { name: "Notify me when this pack is available" }).click();
  await expect(page.getByLabel("Character")).toHaveValue(fixtureSlug);
  await expect(page.getByRole("checkbox", { name: /Email me when/ })).not.toBeChecked();
  await capture(page, "feedback", "notify-consent");
  await axe(page);
  await page.getByRole("checkbox", { name: /Email me when/ }).check();
  await page.getByLabel(/Email \(needed/).fill("visitor@fixture.invalid");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("heading", { name: "Thanks for your feedback" })).toBeVisible();
  await expect.poll(() => eventNames.filter((entry) => entry.includes('"feedback_submit"')).length).toBe(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Thanks for your feedback" })).toBeVisible();
  await expect.poll(() => eventNames.filter((entry) => entry.includes('"feedback_submit"')).length).toBe(1);
  await page.goto(`/feedback?context=after&character=${fixtureSlug}`);
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await page.getByLabel("Message (optional)").fill("Local test run, color shifted.");
  await capture(page, "feedback", "post-use-outcome");
  await axe(page);
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.goto("/feedback?context=support");
  await page.getByLabel("Message (optional)").fill("Synthetic question about the archive.");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("heading", { name: "Thanks for your feedback" })).toBeVisible();
  await page.goto("/admin/feedback");
  await axe(page);
  await capture(page, "owner", "feedback-inbox");
  await page.getByRole("link", { name: "Report 1", exact: true }).click();
  await expect(page.getByRole("link", { name: "reader@fixture.invalid" })).toBeVisible();
  await page.getByLabel("Blocker", { exact: true }).selectOption("proof");
  await page.getByLabel("Status", { exact: true }).selectOption("reviewed");
  await page.getByLabel("Reply date").fill("2026-11-27");
  await page.getByLabel("Support outcome").fill("Local test outcome");
  await page.getByLabel("Private note").fill("Local test note");
  await page.getByLabel("Optional order reference").fill("LOCAL-ONLY");
  await page.getByRole("button", { name: "Save feedback" }).click();
  await expect(page.getByRole("status")).toHaveText("Feedback updated.");
  await capture(page, "owner", "feedback-review");
  await page.getByRole("link", { name: /Feedback inbox/ }).click();
  await expect(page.getByText("Proof · 1")).toBeVisible();
  await capture(page.locator('section[aria-labelledby="recent"]'), "owner", "blocker-summary");
});

test("fixture mobile lab meets initial transfer, LCP and CLS budgets under throttling", async ({
  browser,
}) => {
  const readings = [];
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext({ viewport: viewports[0], baseURL: root });
    await mockAnalytics(context);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 100,
      downloadThroughput: 200000,
      uploadThroughput: 93000,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.addInitScript(() => {
      const readings = { lcp: 0, cls: 0, firstInteractionMs: null as number | null };
      const win = window as Window & { lab?: typeof readings };
      win.lab = readings;
      new PerformanceObserver((list) => {
        readings.firstInteractionMs = list.getEntries()[0]?.duration ?? null;
      }).observe({ type: "first-input", buffered: true });
      new PerformanceObserver((list) => {
        for (const item of list.getEntries()) readings.lcp = item.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const item = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!item.hadRecentInput) readings.cls += item.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.getByText("Play the two-shot clip", { exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { lab?: { firstInteractionMs: number | null } }).lab?.firstInteractionMs,
        ),
      )
      .not.toBeNull();
    const measured = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const assets = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const lab = (
        window as Window & { lab?: { lcp: number; cls: number; firstInteractionMs: number | null } }
      ).lab;
      return {
        lcp: lab?.lcp ?? 0,
        cls: lab?.cls ?? 0,
        firstInteractionMs: lab?.firstInteractionMs ?? Number.POSITIVE_INFINITY,
        bytes: nav.transferSize + assets.reduce((sum, asset) => sum + asset.transferSize, 0),
        js: assets
          .filter((asset) => asset.initiatorType === "script")
          .reduce((sum, asset) => sum + asset.transferSize, 0),
      };
    });
    readings.push(measured);
    expect(measured.lcp).toBeGreaterThan(0);
    expect(measured.cls).toBeLessThanOrEqual(0.1);
    expect(measured.bytes).toBeLessThanOrEqual(350000);
    expect(measured.js).toBeLessThanOrEqual(50000);
    await context.close();
  }
  expect(readings.map((reading) => reading.lcp).sort((a, b) => a - b)[1]).toBeLessThanOrEqual(2500);
  expect(readings.map((reading) => reading.firstInteractionMs).sort((a, b) => a - b)[1]).toBeLessThanOrEqual(
    200,
  );
  if (evidence) await writeFile("docs/evidence/mobile-lab.json", JSON.stringify(readings, null, 2));
});
