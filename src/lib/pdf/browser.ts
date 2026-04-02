import { chromium, type Browser } from "playwright";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) return browser;

  browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

// Cleanup on process exit
if (typeof process !== "undefined") {
  const cleanup = () => {
    closeBrowser().catch(() => {});
  };
  process.on("SIGTERM", cleanup);
  process.on("beforeExit", cleanup);
}
