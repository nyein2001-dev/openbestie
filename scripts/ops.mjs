import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const local = "wrangler.jsonc";
const base = JSON.parse(readFileSync(resolve(root, local), "utf8"));
const [command, requestedStage = "production", arg] = process.argv.slice(2);
const stage = requestedStage;
const preview = stage === "preview";
const settings = [
  "SELLER_NAME",
  "SUPPORT_EMAIL",
  "GUMROAD_HOST",
  "ADMIN_HOST",
  "ACCESS_ISSUER",
  "ACCESS_AUDIENCE",
  "OWNER_EMAIL",
  "PLAUSIBLE_SCRIPT_URL",
];
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const bucketPattern = /^[a-z\d][a-z\d-]{1,61}[a-z\d]$/;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (existsSync(resolve(root, ".env"))) loadEnvFile(resolve(root, ".env"));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(args, config = local) {
  const logDir = resolve(root, ".wrangler/logs");
  mkdirSync(logDir, { recursive: true });
  const result = spawnSync(
    process.execPath,
    [resolve(root, "node_modules/wrangler/bin/wrangler.js"), ...args, "--config", config],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, WRANGLER_LOG_PATH: logDir, WRANGLER_SEND_METRICS: "false" },
    },
  );
  if (result.status !== 0) fail(result.error?.message ?? `Wrangler exited with status ${result.status}.`);
}

function origin(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol === "https:" &&
      /^https:\/\/[a-z]/i.test(value) &&
      !url.port &&
      !url.username &&
      !url.password &&
      url.hostname.includes(".") &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !/(^|\.)(localhost|invalid|test|local|internal|example|example\.com|example\.org|example\.net)$/i.test(
        url.hostname,
      )
    ) {
      return url.origin;
    }
  } catch {
    return undefined;
  }
}

function real(value) {
  return Boolean(
    value?.trim() &&
      !/(placeholder|changeme|change.me|replace.me|your[-_ ]|example\.(com|net|org)|not configured)/i.test(
        value,
      ),
  );
}

function prepare() {
  const urlKey = preview ? "PREVIEW_URL" : "PUBLIC_URL";
  const idKey = preview ? "PREVIEW_D1_DATABASE_ID" : "D1_DATABASE_ID";
  const bucketKey = preview ? "PREVIEW_R2_BUCKET" : "R2_BUCKET";
  const publicUrl = origin(process.env[urlKey]);
  const id = process.env[idKey]?.toLowerCase();
  const bucket = process.env[bucketKey];
  const errors = [];
  if (!publicUrl) errors.push(urlKey);
  else {
    const otherUrl = origin(process.env[preview ? "PUBLIC_URL" : "PREVIEW_URL"]);
    const ownerHost = process.env.ADMIN_HOST?.toLowerCase();
    if (publicUrl === otherUrl || (preview && new URL(publicUrl).hostname === ownerHost)) {
      errors.push(`${urlKey} (preview must have its own hostname)`);
    }
  }
  if (!preview && (!real(process.env.SELLER_NAME) || process.env.SELLER_NAME.length > 100))
    errors.push("SELLER_NAME");
  if (
    !preview &&
    (!real(process.env.SUPPORT_EMAIL) ||
      !email.test(process.env.SUPPORT_EMAIL) ||
      /\.(invalid|test|local|internal|localhost)$/i.test(process.env.SUPPORT_EMAIL))
  )
    errors.push("SUPPORT_EMAIL");
  if (
    !uuid.test(id ?? "") ||
    /^0+(-0+)+$/.test(id) ||
    id === base.d1_databases[0].database_id ||
    (process.env.PREVIEW_D1_DATABASE_ID &&
      process.env.PREVIEW_D1_DATABASE_ID.toLowerCase() === process.env.D1_DATABASE_ID?.toLowerCase())
  )
    errors.push(idKey);
  if (
    !real(bucket) ||
    !bucketPattern.test(bucket) ||
    bucket === base.r2_buckets[0].bucket_name ||
    (process.env.PREVIEW_R2_BUCKET && process.env.PREVIEW_R2_BUCKET === process.env.R2_BUCKET)
  )
    errors.push(bucketKey);
  if (errors.length) fail(`Preflight requires valid, separate configuration for ${errors.join(", ")}.`);

  const adminHost = process.env.ADMIN_HOST?.toLowerCase();
  const adminOrigin = adminHost && origin(`https://${adminHost}`);
  const issuer = process.env.ACCESS_ISSUER?.replace(/\/$/, "");
  const access =
    !preview &&
    adminOrigin !== publicUrl &&
    adminOrigin === `https://${adminHost}` &&
    /^https:\/\/[\da-z-]+\.cloudflareaccess\.com$/.test(issuer ?? "") &&
    real(process.env.ACCESS_AUDIENCE) &&
    real(process.env.OWNER_EMAIL) &&
    email.test(process.env.OWNER_EMAIL);
  const plausible = /^https:\/\/plausible\.io\/js\/pa-[a-z\d_-]+\.js$/i.test(
    process.env.PLAUSIBLE_SCRIPT_URL ?? "",
  );
  if (!preview && !access)
    console.warn("Cloudflare Access is incomplete. The admin panel will remain locked.");
  if (!preview && !plausible) console.warn("Plausible is unconfigured or invalid. Analytics will be off.");
  if (!preview && !/^[a-z\d-]+\.gumroad\.com$|^gumroad\.com$/.test(process.env.GUMROAD_HOST ?? "")) {
    console.warn("Gumroad host is unconfigured or invalid. Buy-mode publication will be unavailable.");
  }
  const vars = { STAGE: stage, PUBLIC_URL: publicUrl };
  for (const key of settings) {
    const admin = ["ADMIN_HOST", "ACCESS_ISSUER", "ACCESS_AUDIENCE", "OWNER_EMAIL"].includes(key);
    if (
      !real(process.env[key]) ||
      (admin && !access) ||
      (key === "PLAUSIBLE_SCRIPT_URL" && (preview || !plausible))
    )
      continue;
    vars[key] = key === "ADMIN_HOST" ? adminHost : key === "ACCESS_ISSUER" ? issuer : process.env[key];
  }
  const publicHost = new URL(publicUrl).hostname;
  const workersDev = publicHost.endsWith(".workers.dev");
  const workerName = preview ? "openbestie-preview" : "openbestie";
  if (workersDev && (publicHost.split(".").length !== 4 || publicHost.split(".")[0] !== workerName)) {
    fail(`${urlKey} must match the ${workerName} Worker when using workers.dev.`);
  }
  const domains = [...(workersDev ? [] : [publicHost]), ...(access ? [adminHost] : [])];
  const config = `.wrangler-${stage}.json`;
  writeFileSync(
    resolve(root, config),
    JSON.stringify(
      {
        ...base,
        name: workerName,
        vars,
        workers_dev: workersDev,
        preview_urls: false,
        routes: domains.map((pattern) => ({ pattern, custom_domain: true })),
        d1_databases: [{ binding: "DB", database_name: workerName, database_id: id }],
        r2_buckets: [{ binding: "MEDIA", bucket_name: bucket }],
        ratelimits: [{ ...base.ratelimits[0], namespace_id: preview ? "11002" : "11003" }],
      },
      null,
      2,
    ),
  );
  return { config, publicUrl };
}

async function smoke(url, testStage) {
  const checks = [
    ["/", 200, "Cast a character", true],
    ["/healthz", 200, '"ok":true', false],
    ["/purchases", 200, "View content", false],
    ["/license/1.0", 200, "Version 1.0", false],
    ["/feedback", 200, "Share feedback", false],
    ["/site.css", 200, "font-face", false],
    ["/admin", 403, "Access denied", false],
    ["/characters/nonexistent-smoke-check", 404, "Page not found", false],
    ["/robots.txt", 200, testStage === "production" ? "Disallow: /admin" : "Disallow: /", false],
    ["/sitemap.xml", 200, "urlset", false],
  ];
  for (const [path, status, body, homepage] of checks) {
    let response;
    let content = "";
    for (let attempt = 0; attempt < 7; attempt++) {
      try {
        response = await fetch(new URL(path, url), { signal: AbortSignal.timeout(8000), redirect: "manual" });
        content = await response.text();
        if (response.status === status && content.includes(body)) break;
      } catch {
        response = undefined;
      }
      if (attempt < 6) await new Promise((done) => setTimeout(done, 2500));
    }
    if (response?.status !== status || !content.includes(body))
      fail(`Smoke failed for ${path} (HTTP ${response?.status ?? "unreachable"}).`);
    if (!response.headers.has("content-security-policy")) fail(`Missing security headers at ${path}.`);
    if (
      homepage &&
      testStage !== "production" &&
      !response.headers.get("x-robots-tag")?.includes("noindex")
    ) {
      fail("Preview must be noindex.");
    }
  }
  console.log(`Smoke passed ${checks.length} checks on ${url}.`);
}

if (command === "build") {
  run(["deploy", "--dry-run", "--outdir", "dist"]);
  const bundle = readFileSync(resolve(root, "dist/index.js"), "utf8");
  if (/Local Test Identity|local-fixture-key|fixture-clockwork|TEST_MIGRATIONS/.test(bundle))
    fail("The deploy bundle includes a test fixture.");
} else if (command === "smoke") {
  const testStage = arg ?? "production";
  if (!["local", "preview", "production"].includes(testStage))
    fail("Choose local, preview or production for smoke.");
  await smoke(requestedStage, testStage);
} else {
  if (!["local", "preview", "production"].includes(stage)) fail("Choose local, preview or production.");
  const config = stage === "local" ? local : prepare().config;
  switch (command) {
    case "preflight":
      console.log(`Configuration passed for ${stage}.`);
      break;
    case "deploy": {
      if (stage === "local") fail("Use deploy:preview or deploy:production.");
      run(["d1", "migrations", "apply", "DB", "--remote"], config);
      run(["deploy"], config);
      await smoke(origin(process.env[preview ? "PREVIEW_URL" : "PUBLIC_URL"]), stage);
      break;
    }
    case "migrate":
      run(["d1", "migrations", "apply", "DB", stage === "local" ? "--local" : "--remote"], config);
      break;
    case "export": {
      const output = resolve(root, arg ?? `backups/${stage}-${Date.now()}.sql`);
      mkdirSync(dirname(output), { recursive: true });
      if (existsSync(output)) fail("Choose an unused backup path.");
      run(["d1", "export", "DB", stage === "local" ? "--local" : "--remote", "--output", output], config);
      break;
    }
    case "restore": {
      if (!arg || !existsSync(resolve(root, arg))) fail("Supply an existing backup file.");
      if (stage === "local") {
        const scratch = resolve(root, `.wrangler/restore-${Date.now()}`);
        run(
          ["d1", "execute", "DB", "--local", "--persist-to", scratch, "--file", resolve(root, arg)],
          config,
        );
        run(
          [
            "d1",
            "execute",
            "DB",
            "--local",
            "--persist-to",
            scratch,
            "--command",
            "PRAGMA quick_check; SELECT id FROM settings;",
          ],
          config,
        );
        console.log(`Restored to isolated local storage at ${scratch}.`);
      } else {
        const target = process.env.RESTORE_DATABASE_ID?.toLowerCase();
        if (
          !uuid.test(target ?? "") ||
          [
            base.d1_databases[0].database_id,
            process.env.D1_DATABASE_ID?.toLowerCase(),
            process.env.PREVIEW_D1_DATABASE_ID?.toLowerCase(),
          ].includes(target)
        ) {
          fail("Set RESTORE_DATABASE_ID to a separate, empty recovery D1 database.");
        }
        const recovery = JSON.parse(readFileSync(resolve(root, config), "utf8"));
        recovery.d1_databases[0].database_id = target;
        const recoveryConfig = ".wrangler-recovery.json";
        writeFileSync(resolve(root, recoveryConfig), JSON.stringify(recovery, null, 2));
        run(["d1", "execute", "DB", "--remote", "--file", resolve(root, arg)], recoveryConfig);
        run(
          ["d1", "execute", "DB", "--remote", "--command", "PRAGMA quick_check; SELECT id FROM settings;"],
          recoveryConfig,
        );
      }
      break;
    }
    case "rollback":
      if (stage === "local" || !uuid.test(arg ?? ""))
        fail("Supply an explicit deployed Worker version UUID.");
      run(["rollback", arg, "--message", "Open Bestie rollback"], config);
      await smoke(origin(process.env[preview ? "PREVIEW_URL" : "PUBLIC_URL"]), stage);
      break;
    default:
      fail("Unknown operations command.");
  }
}
