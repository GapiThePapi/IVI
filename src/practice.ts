import { applyAction, createGame, newPlayer, viewFor } from '../shared/engine';
import { botAction } from '../server/bots';
import type { Difficulty, Game } from '../shared/types';

export const PRACTICE_PLAYER = 'practice-player';
export function createPractice(name: string, difficulty: Difficulty = 'medium'): Game {
  let game = createGame('SOLO', newPlayer(PRACTICE_PLAYER, name.trim().slice(0, 20) || 'You', 0));
  for (let i = 0; i < 3; i++)
    game = applyAction(game, PRACTICE_PLAYER, { type: 'add-bot', difficulty });
  game = applyAction(game, PRACTICE_PLAYER, { type: 'ready', ready: true });
  return applyAction(game, PRACTICE_PLAYER, { type: 'start' });
}

export function advancePracticeBot(game: Game): Game {
  for (const player of game.players.filter((p) => p.isBot)) {
    const action = botAction(viewFor(game, player.id));
    if (action) return applyAction(game, player.id, action);
  }
  return game;
}
