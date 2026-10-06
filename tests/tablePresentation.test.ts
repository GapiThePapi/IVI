import { describe, expect, it } from 'vitest';
import { callStatus, fightOrder, isThrow, tableSeats } from '../src/tablePresentation';
import { createPractice, PRACTICE_PLAYER } from '../src/practice';
import { viewFor } from '../shared/engine';

describe('table presentation', () => {
  it('uses green only for exact calls and orange only for partial progress', () => {
    expect(callStatus(0, 0)).toBe('exact');
    expect(callStatus(2, 2)).toBe('exact');
    expect(callStatus(1, 2)).toBe('progress');
    expect(callStatus(0, 2)).toBe('neutral');
    expect(callStatus(3, 2)).toBe('neutral');
    expect(callStatus(0, null)).toBe('neutral');
  });
  it('requires a deliberate upward gesture, ignoring taps and sideways movement', () => {
    expect(isThrow(0, 0)).toBe(false);
    expect(isThrow(0, -30)).toBe(false);
    expect(isThrow(0, 80)).toBe(false);
    expect(isThrow(100, -60)).toBe(false);
    expect(isThrow(10, -70)).toBe(true);
  });
  it('orders seats from the current fight leader, retaining the human slot', () => {
    const view = viewFor(createPractice('You'), PRACTICE_PLAYER);
    view.starterId = view.players[2].id;
    expect(fightOrder(view).map((p) => p.seat)).toEqual([2, 3, 0, 1]);
    view.trick = [
      { playerId: view.players[3].id, name: 'Bot 3', card: { id: '1-1', level: 1, number: 1 } },
    ];
    expect(fightOrder(view).map((p) => p.seat)).toEqual([3, 0, 1, 2]);
    expect(fightOrder(view).some((p) => p.id === PRACTICE_PLAYER)).toBe(true);
  });
});

it('keeps seats fixed when leaders change or players are eliminated', () => {
  const game = viewFor(createPractice('You'), PRACTICE_PLAYER);
  game.youId = game.players[2].id;
  const before = tableSeats(game);
  expect(before[0].player.id).toBe(game.youId);
  expect(before[0].x).toBe(50);
  expect(before[0].y).toBe(85);
  game.starterId = game.players[1].id;
  game.turnId = game.players[3].id;
  game.players[0].eliminated = true;
  expect(tableSeats(game).map(({ player, x, y }) => [player.id, x, y])).toEqual(
    before.map(({ player, x, y }) => [player.id, x, y]),
  );
});
