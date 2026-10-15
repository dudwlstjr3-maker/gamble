const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const { LOCAL, FONT_HOSTS, openGame, stored, openTab, setBet, bankIs } = require('./helpers.cjs');
const GAMES = ['blackjack', 'baccarat', 'oddeven', 'crash', 'mines', 'plinko'];
const NO_SQUEEZE = { v: 1, prefs: { bacSqueeze: false } };

test('six games share one wallet, no forms, and nothing leaves the device', async ({ page }) => {
  const { app, errors, hosts } = await openGame(page);
  await expect(app.locator('[role="tab"]')).toHaveCount(6);
  await expect(app.locator('form')).toHaveCount(0);
  await bankIs(app, 1000);
  const source = fs.readFileSync('index.html', 'utf8');
  expect(source).not.toMatch(/<form\b|type=["']submit|fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/);
  const external = await app.locator('html').evaluate(() => [...document.querySelectorAll('script[src],link[href],img[src],iframe[src]')].map(e => new URL(e.src || e.href).host));
  expect(external.every(h => ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(h))).toBe(true);
  expect([...hosts].every(h => h === LOCAL || FONT_HOSTS.includes(h))).toBe(true);
  expect(errors).toEqual([]);
});

test('blackjack pays 3:2 and the wallet survives a new page', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { blackjack: ['AS', '9H', 'KD', '7C'] } });
  await app.locator('[data-act="bj-deal"]').click();
  await expect(app.locator('#bjMsg')).toContainText('블랙잭');
  await bankIs(app, 1075);
  const state = await stored(app);
  expect(state.chips).toBe(1075);
  expect(state.games.blackjack).toMatchObject({ rounds: 1, wins: 1, bj: 1, net: 75 });
  const again = await page.context().newPage();
  await again.goto('/tests/sandbox.html');
  await expect(again.frameLocator('#app').locator('#bank')).toHaveText('1,075');
  expect(errors).toEqual([]);
});

test('blackjack bust ends the hand without dealer draws', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { blackjack: ['10S', '9H', '6D', '8C', 'KH'] } });
  await app.locator('[data-act="bj-deal"]').click();
  await expect(app.locator('#bjDealer .card.back')).toHaveCount(1);
  await app.locator('[data-act="bj-hit"]').click();
  await expect(app.locator('#bjMsg')).toContainText('버스트');
  await expect(app.locator('#bjDealer .card')).toHaveCount(2);
  await expect(app.locator('#bjDealer .card.back')).toHaveCount(0);
  await bankIs(app, 950);
  expect(errors).toEqual([]);
});

test('dealer peeks under an ace and stands on soft 17', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { blackjack: ['10S', 'AH', '8D', '6C'] } });
  await app.locator('[data-act="bj-deal"]').click();
  await expect(app.locator('#bjDealerTotal')).toHaveText('A + ?');
  await app.locator('[data-act="bj-stand"]').click();
  await expect(app.locator('#bjDealerTotal')).toHaveText('소프트 17');
  await expect(app.locator('#bjDealer .card')).toHaveCount(2);
  await bankIs(app, 1050);
  expect(errors).toEqual([]);
});

test('dealer blackjack is settled before the player acts', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { blackjack: ['10S', 'AH', '9D', 'KC'] } });
  await app.locator('[data-act="bj-deal"]').click();
  await expect(app.locator('#bjMsg')).toContainText('딜러 블랙잭');
  await expect(app.locator('#bjPlay')).toBeHidden();
  await bankIs(app, 950);
  expect(errors).toEqual([]);
});

test('double doubles the wager for exactly one card', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { blackjack: ['6S', '10H', '5D', '7C', '10S'] } });
  await app.locator('[data-act="bj-deal"]').click();
  await app.locator('[data-act="bj-double"]').click();
  await expect(app.locator('#bjHands .hand')).toContainText('더블');
  await expect(app.locator('#bjHands .hand .card')).toHaveCount(3);
  await bankIs(app, 1100);
  expect(errors).toEqual([]);
});

test('split plays two hands and pays each one', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { blackjack: ['8S', '10H', '8D', '7C', '3H', 'KS', 'QD'] } });
  await app.locator('[data-act="bj-deal"]').click();
  await app.locator('[data-act="bj-split"]').click();
  await expect(app.locator('#bjHands .hand')).toHaveCount(2);
  await expect(app.locator('#bjHands .hand.is-active')).toContainText('11');
  await app.locator('[data-act="bj-hit"]').click();
  await expect(app.locator('#bjHands .hand').nth(1)).toHaveClass(/is-active/);
  await app.locator('[data-act="bj-stand"]').click();
  await expect(app.locator('#bjMsg')).toContainText('패 2개 합계 +100칩');
  await bankIs(app, 1100);
  expect((await stored(app)).games.blackjack.rounds).toBe(2);
  expect(errors).toEqual([]);
});

test('blackjack keyboard shortcuts', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { blackjack: ['10S', '9H', '6D', '8C', '5H'] } });
  await app.locator('[data-act="bj-deal"]').click();
  await expect(app.locator('[data-act="bj-hit"]')).toBeFocused();
  await page.keyboard.press('h');
  await expect(app.locator('#bjMsg')).toContainText('이겼어요 +50칩');
  await expect(app.locator('[data-act="bj-deal"]')).toBeFocused();
  expect(errors).toEqual([]);
});

test('baccarat follows the third-card tableau and takes 5% on banker wins', async ({ page }) => {
  const { app, errors } = await openGame(page, { saved: NO_SQUEEZE, test: { baccarat: ['2S', 'KH', '3D', '6C', '7H', '2D'] } });
  await openTab(app, 'baccarat');
  await expect(app.locator('#bacSqBtn')).toHaveAttribute('aria-pressed', 'false');
  await expect(app.locator('[data-act="bac-side"][data-v="banker"]')).toHaveAttribute('aria-pressed', 'true');
  await setBet(app, 'baccarat', 100);
  await app.locator('[data-act="bac-deal"]').click();
  await expect(app.locator('#bacMsg')).toContainText('플레이어 2 : 뱅커 8, 뱅커 승. +95칩');
  await expect(app.locator('#bacP .card')).toHaveCount(3);
  await expect(app.locator('#bacB .card')).toHaveCount(3);
  await expect(app.locator('#bacP .card').nth(2)).toHaveClass(/side/);
  await expect(app.locator('#bacRoad .bead.B')).toHaveCount(1);
  await bankIs(app, 1095);
  expect(errors).toEqual([]);
});

test('baccarat natural tie returns player and banker bets', async ({ page }) => {
  const { app, errors } = await openGame(page, { saved: NO_SQUEEZE, test: { baccarat: ['AS', '5D', '7H', '3C'] } });
  await openTab(app, 'baccarat');
  await app.locator('[data-act="bac-side"][data-v="player"]').click();
  await app.locator('[data-act="bac-deal"]').click();
  await expect(app.locator('#bacMsg')).toContainText('내추럴. 플레이어 8 : 뱅커 8, 타이. 건 칩을 돌려받았어요');
  await expect(app.locator('#bacP .card')).toHaveCount(2);
  await expect(app.locator('#bacRoad .bead.T')).toHaveCount(1);
  await bankIs(app, 1000);
  expect((await stored(app)).prefs.bacSide).toBe('player');
  expect(errors).toEqual([]);
});

test('baccarat squeeze: peel the banker cards by drag, keys and the open button', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { baccarat: ['2S', 'KH', '3D', '6C', '7H', '2D'] } });
  await openTab(app, 'baccarat');
  await expect(app.locator('#bacSqBtn')).toHaveAttribute('aria-pressed', 'true');
  await app.locator('[data-act="bac-deal"]').click();
  const card = app.locator('#sqCard');
  await expect(app.locator('#sqLabel')).toHaveText('뱅커 첫 번째 카드');
  await expect(app.locator('#bacZones')).toBeHidden();
  await expect(app.locator('#bacPrint')).toBeHidden();
  await expect(app.locator('#bacPT')).toHaveText('5');
  await expect(app.locator('#bacB .card.back')).toHaveCount(2);
  await expect(card).toBeFocused();
  const sqAudit = await app.locator('#bacSqueeze').evaluate(el => [...el.querySelectorAll('button')].map(b => b.getBoundingClientRect()).every(r => r.width >= 44 && r.height >= 44));
  expect(sqAudit).toBe(true);
  // A short drag from the bottom edge bends the card without opening it.
  let box = await card.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7, { steps: 6 });
  await page.mouse.up();
  const peeled = Number(await card.getAttribute('aria-valuenow'));
  expect(peeled).toBeGreaterThan(20);
  expect(peeled).toBeLessThan(62);
  expect(await app.locator('#sqBack').evaluate(e => e.style.clipPath)).toMatch(/^inset\(0(px)? 0(px)? /);
  await expect(app.locator('#bacB .card.back')).toHaveCount(2);
  // Dragging further opens it.
  box = await card.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.35, { steps: 6 });
  await page.mouse.up();
  await expect(app.locator('#bacBT')).toHaveText('0');
  await expect(app.locator('#sqLabel')).toHaveText('뱅커 두 번째 카드');
  // Keyboard: left arrow peels from the side; 90% opens.
  await card.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  await expect(card).toHaveAttribute('aria-valuenow', '40');
  await expect(app.locator('[data-act="sq-peek"][data-v="bottom"]')).toBeDisabled();
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft');
  await expect(app.locator('#bacBT')).toHaveText('6');
  // The player's third card is turned by the dealer; the banker's third comes back to the squeeze.
  await expect(app.locator('#sqLabel')).toHaveText('뱅커 세 번째 카드');
  await expect(app.locator('#bacPT')).toHaveText('2');
  await app.locator('[data-act="sq-open"]').click();
  await expect(app.locator('#bacMsg')).toContainText('플레이어 2 : 뱅커 8, 뱅커 승. +47칩');
  await expect(app.locator('#bacSqueeze')).toBeHidden();
  await expect(app.locator('#bacB .card.back')).toHaveCount(0);
  await bankIs(app, 1047);
  await app.locator('#bacSqBtn').click();
  expect((await stored(app)).prefs.bacSqueeze).toBe(false);
  expect(errors).toEqual([]);
});

test('odd-even counts the stones and pays 1.95x', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { oddeven: [13, 8] } });
  await openTab(app, 'oddeven');
  await setBet(app, 'oddeven', 100);
  await app.locator('[data-act="oe-play"]').click();
  await expect(app.locator('#oeCount')).toHaveText('13개 · 홀');
  await expect(app.locator('#oeBowl .stone')).toHaveCount(13);
  await bankIs(app, 1095);
  await app.locator('[data-act="oe-play"]').click();
  await expect(app.locator('#oeCount')).toHaveText('8개 · 짝');
  await expect(app.locator('#oeMsg')).toContainText('틀렸어요 −100칩');
  await bankIs(app, 995);
  await expect(app.locator('#oeHist span')).toHaveText(['짝', '홀']);
  expect(errors).toEqual([]);
});

test('crash auto cash-out pays the target before the bust', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { crash: [2] } });
  await openTab(app, 'crash');
  await setBet(app, 'crash', 100);
  await app.locator('#crAuto').fill('1.10');
  await app.locator('[data-act="cr-start"]').click();
  await expect(app.locator('#crCash')).toBeVisible();
  await expect(app.locator('#crMsg')).toContainText('1.10배에서 캐시아웃 +10칩', { timeout: 4000 });
  await bankIs(app, 1010);
  await expect(app.locator('#crHist span').first()).toHaveText('2.00×', { timeout: 10000 });
  await expect(app.locator('#crGo')).toBeVisible();
  expect(errors).toEqual([]);
});

test('crash loses the wager when it busts before the target', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { crash: [1.05] } });
  await openTab(app, 'crash');
  await app.locator('[data-act="cr-start"]').click();
  await expect(app.locator('#crMsg')).toContainText('1.05배에서 터졌어요 −50칩', { timeout: 4000 });
  await bankIs(app, 950);
  await app.locator('#crAuto').fill('0.5');
  await app.locator('[data-act="cr-start"]').click();
  await expect(app.locator('#crMsg')).toContainText('1.01~1000배');
  await bankIs(app, 950);
  expect(errors).toEqual([]);
});

test('crash manual cash-out locks in the current multiplier', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { crash: [500] } });
  await openTab(app, 'crash');
  await app.locator('#crAuto').fill('');
  await app.locator('[data-act="cr-start"]').click();
  await page.waitForTimeout(900);
  await app.locator('[data-act="cr-cash"]').click();
  await expect(app.locator('#crCash')).toBeDisabled();
  const state = await stored(app);
  expect(state.games.crash.rounds).toBe(1);
  expect(state.chips).toBeGreaterThanOrEqual(1000);
  expect(errors).toEqual([]);
});

test('mines multiplier, cash-out and a mine hit', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { mines: [[0, 1, 2], [0, 1, 2]] } });
  await openTab(app, 'mines');
  await expect(app.locator('#mnCount')).toHaveValue('3');
  await expect(app.locator('#mnNext')).toHaveText('첫 칸 ×1.12');
  await setBet(app, 'mines', 100);
  await app.locator('[data-act="mn-start"]').click();
  await app.locator('.tile[data-i="24"]').click();
  await expect(app.locator('.tile[data-i="24"]')).toHaveClass(/gem/);
  await expect(app.locator('#mnCash')).toHaveText('캐시아웃 112칩');
  await app.locator('[data-act="mn-cash"]').click();
  await bankIs(app, 1012);
  await app.locator('[data-act="mn-start"]').click();
  await app.locator('.tile[data-i="0"]').click();
  await expect(app.locator('#mnMsg')).toContainText('지뢰를 밟았어요 −100칩');
  await expect(app.locator('.tile.boom')).toHaveCount(1);
  await expect(app.locator('.tile.mine')).toHaveCount(2);
  await bankIs(app, 912);
  expect(errors).toEqual([]);
});

test('plinko pays the slot multiplier and shows each table RTP', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { plinko: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]] } });
  await openTab(app, 'plinko');
  const rtp = {};
  for (const risk of ['low', 'mid', 'high']) { await app.locator('#plRisk').selectOption(risk); rtp[risk] = await app.locator('#plRtp').textContent(); }
  expect(rtp).toEqual({ low: '환수율 99.0%', mid: '환수율 99.0%', high: '환수율 99.1%' });
  await app.locator('#plRisk').selectOption('low');
  await expect(app.locator('#plSlots .pslot')).toHaveCount(13);
  await setBet(app, 'plinko', 10);
  await app.locator('[data-act="pl-drop"]').click();
  await expect(app.locator('#plMsg')).toContainText('×10 칸 +90칩');
  await bankIs(app, 1090);
  expect(errors).toEqual([]);
});

test('refill appears only when chips run out', async ({ page }) => {
  const { app, errors } = await openGame(page, { saved: { v: 1, chips: 5, best: 1200, refills: 0 } });
  await expect(app.locator('#refill')).toBeVisible();
  await expect(app.locator('[data-act="bj-deal"]')).toBeDisabled();
  await app.locator('[data-act="refill"]').click();
  await bankIs(app, 1000);
  await expect(app.locator('#refill')).toBeHidden();
  const state = await stored(app);
  expect(state.refills).toBe(1);
  expect(state.games.blackjack.bet).toBe(50);
  expect(errors).toEqual([]);
});

test('reset needs a second press', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: { oddeven: [3] } });
  await openTab(app, 'oddeven');
  await app.locator('[data-act="oe-play"]').click();
  await bankIs(app, 1047);
  const reset = app.locator('#resetBtn');
  await reset.click();
  await expect(reset).toHaveText('한 번 더 누르면 모두 지워져요');
  await bankIs(app, 1047);
  await reset.click();
  await bankIs(app, 1000);
  expect((await stored(app)).games.oddeven.rounds).toBe(0);
  expect(errors).toEqual([]);
});

test('tabs move with arrow keys and remember the last game', async ({ page }) => {
  const { app, errors } = await openGame(page);
  await app.locator('#tab-blackjack').focus();
  await page.keyboard.press('ArrowRight');
  await expect(app.locator('#tab-baccarat')).toBeFocused();
  await expect(app.locator('#panel-baccarat')).toBeVisible();
  await page.keyboard.press('End');
  await expect(app.locator('#tab-plinko')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(app.locator('#panel-blackjack')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(app.locator('#panel-plinko')).toBeVisible();
  expect((await stored(app)).prefs.tab).toBe('plinko');
  const focus = await app.locator('#tab-plinko').evaluate(e => getComputedStyle(e).outlineStyle);
  expect(focus).not.toBe('none');
  expect(errors).toEqual([]);
});

// One finished round per game, then layout, target size and contrast checks on every tab.
test('every tab fits, keeps 44px targets and AA contrast after a round', async ({ page }) => {
  const { app, errors } = await openGame(page, { test: {
    blackjack: ['AS', '9H', 'KD', '7C'], baccarat: ['2S', 'KH', '3D', '6C', '7H', '2D'], oddeven: [7],
    crash: [1.02], mines: [[0, 1, 2]], plinko: [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]] } });
  const play = {
    blackjack: async () => { await app.locator('[data-act="bj-deal"]').click(); await expect(app.locator('#bjMsg')).toContainText('블랙잭'); },
    baccarat: async () => { await app.locator('[data-act="bac-deal"]').click(); for (let i = 0; i < 3; i++) await app.locator('[data-act="sq-open"]').click(); await expect(app.locator('#bacRoad .bead')).toHaveCount(1); },
    oddeven: async () => { await app.locator('[data-act="oe-play"]').click(); await expect(app.locator('#oeBowl .stone')).toHaveCount(7); },
    crash: async () => { await app.locator('[data-act="cr-start"]').click(); await expect(app.locator('#crHist span').first()).toHaveText('1.02×'); },
    mines: async () => { await app.locator('[data-act="mn-start"]').click(); await app.locator('.tile[data-i="0"]').click(); await expect(app.locator('.tile.boom')).toHaveCount(1); },
    plinko: async () => { await app.locator('[data-act="pl-drop"]').click(); await expect(app.locator('#plHist span').first()).toHaveText('×33'); },
  };
  await app.locator('details').evaluateAll(els => els.forEach(e => { e.open = true; }));
  for (const game of GAMES) {
    await openTab(app, game);
    await play[game]();
    const audit = await app.locator('body').evaluate(() => {
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
    expect(audit.overflow, game).toBe(false);
    expect(audit.small, game).toEqual([]);
    expect(audit.unlabeled, game).toEqual([]);
    expect(audit.contrast, game).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('motion respects reduced-motion preference', async ({ page }) => {
  const { app } = await openGame(page, { motion: 'no-preference', test: { blackjack: ['10S', '9H', '6D', '8C'] } });
  await app.locator('[data-act="bj-deal"]').click();
  expect(await app.locator('#bjHands .card').first().evaluate(e => getComputedStyle(e).animationName)).toBe('deal');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await app.locator('#bjHands .card').first().evaluate(e => getComputedStyle(e).animationName)).toBe('none');
});
