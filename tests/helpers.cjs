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

// Layout, 44px targets, labels and AA text contrast for everything visible in the frame.
async function auditPage(app) {
  return app.locator('body').evaluate(() => {
    const shown = e => e.getClientRects().length && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden';
    const small = [...document.querySelectorAll('button,input,select,summary,a')].filter(shown).map(e => ({ text: (e.textContent || e.id).trim().slice(0, 30), r: e.getBoundingClientRect() })).filter(x => x.r.width < 43.9 || x.r.height < 43.9).map(x => ({ text: x.text, w: x.r.width, h: x.r.height }));
    const unlabeled = [...document.querySelectorAll('input,select')].filter(e => !e.labels?.length && !e.getAttribute('aria-label')).map(e => e.id);
    function rgba(s) { return s.match(/[\d.]+/g).map(Number); }
    function blend(a, b) { const alpha = a[3] ?? 1; return a.slice(0, 3).map((x, i) => x * alpha + b[i] * (1 - alpha)); }
    function bg(e) { let c = [255, 255, 255]; const chain = []; for (let n = e; n && n.nodeType === 1; n = n.parentElement) chain.unshift(n); for (const n of chain) c = blend(rgba(getComputedStyle(n).backgroundColor), c); return c; }
    function lum(c) { return c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); }
    const contrast = [];
    for (const e of document.querySelectorAll('body *')) {
      if (!shown(e) || e.matches(':disabled') || e.closest(':disabled') || ['SCRIPT', 'STYLE', 'OPTION'].includes(e.tagName)) continue;
      const text = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      if (!text) continue;
      const st = getComputedStyle(e), back = bg(e), fore = blend(rgba(st.color), back), l = [lum(back), lum(fore)].sort((a, b) => b - a), ratio = (l[0] + .05) / (l[1] + .05);
      if (ratio < 4.5) contrast.push({ text: text.slice(0, 30), ratio: Math.round(ratio * 100) / 100 });
    }
    return { overflow: document.documentElement.scrollWidth > innerWidth, small, unlabeled, contrast };
  });
}

module.exports = { KEY, LOCAL, FONT_HOSTS, openGame, stored, openTab, setBet, bankIs, auditPage };
