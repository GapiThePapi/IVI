import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import type { GameView } from '../../shared/types';

interface Seat {
  page: Page;
  context: BrowserContext;
  view?: GameView;
  errors: string[];
}
async function openSeat(browser: Browser, index: number): Promise<Seat> {
  const context = await browser.newContext({
    viewport: index === 0 ? { width: 1440, height: 1000 } : { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const seat: Seat = { page, context, errors: [] };
  page.on('pageerror', (error) => seat.errors.push(error.message));
  page.on('websocket', (ws) =>
    ws.on('framereceived', ({ payload }) => {
      if (typeof payload !== 'string' || !payload.startsWith('42')) return;
      try {
        const [event, value] = JSON.parse(payload.slice(2));
        if (event === 'state') seat.view = value;
      } catch {
        /* Engine.IO control frame. */
      }
    }),
  );
  await page.goto('/');
  return seat;
}
async function createProfile(page: Page, name: string) {
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('button', { name: 'Edit profile' })).toContainText(name);
}
async function createTable(browser: Browser, count: number): Promise<Seat[]> {
  const seats = [await openSeat(browser, 0)];
  await createProfile(seats[0].page, 'Alex');
  await seats[0].page.getByRole('button', { name: 'Create a lobby', exact: true }).click();
  await seats[0].page.getByRole('button', { name: 'Create lobby', exact: true }).click();
  await expect(seats[0].page.locator('.lobby')).toBeVisible();
  const code = (await seats[0].page.locator('.code-copy').innerText()).trim();
  for (let i = 1; i < count; i++) {
    const seat = await openSeat(browser, i);
    seats.push(seat);
    await createProfile(seat.page, ['Alex', 'Maya', 'Luka', 'Nina', 'Sam', 'Theo', 'Eva', 'Kai'][i]);
    await seat.page.getByRole('button', { name: 'Join a lobby', exact: true }).click();
    await seat.page.getByLabel('Lobby code', { exact: true }).fill(code);
    await seat.page.getByRole('button', { name: 'Join lobby', exact: true }).click();
    await expect(seat.page.locator('.lobby')).toBeVisible();
  }
  for (const seat of seats)
    await seat.page.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await expect(seats[0].page.getByRole('button', { name: 'Deal the cards' })).toBeEnabled();
  return seats;
}
async function start(seats: Seat[]) {
  await seats[0].page.getByRole('button', { name: 'Deal the cards' }).click();
  await expect.poll(() => seats.every((s) => s.view?.phase === 'bidding')).toBe(true);
  await expect(seats[0].page.locator('.poker-seat .call-count').first()).toContainText('? / 0');
  await expect(seats[0].page.locator('.poker-seat .call-count small')).toHaveCount(0);
  await expect(
    seats[0].page.locator('.poker-seat .seat-name b').filter({ hasText: '· you' }),
  ).toHaveCount(0);
}
async function callBids(seats: Seat[]) {
  while (seats[0].view?.phase === 'bidding') {
    const current = seats.find((s) => s.view?.youId === seats[0].view!.turnId)!;
    const revision = current.view!.revision;
    const value = current.view!.forbiddenBid === 0 ? 1 : 0;
    await current.page.getByRole('button', { name: `Predict ${value} wins`, exact: true }).click();
    await current.page.getByRole('button', { name: 'Lock prediction', exact: true }).click();
    await expect.poll(() => seats[0].view!.revision).toBeGreaterThan(revision);
  }
}
async function playRound(seats: Seat[]) {
  await callBids(seats);
  while (seats[0].view?.phase === 'playing' || seats[0].view?.phase === 'special') {
    if (seats[0].view?.phase === 'special') {
      const owner = seats.find((s) => s.view?.youId === seats[0].view!.turnId)!;
      const rev = owner.view!.revision;
      await owner.page.getByRole('button', { name: 'Win', exact: true }).click();
      await expect.poll(() => seats[0].view!.revision).toBeGreaterThan(rev);
      continue;
    }
    const current = seats.find((s) => s.view?.youId === seats[0].view!.turnId)!;
    const revision = current.view!.revision;
    await current.page.locator('.hand-card:enabled').first().press('Enter');
    await expect.poll(() => seats[0].view!.revision).toBeGreaterThan(revision);
  }
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function fitsViewportWidth(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await noOverflow(page);
  await expect(page.locator('.poker-table')).toBeVisible();
  await expect(page.locator('.hand-panel')).toBeVisible();
}

test('landing, mobile layout, keyboard rules dialog, and LAN-safe request IDs', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play solo' })).toBeVisible();
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true });
  await noOverflow(page);
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/landing-mobile.png', fullPage: true });
  await noOverflow(page);
  await page.evaluate(() => {
    Object.defineProperty(window.crypto, 'randomUUID', { value: undefined, configurable: true });
  });
  await createProfile(page, 'LAN friend');
  await page.getByRole('button', { name: 'Create a lobby', exact: true }).click();
  await page.getByRole('button', { name: 'Create lobby', exact: true }).click();
  await expect(page.locator('.lobby')).toBeVisible();
  await page.screenshot({ path: 'test-results/lobby-mobile.png', fullPage: true });
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('legacy profile data migrates to the IVI profile without being lost', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'decki-profile',
      JSON.stringify({ name: 'Returning player', avatar: 'preset:2' }),
    );
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Edit profile' })).toContainText('Returning player');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ivi-profile') ?? 'null'))).toEqual({
    name: 'Returning player',
    avatar: 'preset:2',
  });
});

test('four friends complete a round, restore a seat, and continue to four cards', async ({
  browser,
}) => {
  const seats = await createTable(browser, 4);
  try {
    await seats[0].page.getByLabel('Starting lives').selectOption('15');
    await expect(seats[1].page.getByText('Starting lives: 15')).toBeVisible();
    await seats[0].page.screenshot({ path: 'test-results/lobby-desktop.png', fullPage: true });
    await start(seats);
    expect(seats.every((seat) => seat.view!.players.every((player) => player.hp === 15))).toBe(true);
    await expect(seats[1].page.getByRole('button', { name: 'Table menu' })).toBeVisible();
    await seats[1].page.getByRole('button', { name: 'Table menu' }).click();
    await expect(
      seats[1].page.getByRole('dialog').getByRole('button', { name: 'Settings', exact: true }),
    ).toBeVisible();
    await expect(seats[1].page.getByText('Host controls')).toHaveCount(0);
    await seats[1].page.getByRole('button', { name: 'Close dialog' }).click();
    for (const seat of seats)
      expect(seat.view!.players.find((p) => p.id === seat.view!.youId)!.cards).toHaveLength(5);
    await seats[0].page.screenshot({ path: 'test-results/table-desktop.png', fullPage: true });
    await seats[1].page.screenshot({ path: 'test-results/table-mobile.png', fullPage: true });
    await noOverflow(seats[1].page);
    const hand = seats[1].view!.players.find((p) => p.id === seats[1].view!.youId)!.cards;
    await seats[1].page.reload();
    await expect(seats[1].page.locator('.hand-card')).toHaveCount(5);
    expect(seats[1].view!.players.find((p) => p.id === seats[1].view!.youId)!.cards).toEqual(hand);
    await playRound(seats);
    await expect(seats[0].page.locator('.score-table tbody tr')).toHaveCount(4);
    expect(seats[0].view!.results.reduce((sum, r) => sum + r.loss, 0)).toBe(5);
    await seats[0].page.screenshot({ path: 'test-results/results-desktop.png', fullPage: true });
    const host = seats.find((s) => s.view!.youId === seats[0].view!.hostId)!;
    await host.page.getByRole('button', { name: 'Next round · 4 cards' }).click();
    await expect.poll(() => seats[0].view!.round).toBe(2);
    await expect(seats[1].page.locator('.hand-card')).toHaveCount(4);
    expect(seats.flatMap((s) => s.errors)).toEqual([]);
  } finally {
    await Promise.all(seats.map((seat) => seat.context.close()));
  }
});

test('eight-player table reaches the blind round and reveals every card together', async ({
  browser,
}) => {
  test.setTimeout(180000);
  const seats = await createTable(browser, 8);
  try {
    await start(seats);
    await seats[0].page.screenshot({ path: 'test-results/eight-desktop.png', fullPage: true });
    await seats[1].page.screenshot({ path: 'test-results/eight-mobile.png', fullPage: true });
    await noOverflow(seats[1].page);
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 360, height: 800 },
      { width: 412, height: 915 },
      { width: 667, height: 375 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
    ]) {
      await fitsViewportWidth(seats[1].page, viewport.width, viewport.height);
    }
    await seats[1].page.setViewportSize({ width: 320, height: 740 });
    await seats[1].page.screenshot({ path: 'test-results/eight-small-phone.png', fullPage: true });
    await seats[1].page.setViewportSize({ width: 390, height: 844 });
    for (let round = 1; round <= 4; round++) {
      await playRound(seats);
      expect(seats[0].view!.phase).toBe('results');
      const host = seats.find((s) => s.view!.youId === seats[0].view!.hostId)!;
      await host.page.getByRole('button', { name: /Next round/ }).click();
      await expect.poll(() => seats[0].view!.round).toBe(round + 1);
    }
    expect(seats[0].view!.phase).toBe('blind');
    const playing = seats.filter(
      (s) => !s.view!.players.find((p) => p.id === s.view!.youId)!.eliminated,
    );
    const example = playing[0];
    expect(example.view!.players.find((p) => p.id === example.view!.youId)!.cards).toEqual([]);
    await example.page.screenshot({ path: 'test-results/blind-desktop.png', fullPage: true });
    const mobile = playing.find((s) => s !== seats[0])!;
    await mobile.page.screenshot({ path: 'test-results/blind-mobile.png', fullPage: true });
    await noOverflow(mobile.page);
    while (seats[0].view!.phase === 'blind') {
      const seat = playing.find((s) => s.view!.youId === seats[0].view!.turnId)!;
      const revision = seat.view!.revision;
      await seat.page.getByRole('button', { name: 'I lose', exact: true }).click();
      await seat.page.getByRole('button', { name: 'Lock call', exact: true }).click();
      await expect.poll(() => seats[0].view!.revision).toBeGreaterThan(revision);
      expect(seats[0].view!.players.find((p) => p.id === seat.view!.youId)!.blindPrediction).toBe(
        false,
      );
    }
    if (seats[0].view!.phase === 'special') {
      const owner = playing.find((s) => s.view!.youId === seats[0].view!.turnId)!;
      await owner.page.getByRole('button', { name: 'Lose', exact: true }).click();
    }
    await expect.poll(() => seats[0].view!.phase).toBe('results');
    expect(seats[0].view!.revealed).toHaveLength(playing.length);
    await seats[0].page.screenshot({ path: 'test-results/blind-results.png', fullPage: true });
    expect(seats.flatMap((s) => s.errors)).toEqual([]);
  } finally {
    await Promise.all(seats.map((seat) => seat.context.close()));
  }
});

test('an absent turn waits, host transfers, and removing that seat continues play', async ({
  browser,
}) => {
  const seats = await createTable(browser, 4);
  try {
    await start(seats);
    // Disconnect the current bidder, then check that no automatic bid appears.
    const absent = seats.find((s) => s.view!.youId === seats[0].view!.turnId)!;
    const observer = seats.find((s) => s !== absent)!;
    const absentId = absent.view!.youId;
    await absent.context.setOffline(true);
    await expect
      .poll(() => observer.view!.players.find((p) => p.id === absentId)!.connected, {
        timeout: 55000,
      })
      .toBe(false);
    expect(observer.view!.turnId).toBe(absentId);
    expect(observer.view!.players.find((p) => p.id === absentId)!.bid).toBeNull();
    const host = seats.find((s) => s.view!.youId === observer.view!.hostId)!;
    await host.page.getByRole('button', { name: 'Table menu', exact: true }).click();
    await host.page
      .getByRole('button', {
        name: `Remove ${observer.view!.players.find((p) => p.id === absentId)!.name}`,
      })
      .click();
    await host.page.getByRole('button', { name: 'Remove player', exact: true }).click();
    await expect.poll(() => observer.view!.players.length).toBe(3);
    expect(observer.view!.turnId).not.toBe(absentId);
    await host.page.getByRole('button', { name: 'Table menu', exact: true }).click();
    await host.page.getByRole('button', { name: 'End match', exact: true }).click();
    await host.page
      .getByRole('dialog')
      .getByRole('button', { name: 'End match', exact: true })
      .click();
    await expect(host.page.locator('.lobby')).toBeVisible();
  } finally {
    await Promise.all(seats.map((seat) => seat.context.close()));
  }
});

test('last-survivor screen offers a clean rematch lobby', async ({ browser }) => {
  const seats = await createTable(browser, 4);
  try {
    await start(seats);
    for (const name of ['Maya', 'Luka', 'Nina']) {
      await seats[0].page.getByRole('button', { name: 'Table menu', exact: true }).click();
      await seats[0].page.getByRole('button', { name: `Remove ${name}`, exact: true }).click();
      await seats[0].page.getByRole('button', { name: 'Remove player', exact: true }).click();
      await expect(seats[0].page.getByRole('dialog')).toHaveCount(0);
    }
    await expect(
      seats[0].page.getByRole('heading', { name: 'Alex takes the table.' }),
    ).toBeVisible();
    await seats[0].page.screenshot({ path: 'test-results/winner-desktop.png', fullPage: true });
    await seats[0].page.getByRole('button', { name: 'Play again', exact: true }).click();
    await expect(seats[0].page.locator('.lobby')).toBeVisible();
    expect(seats[0].view!.players[0].hp).toBe(10);
    expect(seats[0].view!.players[0].ready).toBe(false);
  } finally {
    await Promise.all(seats.map((seat) => seat.context.close()));
  }
});
