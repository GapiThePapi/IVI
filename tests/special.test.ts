import { describe, expect, it } from 'vitest';
import {
  addPlayer,
  applyAction,
  createGame,
  makeDeck,
  newPlayer,
  removePlayer,
  setConnected,
  turn,
  viewFor,
} from '../shared/engine';
import { botAction } from '../server/bots';
import type { Game, Difficulty } from '../shared/types';
const special = makeDeck().find((c) => c.kind === 'special')!;
function fixture(blind = false): Game {
  let g = createGame('SPEC22', newPlayer('p0', 'You', 0));
  for (let i = 1; i < 4; i++) g = addPlayer(g, 'p' + i, 'Player ' + i);
  g.phase = blind ? 'blind' : 'playing';
  g.count = 1;
  g.round = blind ? 5 : 1;
  g.hands = {
    p0: [special],
    p1: [{ id: '4-10', level: 4, number: 10 }],
    p2: [{ id: '2-4', level: 2, number: 4 }],
    p3: [{ id: '1-2', level: 1, number: 2 }],
  };
  g.wins = { p0: 0, p1: 0, p2: 0, p3: 0 };
  g.bids = { p0: 1, p1: 1, p2: 0, p3: 0 };
  // Normal-round scoring is distinguished by count, so use a two-fight final trick.
  if (!blind) {
    g.count = 2;
    g.fights = [{ number: 1, plays: [], winnerId: 'p2', winnerName: 'Player 2' }];
    g.wins.p2 = 1;
  }
  return g;
}
function playAll(g: Game) {
  while (g.phase === 'playing') {
    const id = turn(g)!;
    g = applyAction(g, id, { type: 'play', cardId: g.hands[id][0].id });
  }
  return g;
}
describe('special card', () => {
  it('Hard saves its guaranteed highest card and chooses to lose the special to hit a call of one', () => {
    let g = fixture();
    g.fights = [];
    g.players.forEach((p, i) => {
      g.hands[p.id].push(
        i === 0
          ? { id: '4-10', level: 4, number: 10 }
          : { id: `1-${i + 4}`, level: 1, number: i + 4 },
      );
    });
    g.hands.p1[0] = { id: '3-10', level: 3, number: 10 };
    g = playAll(g);
    expect(botAction(viewFor(g, 'p0'), 'hard', () => 0.5)).toEqual({
      type: 'choose-special',
      win: false,
    });
  });
  it('adds exactly one extra card', () => {
    expect(makeDeck()).toHaveLength(41);
    expect(makeDeck().filter((c) => c.kind === 'special')).toHaveLength(1);
  });
  it.each([true, false])('waits for all cards and awards the requested outcome: %s', (win) => {
    let g = fixture();
    expect(() => applyAction(g, 'p0', { type: 'choose-special', win })).toThrow();
    g = playAll(g);
    expect(g.phase).toBe('special');
    expect(g.fights).toHaveLength(1);
    expect(turn(g)).toBe('p0');
    expect(() => applyAction(g, 'p1', { type: 'choose-special', win })).toThrow();
    g = applyAction(g, 'p0', { type: 'choose-special', win });
    expect(g.fights.at(-1)?.winnerId).toBe(win ? 'p0' : 'p1');
    expect(g.fights.at(-1)?.specialChoice).toBe(win);
    expect(g.results.find((r) => r.playerId === 'p0')?.loss).toBe(win ? 0 : 1);
    expect(() => applyAction(g, 'p0', { type: 'choose-special', win })).toThrow();
  });
  it('keeps blind cards hidden, publishes calls in order, then reveals before the decision', () => {
    let g = fixture(true);
    expect(viewFor(g, 'p0').players[0].cards).toEqual([]);
    expect(() => applyAction(g, 'p1', { type: 'predict', win: false })).toThrow();
    g = applyAction(g, 'p0', { type: 'predict', win: false });
    expect(viewFor(g, 'p1').players[0].blindPrediction).toBe(false);
    while (g.phase === 'blind') g = applyAction(g, turn(g)!, { type: 'predict', win: false });
    expect(g.phase).toBe('special');
    expect(viewFor(g, 'p0').players[0].cards[0].kind).toBe('special');
    g = applyAction(g, 'p0', { type: 'choose-special', win: true });
    expect(g.results.find((r) => r.playerId === 'p0')?.loss).toBe(1);
  });
  it('retains pending choices across disconnect and resolves when their holder leaves', () => {
    let g = playAll(fixture());
    g = setConnected(g, 'p0', false);
    expect(g.phase).toBe('special');
    expect(g.specialOwnerId).toBe('p0');
    expect(() => applyAction(g, 'p0', { type: 'choose-special', win: true })).toThrow();
    g = setConnected(g, 'p0', true);
    expect(turn(g)).toBe('p0');
    g = removePlayer(g, 'p0');
    expect(g.phase).toBe('results');
    expect(g.fights.at(-1)?.winnerId).toBe('p1');
  });
  it.each(['easy', 'medium', 'hard'] as Difficulty[])(
    '%s can match its blind prediction with the special',
    (difficulty) => {
      let g = fixture(true);
      while (g.phase === 'blind') g = applyAction(g, turn(g)!, { type: 'predict', win: false });
      expect(botAction(viewFor(g, 'p0'), difficulty, () => 0.5)).toEqual({
        type: 'choose-special',
        win: false,
      });
    },
  );
  it('Hard wins when needed and loses after meeting its call', () => {
    let g = playAll(fixture());
    expect(botAction(viewFor(g, 'p0'), 'hard', () => 0.5)).toEqual({
      type: 'choose-special',
      win: true,
    });
    g.bids.p0 = 0;
    expect(botAction(viewFor(g, 'p0'), 'hard', () => 0.5)).toEqual({
      type: 'choose-special',
      win: false,
    });
  });
});
