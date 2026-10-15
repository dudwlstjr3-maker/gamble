const { expect } = require('@playwright/test');
const KEY = 'gamble-v1';
const LOCAL = '127.0.0.1:4173';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// test: fixed outcomes for window.__GAMBLE_TEST, saved: a stored wallet to start from.
async function openGame(page, { test = null, saved = null, motion = 'reduce' } = {}) {
  const errors = [], hosts = new Set();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => hosts.add(new URL(r.url()).host));
  // Offline tests isolate game behavior from Google Fonts availability.
  await page.context().route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.context().route('https://fonts.gstatic.com/**', r => r.abort());
  await page.emulateMedia({ reducedMotion: motion });
  await page.addInitScript(({ test, saved, key }) => {
    localStorage.clear();
    if (saved) localStorage.setItem(key, JSON.stringify(saved));
    if (test) window.__GAMBLE_TEST = test;
  }, { test, saved, key: KEY });
  await page.goto('/tests/sandbox.html');
  const app = page.frameLocator('#app');
  await expect(app.locator('#bank')).toBeVisible();
  return { app, errors, hosts };
}

async function stored(app) { return app.locator('body').evaluate((_, key) => JSON.parse(localStorage.getItem(key)), KEY); }

async function openTab(app, game) {
  await app.locator('#tab-' + game).click();
  await expect(app.locator('#panel-' + game)).toBeVisible();
}

async function setBet(app, game, amount) {
  const clear = app.locator(`[data-act="bet-clear"][data-game="${game}"]`);
  if (await clear.isEnabled()) await clear.click();
  let left = amount;
  for (const v of [500, 100, 50, 10]) {
    while (left >= v) { await app.locator(`[data-act="chip"][data-game="${game}"][data-v="${v}"]`).click(); left -= v; }
  }
  await expect(app.locator('#bet-' + game)).toHaveText(amount.toLocaleString('ko-KR'));
}

async function bankIs(app, n) { await expect(app.locator('#bank')).toHaveText(n.toLocaleString('ko-KR')); }

module.exports = { KEY, LOCAL, FONT_HOSTS, openGame, stored, openTab, setBet, bankIs };
