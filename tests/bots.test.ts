import { describe, it, expect } from 'vitest';
import {
  addPlayer,
  applyAction,
  createGame,
  newPlayer,
  setConnected,
  viewFor,
} from '../shared/engine';
import { botAction } from '../server/bots';

describe('practice bots', () => {
  it('restricts bot creation to the host, lobby, and eight seats', () => {
    let game = addPlayer(createGame('TEST22', newPlayer('human', 'Human', 0)), 'friend', 'Friend');
    expect(() => applyAction(game, 'friend', { type: 'add-bot' })).toThrow('Only the host');
    for (let i = 0; i < 6; i++) game = applyAction(game, 'human', { type: 'add-bot' });
    expect(game.players.filter((p) => p.isBot).every((p) => p.ready)).toBe(true);
    expect(() => applyAction(game, 'human', { type: 'add-bot' })).toThrow('full');
    game = applyAction(game, 'human', { type: 'ready', ready: true });
    game = applyAction(game, 'friend', { type: 'ready', ready: true });
    game = applyAction(game, 'human', { type: 'start' });
    expect(() => applyAction(game, 'human', { type: 'add-bot' })).toThrow('already started');
    game = setConnected(game, 'human', false);
    expect(game.hostId).toBe('friend');
  });

  it('completes matches, including a solo spectator, and readies bots for rematches', () => {
    for (let seed = 1; seed <= 12; seed++) {
      let state = seed;
      const random = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
      let game = createGame('TEST22', newPlayer('human', 'Human', 0));
      for (let i = 0; i < 3; i++) game = applyAction(game, 'human', { type: 'add-bot' });
      game = applyAction(game, 'human', { type: 'ready', ready: true });
      game = applyAction(game, 'human', { type: 'start' }, random);
      for (let step = 0; step < 5000 && game.phase !== 'finished'; step++) {
        if (game.phase === 'results') {
          game = applyAction(game, 'human', { type: 'next' }, random);
          continue;
        }
        const actor = game.players.find((p) => botAction(viewFor(game, p.id)));
        expect(actor).toBeDefined();
        game = applyAction(game, actor!.id, botAction(viewFor(game, actor!.id))!, random);
      }
      expect(game.phase).toBe('finished');
      game = applyAction(game, 'human', { type: 'rematch' });
      expect(game.players.filter((p) => p.isBot).every((p) => p.ready)).toBe(true);
      expect(game.players[0].ready).toBe(false);
    }
  });

  it('handles ordered blind calls without seeing its own card', () => {
    let game = createGame('TEST22', newPlayer('human', 'Human', 0));
    for (let i = 0; i < 3; i++) game = applyAction(game, 'human', { type: 'add-bot' });
    game = applyAction(game, 'human', { type: 'ready', ready: true });
    game = applyAction(game, 'human', { type: 'start' });
    game.phase = 'blind';
    game.count = 1;
    for (const p of game.players) game.hands[p.id] = [game.hands[p.id][0]];
    game.starterSeat = 1;
    const view = viewFor(game, 'bot-1');
    expect(view.players.find((p) => p.id === 'bot-1')!.cards).toEqual([]);
    expect(botAction(view)?.type).toBe('predict');
    while (game.phase === 'blind' || game.phase === 'special') {
      const actor = game.players.find((p) => botAction(viewFor(game, p.id)));
      expect(actor).toBeDefined();
      game = applyAction(game, actor!.id, botAction(viewFor(game, actor!.id))!);
    }
    expect(game.phase).toBe('results');
  });
});
