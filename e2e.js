// End-to-end check: two "phones" talk to each other through the real ntfy.sh.
//
// The site is served on two ports (two origins = two separate phones' storage).
// A parent registers and creates a family, a child opens the invite link and
// joins, then they exchange instructions, answers and messages.
//
// Run:  node tests/e2e.js
// Needs: puppeteer-core (install it OUTSIDE this folder so node_modules isn't
// uploaded to GitHub, then point NODE_PATH at it) and Chrome or Edge.
//   BROWSER_PATH=... to choose the browser, SHOTS_DIR=... to save screenshots.

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

let puppeteer;
try {
  puppeteer = require("puppeteer-core");
} catch (err) {
  console.error("puppeteer-core not found. Install it elsewhere and set NODE_PATH to its node_modules.");
  process.exit(2);
}

const ROOT = path.join(__dirname, "..");
const BROWSER = process.env.BROWSER_PATH || [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((p) => fs.existsSync(p));
const SHOTS = process.env.SHOTS_DIR || "";
const WAIT = 25000; // ntfy.sh usually delivers in 1–2 s; leave room for a slow network

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon",
};

function serve(port) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end("not found"); return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

/* ---------- tiny reporting ---------- */

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? "  ok   " : "  FAIL ") + name + (!ok && detail ? "  — " + detail : ""));
}

// The scenario is one story: after the first failure the rest can't mean anything, so skip it.
let broken = false;

async function step(name, fn) {
  if (broken) {
    results.push({ name, ok: false, detail: "skipped" });
    console.log("  skip " + name);
    return;
  }
  try {
    await fn();
    check(name, true);
  } catch (err) {
    broken = true;
    check(name, false, String(err && err.message ? err.message : err).split("\n")[0]);
  }
}

async function shot(page, name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true });
}

/* ---------- page helpers ---------- */

async function phone(browser, label, errors) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on("pageerror", (err) => errors.push(label + ": " + err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(label + " console: " + msg.text()); });
  page.setDefaultTimeout(WAIT);
  return page;
}

async function go(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
}

async function onPage(page, file) {
  await page.waitForFunction((f) => location.pathname.endsWith("/" + f) && document.readyState !== "loading", {}, file);
}

async function tap(page, selector) {
  await page.waitForSelector(selector, { visible: true });
  await page.$eval(selector, (el) => el.click());
}

async function type(page, selector, text) {
  await page.waitForSelector(selector, { visible: true });
  // Clear first: a triple click doesn't select the text of a password field.
  await page.$eval(selector, (el) => { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.type(selector, text);
}

// "Visible" = has a box on the page. (offsetParent would miss position: fixed elements like the tab bar.)
async function textIn(page, selector, text) {
  await page.waitForFunction((sel, want) => [...document.querySelectorAll(sel)].some((el) => el.getClientRects().length > 0 && el.textContent.includes(want)), {}, selector, text);
}

async function clickByText(page, selector, text) {
  await textIn(page, selector, text);
  await page.evaluate((sel, want) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0 && e.textContent.includes(want));
    el.click();
  }, selector, text);
}

async function noSideScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

/* ---------- the scenario ---------- */

(async function main() {
  if (!BROWSER) { console.error("No Chrome/Edge found. Set BROWSER_PATH."); process.exit(2); }
  const servers = [await serve(8101), await serve(8102)];
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: true, args: ["--lang=en-US", "--autoplay-policy=no-user-gesture-required"] });
  const errors = [];
  const parent = await phone(browser, "parent", errors);
  const child = await phone(browser, "child", errors);
  const P = "http://127.0.0.1:8101/";
  const C = "http://127.0.0.1:8102/";
  let code = "";

  console.log("Parent: landing → register → role → family");
  await step("landing page opens and links to registration", async () => {
    await go(parent, P + "index.html");
    await tap(parent, ".hero-cta a[href='register.html']");
    await onPage(parent, "register.html");
  });
  await step("registration checks the PIN", async () => {
    await type(parent, "#name", "Mom");
    await type(parent, "#pin", "12");
    await tap(parent, "#register-form button[type=submit]");
    await textIn(parent, "#pin-err", "4");
  });
  await step("parent registers and chooses the parent role", async () => {
    await type(parent, "#pin", "1234");
    await type(parent, "#pin2", "1234");
    await tap(parent, "#register-form button[type=submit]");
    await onPage(parent, "role.html");
    await shot(parent, "01-role");
    await tap(parent, "[data-role=parent]");
    await onPage(parent, "family.html");
  });
  await step("parent creates a family and gets an invite code", async () => {
    await type(parent, "#family-name", "Karimovs");
    await tap(parent, "#create-form button[type=submit]");
    await parent.waitForSelector("#invite-panel", { visible: true });
    code = (await parent.$eval("#invite-code", (el) => el.textContent)).trim();
    if (!/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(code)) throw new Error("bad code: " + code);
    await shot(parent, "02-invite");
    await tap(parent, "#invite-done");
    await onPage(parent, "parent.html");
    await parent.waitForSelector(".key", { visible: true });
    await shot(parent, "03-parent-empty");
  });

  console.log("Child: invite link → register → role → join");
  await step("invite link leads to registration with an invite note", async () => {
    await go(child, C + "app.html?join=" + code.replace(/-/g, ""));
    await onPage(child, "register.html");
    await child.waitForSelector("#join-note", { visible: true });
  });
  await step("child registers, chooses child and is in the family without typing the code", async () => {
    await type(child, "#name", "Ali");
    await type(child, "#pin", "5678");
    await type(child, "#pin2", "5678");
    await tap(child, "#register-form button[type=submit]");
    await onPage(child, "role.html");
    await tap(child, "[data-role=child]");
    await onPage(child, "child.html");
  });

  console.log("Presence: both phones learn about each other");
  await step("parent sees the child in 'Send to'", () => textIn(parent, ".chip", "Ali"));
  await step("child sees that a parent is in the family", async () => {
    await textIn(child, ".quiet", "No new instructions");
    await shot(child, "04-child-empty");
  });
  await step("child learns the family name", async () => {
    await tap(child, ".tab:nth-child(3)");
    await textIn(child, "[data-screen=me]", "Karimovs");
    await shot(child, "04b-child-me");
    await tap(child, ".tab:nth-child(1)");
  });

  console.log("Parent → child: one tap");
  await step("a ready-made button reaches the child", async () => {
    await tap(parent, ".keys .key:not(.key-new)");
    await textIn(child, ".now .now-text", "Come and eat");
    await shot(child, "05-child-instruction");
  });
  await step("parent sees it was seen", () => textIn(parent, ".feed .status-seen", "Seen"));
  await step("child answers Done, parent sees Done", async () => {
    await tap(child, ".now .reply-done");
    await textIn(parent, ".feed .status-done", "Done");
    await shot(parent, "06-parent-done");
  });

  console.log("Child → parent: quick message");
  await step("child's 'Pick me up' shows up for the parent", async () => {
    await clickByText(child, ".keys .key", "Pick me up");
    await textIn(parent, ".inbox-item", "Pick me up");
    await shot(parent, "07-parent-inbox");
  });
  await step("parent dismisses it", async () => {
    await clickByText(parent, ".inbox-item button", "Got it");
    await parent.waitForFunction(() => !document.querySelector(".inbox-item"));
  });

  console.log("Urgent + own text");
  await step("an urgent own-text instruction arrives as urgent", async () => {
    await tap(parent, ".urgent-toggle");
    await type(parent, ".compose .input", "Test 123");
    await tap(parent, ".compose-send");
    await textIn(child, ".now.is-urgent .now-text", "Test 123");
    await shot(child, "08-child-urgent");
  });
  await step("urgent switches itself off after sending", async () => {
    const pressed = await parent.$eval(".urgent-toggle", (el) => el.getAttribute("aria-pressed"));
    if (pressed !== "false") throw new Error("aria-pressed=" + pressed);
  });

  console.log("Parent's own button");
  await step("parent creates a button in the editor", async () => {
    await clickByText(parent, ".link-btn", "Edit");
    await tap(parent, ".key-new");
    await parent.waitForSelector("#editor.is-open", { visible: true });
    await type(parent, "#editor input", "Feed the cat");
    await clickByText(parent, "#editor .emoji-opt", "🐱");
    await shot(parent, "09-editor");
    await tap(parent, "#editor button[type=submit]");
    await textIn(parent, ".keys .key-label", "Feed the cat");
    await clickByText(parent, ".link-btn", "Done");
  });
  await step("the new button works", async () => {
    await clickByText(parent, ".keys .key", "Feed the cat");
    await textIn(child, ".now .now-text", "Feed the cat");
  });

  console.log("Language, reload, overflow");
  await step("child switches to Russian: the interface follows", async () => {
    await tap(child, ".topbar [data-lang=ru]");
    await textIn(child, ".tabbar", "Главная");
  });
  await step("ready-made text follows the child's language", async () => {
    await tap(child, ".tab:nth-child(2)");
    await shot(child, "10-child-history-ru");
    await textIn(child, "[data-screen=history]", "Иди кушать");
  });
  await step("after a reload the child is still in the family with history", async () => {
    await child.reload({ waitUntil: "domcontentloaded" });
    await onPage(child, "child.html");
    await tap(child, ".tab:nth-child(2)");
    await textIn(child, "[data-screen=history]", "Test 123");
  });
  for (const [page, name] of [[parent, "parent"], [child, "child"]]) {
    await step(name + " screen has no sideways scroll at 360px", async () => {
      if (!(await noSideScroll(page))) throw new Error("scrollWidth > clientWidth");
    });
  }

  console.log("Log out and back in");
  await step("parent logs out and back in with the PIN", async () => {
    await tap(parent, ".tab:nth-child(3)");
    await shot(parent, "11-parent-family");
    await clickByText(parent, "[data-screen=family] button", "Log out");
    await onPage(parent, "login.html");
    await tap(parent, "#login-form button[type=submit]");
    await textIn(parent, "#login-error", "PIN");
    await type(parent, "#pin", "1234");
    await tap(parent, "#login-form button[type=submit]");
    await onPage(parent, "parent.html");
  });

  check("no JavaScript errors on either phone", errors.length === 0, errors.slice(0, 5).join(" | "));

  await browser.close();
  servers.forEach((s) => s.close());
  const failed = results.filter((r) => !r.ok).length;
  console.log("\n" + (results.length - failed) + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
