import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('decki-profile', JSON.stringify({ name: 'Alex', avatar: 'preset:0' }));
  });
});

test('creates an online lobby from the built client', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a lobby', exact: true }).click();
  await page.getByRole('button', { name: 'Create lobby', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Copy lobby code [A-Z2-9]{6}$/ })).toBeVisible();
});

test('failed connections stop showing an endless connecting message', async ({ page }) => {
  await page.routeWebSocket('**/socket.io/**', (ws) => ws.close());
  await page.route('**/socket.io/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a lobby', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Could not connect', { timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Retry connection' })).toBeVisible();
});

for (const mode of ['bundled', 'constructor failure', 'worker error']) {
  test(`solo bots finish predictions offline with ${mode}`, async ({ page, context }) => {
    if (mode !== 'bundled')
      await page.addInitScript((failure) => {
        window.Worker = class {
          onerror?: () => void;
          constructor() {
            if (failure === 'constructor failure') throw new Error('Worker unavailable');
            setTimeout(() => this.onerror?.(), 10);
          }
          postMessage() {}
          terminate() {}
        } as unknown as typeof Worker;
      }, mode);
    await page.goto('/');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Play solo', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const bid = page.getByRole('button', { name: /^Predict \d wins$/ }).first();
    await expect(bid).toBeEnabled({ timeout: 15000 });
    await bid.click();
    await page.getByRole('button', { name: 'Lock prediction', exact: true }).click();
    await expect(page.getByText('Swipe a card up to play', { exact: false })).toBeVisible({
      timeout: 15000,
    });
  });
}
