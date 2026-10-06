import { describe, it, expect } from 'vitest';
import { createGame, newPlayer, applyAction, viewFor } from '../shared/engine';
import { BOT_NAMES, lobbyName } from '../shared/names';
describe('player identity', () => {
  it('draws seven unique approved bot names and avoids human names', () => {
    let game = createGame('ABC234', newPlayer('human', BOT_NAMES[0], 0));
    for (let i = 0; i < 7; i++) game = applyAction(game, 'human', { type: 'add-bot' }, () => 0);
    expect(new Set(game.players.map((p) => p.name)).size).toBe(8);
    expect(game.players.slice(1).every((p) => BOT_NAMES.includes(p.name))).toBe(true);
  });
  it('updates only the actor profile and exposes avatars in table views', () => {
    let game = createGame('ABC234', newPlayer('human', 'Alex', 0));
    game = applyAction(game, 'human', { type: 'add-bot' }, () => 0);
    const bot = game.players[1];
    expect(() =>
      applyAction(game, 'human', { type: 'profile', name: bot.name, avatar: 'preset:2' }),
    ).toThrow();
    const updated = applyAction(game, 'human', {
      type: 'profile',
      name: 'Sam',
      avatar: 'preset:2',
    });
    expect(viewFor(updated, 'human').players[0].avatar).toBe('preset:2');
    expect(updated.players[1]).toEqual(bot);
    expect(game.players[0].name).toBe('Alex');
  });
  it('gives each code a stable display name', () => {
    expect(lobbyName('ABC234')).toBe(lobbyName('ABC234'));
    expect(lobbyName('ABC234').length).toBeGreaterThan(3);
  });
});
