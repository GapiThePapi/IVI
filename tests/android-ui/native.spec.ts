import { test, expect, type Page } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';
import { randomUUID } from 'node:crypto';
import type { Command, GameView, Reply } from '../../shared/types';

interface Friend {
  socket: Socket;
  view?: GameView;
}
async function send(friend: Friend, command: Command) {
  const reply: Reply = await friend.socket.timeout(5000).emitWithAck('command', {
    requestId: randomUUID(),
    command,
    round: friend.view?.round,
    revision: friend.view?.revision,
  });
  expect(reply.ok).toBe(true);
}
async function join(code: string, name: string): Promise<Friend> {
  const socket = io('http://127.0.0.1:3001', {
    auth: { protocolVersion: 3 },
    transports: ['websocket'],
    forceNew: true,
  });
  const friend: Friend = { socket };
  socket.on('state', (view) => {
    friend.view = view;
  });
  await new Promise<void>((resolve) => socket.once('connect', resolve));
  await send(friend, { type: 'join', name, code });
  await send(friend, { type: 'ready', ready: true });
  return friend;
}
async function create(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Your name').fill('Alex');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByRole('button', { name: 'Create a lobby', exact: true }).click();
  await page.getByRole('button', { name: 'Create lobby', exact: true }).click();
  await expect(page.locator('.lobby')).toBeVisible();
  return (await page.locator('.code-copy').innerText()).trim();
}
async function leave(page: Page) {
  await page.locator('.site-header').getByRole('button', { name: 'Leave table', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Leave table', exact: true }).click();
  await expect(page.locator('.entry-home')).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('Android home has large actions, joining controls, and a readable compact layout', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('.entry-home')).toBeVisible();
  await page.screenshot({ path: 'test-results/android-home.png', fullPage: true });
  await noOverflow(page);
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Your name').fill('Android player');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByRole('button', { name: 'Join a lobby', exact: true }).click();
  await expect(page.getByLabel('Lobby code')).toBeVisible();
  await page.getByLabel('Lobby code').fill('abc234');
  await expect(page.getByLabel('Lobby code')).toHaveValue('ABC234');
  await page.screenshot({ path: 'test-results/android-join.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 640 });
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('Android offers a newer IVI release on opening', async ({ page }) => {
  await page.route('https://raw.githubusercontent.com/GapiThePapi/IVI/main/public/ivi-update.json**',
    (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        version: '1.0.5',
        downloadUrl: 'https://example.com/IVI-Android.apk',
        notes: 'A tested update.',
      }),
    }),
  );
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'IVI update available' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Version 1.0.5 is ready');
  await expect(dialog.getByRole('link', { name: 'Download update' })).toHaveAttribute(
    'href',
    'https://example.com/IVI-Android.apk',
  );
  await dialog.getByRole('button', { name: 'Later' }).click();
  await expect(dialog).toBeHidden();
});

test('Android remembers the seat after closing and reopening the app view', async ({
  page,
  context,
}) => {
  const code = await create(page);
  expect(await page.evaluate(() => Boolean(localStorage.getItem('ivi-seat')))).toBe(true);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.locator('.code-copy')).toContainText(code);
  await expect(reopened.locator('.roster-name').first()).toContainText('Alex');
  await leave(reopened);
  expect(await reopened.evaluate(() => localStorage.getItem('ivi-seat'))).toBeNull();
});

test('eight-player Android table keeps the hand and legal action visible, with reachable host controls', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const code = await create(page),
    friends: Friend[] = [];
  try {
    for (const name of ['Maya', 'Luka', 'Nina', 'Sam', 'Theo', 'Eva', 'Kai'])
      friends.push(await join(code, name));
    await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
    await page.getByRole('button', { name: 'Deal the cards' }).click();
    await expect(page.locator('.hand-card')).toHaveCount(5);
    await page.screenshot({ path: 'test-results/android-eight-table.png', fullPage: true });
    await noOverflow(page);
    const hand = await page.locator('.hand-panel').boundingBox();
    expect(hand!.y + hand!.height).toBeLessThanOrEqual(781);
    while (friends[0].view?.phase === 'bidding') {
      const view = friends[0].view!;
      const current = friends.find((f) => f.view!.youId === view.turnId);
      const value = view.forbiddenBid === 0 ? 1 : 0;
      if (current) {
        await expect.poll(() => current.view!.revision).toBeGreaterThanOrEqual(view.revision);
        await send(current, { type: 'bid', value });
      }
      else {
        await page.getByRole('button', { name: `Predict ${value} wins`, exact: true }).click();
        await page.screenshot({ path: 'test-results/android-your-call.png', fullPage: true });
        await page.getByRole('button', { name: 'Lock prediction', exact: true }).click();
      }
      await expect.poll(() => friends[0].view!.revision).toBeGreaterThan(view.revision);
    }
    for (let i = 0; i < 8; i++) {
      const view = friends[0].view!;
      const current = friends.find((f) => f.view!.youId === view.turnId);
      if (current) {
        await expect.poll(() => current.view!.revision).toBeGreaterThanOrEqual(view.revision);
        await send(current, {
          type: 'play',
          cardId: current.view!.players.find((p) => p.id === current.view!.youId)!.cards[0].id,
        });
      } else {
        const button = page.locator('.hand-card:enabled').first();
        const bounds = await button.boundingBox();
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(781);
        await page.screenshot({ path: 'test-results/android-play.png', fullPage: true });
        await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y - 65, { steps: 8 });
        await page.mouse.up();
      }
      await expect.poll(() => friends[0].view!.revision).toBeGreaterThan(view.revision);
    }
    await page.getByRole('button', { name: 'Table menu', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: /^Remove / })).toHaveCount(7);
    await page.screenshot({ path: 'test-results/android-table-options.png', fullPage: true });
    await page.getByRole('button', { name: 'Close dialog' }).click();
    expect(errors).toEqual([]);
    await leave(page);
  } finally {
    for (const friend of friends) {
      try {
        await send(friend, { type: 'leave' });
      } catch {
        /* Cleanup a removed seat. */
      }
      friend.socket.disconnect();
    }
  }
});
