import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test",
  testMatch: "browser.spec.ts",
  workers: 1,
  timeout: 120000,
  use: { ...devices["Desktop Chrome"], channel: "chromium", baseURL: "http://127.0.0.1:8791" },
  webServer: {
    command: `"${process.execPath}" node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config test/wrangler.browser.json && "${process.execPath}" node_modules/wrangler/bin/wrangler.js dev --ip 127.0.0.1 --port 8791 --inspector-port 8792 --config test/wrangler.browser.json`,
    url: "http://127.0.0.1:8791/healthz",
    timeout: 210000,
    env: { WRANGLER_LOG_PATH: ".wrangler/logs", WRANGLER_SEND_METRICS: "false" },
  },
});
