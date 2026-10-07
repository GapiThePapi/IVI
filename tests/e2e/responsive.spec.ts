import { expect, test, type Page } from '@playwright/test';

const viewports = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'large-phone', width: 412, height: 915 },
  { name: 'short-landscape', width: 667, height: 375 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
}

test('entry and settings reflow across supported viewport classes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play solo' })).toBeVisible();

  for (const viewport of viewports) {
    await test.step(viewport.name, async () => {
      await page.setViewportSize(viewport);
      await expectNoHorizontalOverflow(page);
      await expect(page.locator('.entry-home')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Play solo' })).toBeVisible();
    });
  }

  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS('overflow-y', 'auto');
  await expectNoHorizontalOverflow(page);
});

test('appearance selection persists between visits', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Light Warm white/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: /Light Warm white/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('player display selection persists between visits', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-player-display', 'rail');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /Offset stack Structured square tiles/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-player-display', 'stack');
  await expect(
    page.getByRole('button', { name: /Offset stack Structured square tiles/ }),
  ).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-player-display', 'stack');
});
