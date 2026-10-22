const { test, expect } = require('@playwright/test');
const { openGame, openTab, auditPage } = require('./helpers.cjs');

test('fixed header and active action bar stay reachable while reading history', async ({ page }) => {
  const { app } = await openGame(page);
  for (const game of ['blackjack', 'baccarat', 'oddeven', 'crash', 'mines', 'plinko']) {
    await openTab(app, game);
    const rail = app.locator(`#panel-${game} > .rail`);
    const visibleControls = await rail.evaluate(el => [...el.querySelectorAll('button,input,select')]
      .filter(e => e.getClientRects().length).every(e => {
        const r = e.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 88 && r.bottom <= innerHeight;
      }));
    expect(visibleControls, game).toBe(true);
    await app.locator('#infoTitle').scrollIntoViewIfNeeded();
    expect(await app.locator('.top').evaluate(e => e.getBoundingClientRect().top)).toBe(0);
    expect(await rail.evaluate(e => Math.round(e.getBoundingClientRect().bottom))).toBe(844);
    const audit = await auditPage(app);
    expect(audit.overflow, game).toBe(false);
  }
});

test('the active mine grid fits above the action bar at the top of the page', async ({ page }) => {
  const { app } = await openGame(page, { test: { mines: [[0, 1, 2]] } });
  await openTab(app, 'mines');
  await app.locator('#mnGo').click();
  const geometry = await app.locator('#mnGrid').evaluate(el => ({
    gridBottom: el.getBoundingClientRect().bottom,
    railTop: document.querySelector('#panel-mines > .rail').getBoundingClientRect().top
  }));
  expect(geometry.gridBottom).toBeLessThanOrEqual(geometry.railTop);
});
