// Reproduce before/after with the same deterministic game states and history.
// Run with tests/server.cjs listening on 4173: node docs/capture.cjs before|after
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Use before or after');
const games = ['blackjack', 'baccarat', 'oddeven', 'crash', 'mines', 'plinko'];
const hist = {
  bac: { shoe: 1, list: 'BBPPTBPPBBBPBPTBBPPBBP'.split('').map((w, i) => ({ w, p: w === 'P' ? 8 : 4, b: w === 'B' ? 9 : 4, pp: i === 5, bp: i === 8 })) },
  bj: ['win', 'lose', 'bj', 'push', 'win', 'win', 'bust'].map(h => ({ d: 18, dbj: false, h: [h], net: h === 'win' ? 50 : -50 })),
  oe: [5, 12, 7, 9, 18, 4, 11, 8, 3, 15, 6, 7],
  cr: [1.12, 2.36, 1.04, 5.8, 2.1, 1.65, 8.72, 1.03].map(x => ({ x, c: x >= 2 ? 2 : 0 })),
  mn: [{ m: 3, k: 4, x: 1.72 }, { m: 3, k: 0, x: 0 }, { m: 3, k: 2, x: 1.28 }],
  pl: { n: [0, 0, 1, 3, 6, 10, 14, 10, 6, 3, 1, 0, 0], list: [{ s: 6, x: .4 }, { s: 4, x: 1.1 }, { s: 3, x: 3 }] }
};
(async () => {
  fs.mkdirSync('docs/screenshots', { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium' });
  for (const [width, height] of [[390, 844], [1440, 900]]) for (const colorScheme of ['light', 'dark']) {
    for (const game of process.env.GAMBLE_CAPTURE_ONLY ? [process.env.GAMBLE_CAPTURE_ONLY] : [...games, 'squeeze', 'board']) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion: 'reduce', locale: 'ko-KR' });
      // Same offline font fallback as the repository's regression tests.
      await context.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }));
      await context.route('https://fonts.gstatic.com/**', r => r.abort());
      const page = await context.newPage();
      if (process.env.GAMBLE_CAPTURE_SOURCE) {
        const source = fs.readFileSync(process.env.GAMBLE_CAPTURE_SOURCE, 'utf8');
        await page.route('**/index.html', r => r.fulfill({ contentType: 'text/html; charset=utf-8', body: source }));
      }
      await page.addInitScript(({ hist, game }) => {
        localStorage.setItem('gamble-v1', JSON.stringify({ v: 1, chips: 1000, prefs: { bacSqueeze: game === 'squeeze' }, hist }));
        window.__GAMBLE_TEST = { blackjack: ['AS', '9H', 'KD', '7C'], baccarat: ['2S', 'KH', '3D', '6C', '7H', '2D'], oddeven: [9], crash: [1.02], mines: [[0, 1, 2]], plinko: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]] };
      }, { hist, game });
      await page.goto('http://127.0.0.1:4173/index.html#' + (game === 'board' ? 'board-baccarat' : game === 'squeeze' ? 'baccarat' : game));
      if (game === 'blackjack') { await page.locator('#bjDealBtn').click(); await expect(page.locator('#bank')).toHaveText('1,075'); }
      if (game === 'baccarat') { await page.locator('#bacDealBtn').click(); await expect(page.locator('#bacMsg')).toContainText('뱅커 승'); }
      if (game === 'oddeven') { await page.locator('#oePlayBtn').click(); await expect(page.locator('#oeCount')).toContainText('9'); }
      if (game === 'crash') { await page.locator('#crGo').click(); await expect(page.locator('#sb-crash .chipsx span').last()).toBeVisible(); await expect(page.locator('#crGo')).toBeVisible(); }
      if (game === 'mines') { await page.locator('#mnGo').click(); await page.locator('.tile[data-i="10"]').click(); await page.locator('.tile[data-i="16"]').click(); }
      if (game === 'plinko') { await page.locator('#plDrop').click(); await expect(page.locator('#sb-plinko .sb-stats')).toContainText('33'); }
      if (game === 'squeeze') {
        await page.locator('#bacDealBtn').click();
        await expect(page.locator('#sqCard')).toBeVisible();
        await page.locator('#sqCard').press('ArrowUp');
        await page.locator('#sqCard').press('ArrowUp');
        await page.locator('#sqCard').press('ArrowUp');
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `docs/screenshots/${phase}-${width}x${height}-${colorScheme}-${game}.png` });
      await context.close();
    }
  }
  await browser.close();
  console.log(`${phase}: screenshots saved`);
})();
