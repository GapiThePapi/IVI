import { describe, expect, it } from 'vitest';
import { advancePracticeBot, createPractice, PRACTICE_PLAYER } from '../src/practice';
import { applyAction, viewFor } from '../shared/engine';
import { botAction } from '../server/bots';

describe('offline practice', () => {
  it('plays a complete match without a socket or server', () => {
    let game = createPractice('Offline player');
    expect(game.players).toHaveLength(4);
    expect(game.players.filter((p) => p.isBot)).toHaveLength(3);
    expect(game.phase).toBe('bidding');
    for (let step = 0; step < 5000 && game.phase !== 'finished'; step++) {
      if (game.phase === 'results') {
        game = applyAction(game, PRACTICE_PLAYER, { type: 'next' });
        continue;
      }
      const next = advancePracticeBot(game);
      if (next !== game) {
        game = next;
        continue;
      }
      const move = botAction(viewFor(game, PRACTICE_PLAYER));
      expect(move).not.toBeNull();
      game = applyAction(game, PRACTICE_PLAYER, move!);
    }
    expect(game.phase).toBe('finished');
    expect(game.winnerId).toBeTruthy();
    game = applyAction(game, PRACTICE_PLAYER, { type: 'rematch' });
    expect(game.phase).toBe('lobby');
    expect(game.players.filter((p) => p.isBot).every((p) => p.ready)).toBe(true);
  });
  it('waits for the human turn and supports an empty nickname', () => {
    let game = createPractice('');
    expect(game.players[0].name).toBe('You');
    while (viewFor(game, PRACTICE_PLAYER).turnId !== PRACTICE_PLAYER) {
      game = advancePracticeBot(game);
    }
    expect(advancePracticeBot(game)).toBe(game);
  });
});
