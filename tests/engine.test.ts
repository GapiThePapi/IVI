import { describe, expect, it } from 'vitest';
import {
  active,
  addPlayer,
  applyAction,
  createGame,
  forbiddenBid,
  makeDeck,
  newPlayer,
  removePlayer,
  setConnected,
  shuffle,
  strength,
  turn,
  viewFor,
} from '../shared/engine';
import type { Card, Game } from '../shared/types';

function random(seed = 1) {
  let n = seed;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function fixture(count = 4, seed = 1) {
  let g = createGame('ABC234', newPlayer('p0', 'Player 0', 0));
  for (let i = 1; i < count; i++) g = addPlayer(g, `p${i}`, `Player ${i}`);
  for (const p of g.players) g = applyAction(g, p.id, { type: 'ready', ready: true });
  return applyAction(g, g.hostId, { type: 'start' }, random(seed));
}
function bidAll(game: Game, value = 0) {
  let g = game;
  while (g.phase === 'bidding')
    g = applyAction(g, turn(g)!, {
      type: 'bid',
      value: forbiddenBid(g) === value ? (value + 1) % (g.count + 1) : value,
    });
  return g;
}
function playRound(game: Game) {
  let g = bidAll(game);
  while (g.phase === 'playing' || g.phase === 'special') {
    if (g.phase === 'special') {
      g = applyAction(g, turn(g)!, { type: 'choose-special', win: true });
      continue;
    }
    const id = turn(g)!;
    g = applyAction(g, id, { type: 'play', cardId: g.hands[id][0].id });
  }
  return g;
}
function blindFixture(count = 4): Game {
  const g = fixture(count);
  g.phase = 'blind';
  g.round = 5;
  g.count = 1;
  g.hands = Object.fromEntries(g.players.map((p, i) => [p.id, [makeDeck()[i * 10]]]));
  return g;
}
function blindCalls(g: Game, values: boolean[]): Game {
  for (const [i, p] of [...g.players].entries())
    g = applyAction(g, p.id, { type: 'predict', win: values[i] });
  return g;
}

describe('deck and ordering', () => {
  it('has 40 normal cards and one distinct special for a standard table', () => {
    expect(new Set(makeDeck().map((c) => c.id)).size).toBe(41);
    expect(strength({ id: '4-1', level: 4, number: 1 })).toBeGreaterThan(
      strength({ id: '1-10', level: 1, number: 10 }),
    );
  });
  it('expands to 44, 48 and 52 normal cards without breaking level ordering', () => {
    expect(makeDeck(6)).toHaveLength(45);
    expect(makeDeck(7)).toHaveLength(49);
    expect(makeDeck(8)).toHaveLength(53);
    expect(makeDeck(8).filter((card) => card.kind !== 'special' && card.number === 13)).toHaveLength(4);
    expect(strength({ id: '2-1', level: 2, number: 1 })).toBeGreaterThan(
      strength({ id: '1-13', level: 1, number: 13 }),
    );
  });
  it('shuffles without mutating, losing, or duplicating cards', () => {
    const deck = makeDeck(),
      before = structuredClone(deck),
      shuffled = shuffle(deck, random(8));
    expect(deck).toEqual(before);
    expect(shuffled).not.toEqual(deck);
    expect(shuffled.map((c) => c.id).sort()).toEqual(deck.map((c) => c.id).sort());
  });
  it('deals the entire deck without duplicates to eight players', () => {
    const g = fixture(8);
    expect(Object.values(g.hands).every((h) => h.length === 5)).toBe(true);
    expect(
      new Set(
        Object.values(g.hands)
          .flat()
          .map((c) => c.id),
      ).size,
    ).toBe(40);
  });
});
describe('lobby lives', () => {
  it('lets only the host choose lives and carries the choice through resets', () => {
    let g = createGame('ABC234', newPlayer('p0', 'Player 0', 0));
    g = addPlayer(g, 'p1', 'Player 1');
    expect(() => applyAction(g, 'p1', { type: 'set-lives', lives: 5 })).toThrow('host');
    g = applyAction(g, 'p0', { type: 'set-lives', lives: 5 });
    expect(g.startingHp).toBe(5);
    expect(g.players.every((player) => player.hp === 5)).toBe(true);
    g = addPlayer(g, 'p2', 'Player 2');
    expect(g.players.at(-1)?.hp).toBe(5);
    expect(viewFor(g, 'p1').startingHp).toBe(5);
  });
});
describe('normal rounds', () => {
  it('rejects fewer than four players and players who are not ready', () => {
    const g = createGame('ABC234', newPlayer('p0', 'Player 0', 0));
    expect(() => applyAction(g, 'p0', { type: 'start' })).toThrow('4–8');
    let full = g;
    for (let i = 1; i < 4; i++) full = addPlayer(full, `p${i}`, `Player ${i}`);
    expect(() => applyAction(full, 'p0', { type: 'start' })).toThrow('ready');
  });
  it('enforces the last bid restriction without changing the previous state', () => {
    let g = fixture();
    const first = turn(g)!;
    g = applyAction(g, first, { type: 'bid', value: 5 });
    g = applyAction(g, turn(g)!, { type: 'bid', value: 0 });
    g = applyAction(g, turn(g)!, { type: 'bid', value: 0 });
    expect(forbiddenBid(g)).toBe(0);
    const before = structuredClone(g);
    expect(() => applyAction(g, turn(g)!, { type: 'bid', value: 0 })).toThrow('total');
    expect(g).toEqual(before);
    g = applyAction(g, turn(g)!, { type: 'bid', value: 1 });
    expect(g.phase).toBe('playing');
    expect(turn(g)).toBe(first);
  });
  it('allows any bid if the accumulated total already exceeds the fight count', () => {
    let g = fixture();
    for (let i = 0; i < 3; i++) g = applyAction(g, turn(g)!, { type: 'bid', value: 5 });
    expect(forbiddenBid(g)).toBeNull();
    expect(applyAction(g, turn(g)!, { type: 'bid', value: 0 }).phase).toBe('playing');
  });
  it('rejects out-of-turn actions, out-of-range bids, and cards not held', () => {
    let g = fixture();
    const other = g.players.find((p) => p.id !== turn(g))!.id;
    expect(() => applyAction(g, other, { type: 'bid', value: 1 })).toThrow('turn');
    expect(() => applyAction(g, turn(g)!, { type: 'bid', value: 6 })).toThrow('range');
    g = bidAll(g);
    expect(() => applyAction(g, turn(g)!, { type: 'play', cardId: 'made-up' })).toThrow('hand');
  });
  it('awards the strongest card and gives its owner the next lead', () => {
    let g = bidAll(fixture());
    const played: { id: string; card: Card }[] = [];
    for (let i = 0; i < 4; i++) {
      const id = turn(g)!,
        card = g.hands[id][0];
      played.push({ id, card });
      g = applyAction(g, id, { type: 'play', cardId: card.id });
    }
    const winner = played.sort((a, b) => strength(b.card) - strength(a.card))[0].id;
    expect(g.fights[0].winnerId).toBe(winner);
    expect(g.wins[winner]).toBe(1);
    expect(turn(g)).toBe(winner);
  });
  it('deducts absolute prediction error in both directions simultaneously', () => {
    let g = bidAll(fixture());
    g.bids = { p0: 2, p1: 0, p2: 2, p3: 1 };
    // Arrange a final fight with known previous wins and a level-4 winner.
    g.fights = Array.from({ length: 4 }, (_, i) => ({
      number: i + 1,
      plays: [],
      winnerId: 'p1',
      winnerName: 'Player 1',
    }));
    g.wins = { p0: 0, p1: 2, p2: 1, p3: 1 };
    g.hands = {
      p0: [makeDeck()[0]],
      p1: [makeDeck()[39]],
      p2: [makeDeck()[10]],
      p3: [makeDeck()[20]],
    };
    while (g.phase === 'playing' || g.phase === 'special') {
      if (g.phase === 'special') {
        g = applyAction(g, turn(g)!, { type: 'choose-special', win: true });
        continue;
      }
      const id = turn(g)!;
      g = applyAction(g, id, { type: 'play', cardId: g.hands[id][0].id });
    }
    expect(g.results.map((r) => r.loss)).toEqual([2, 3, 1, 0]);
    expect(g.players.map((p) => p.hp)).toEqual([8, 7, 9, 10]);
  });
  it('repeats 5,4,3,2,1 and rotates the starting seat', () => {
    let g = fixture();
    const counts: number[] = [];
    for (let i = 0; i < 6; i++) {
      counts.push(g.count);
      for (const p of g.players) p.hp = 100;
      const previousSeat = g.starterSeat;
      if (g.phase === 'blind') g = blindCalls(g, [false, false, false, false]);
      else g = playRound(g);
      g = applyAction(g, g.hostId, { type: 'next' }, random(i + 6));
      expect(g.starterSeat).toBe((previousSeat + 1) % 4);
    }
    expect(counts).toEqual([5, 4, 3, 2, 1, 5]);
  });
});
describe('special round and secrecy', () => {
  it('shows only your hand in normal rounds and never includes opponent hands in serialized data', () => {
    const g = fixture();
    const view = viewFor(g, 'p0');
    expect(view.players[0].cards).toEqual(g.hands.p0);
    for (const p of view.players.slice(1)) {
      expect(p.cards).toEqual([]);
      for (const card of g.hands[p.id])
        expect(JSON.stringify(view)).not.toContain(`"id":"${card.id}"`);
    }
    expect(view).not.toHaveProperty('hands');
    expect(view).not.toHaveProperty('blind');
  });
  it('withholds your own blind card while exposing ordered predictions', () => {
    let g = blindFixture();
    g = applyAction(g, 'p0', { type: 'predict', win: false });
    const own = viewFor(g, 'p0'),
      other = viewFor(g, 'p1');
    expect(own.players[0].cards).toEqual([]);
    expect(JSON.stringify(own)).not.toContain('"id":"1-1"');
    expect(own.players[1].cards).toEqual(g.hands.p1);
    expect(other.players[0].predictionLocked).toBe(true);
    expect(other.players[0].blindPrediction).toBe(false);
    expect(own.players[0].blindPrediction).toBe(false);
    expect(() => applyAction(g, 'p0', { type: 'predict', win: true })).toThrow();
  });
  it.each([
    [false, false, false, false],
    [false, false, false, true],
    [true, false, false, true],
    [true, true, true, true],
  ])('accepts unrestricted blind calls: %j', (...values) => {
    const g = blindCalls(blindFixture(), values as boolean[]);
    expect(g.phase).toBe('results');
    expect(g.results.map((r) => r.loss)).toEqual(values.map((v, i) => Number(v !== (i === 3))));
    expect(g.revealed).toHaveLength(4);
    expect(viewFor(g, 'p0').players[0].cards).toHaveLength(1);
  });
  it('allows everyone to be correct without HP loss', () => {
    const g = blindCalls(blindFixture(), [false, false, false, true]);
    expect(g.players.every((p) => p.hp === 10)).toBe(true);
  });
  it('does not give spectators any live hidden cards', () => {
    const g = blindFixture();
    g.players[0].eliminated = true;
    delete g.hands.p0;
    expect(viewFor(g, 'p0').players.every((p) => p.cards.length === 0)).toBe(true);
  });
});
describe('elimination and interruptions', () => {
  it('restores only the final remaining players after a simultaneous knockout', () => {
    let g = blindFixture();
    g.players[0].eliminated = true;
    g.players[0].hp = 0;
    for (const p of g.players.slice(1)) p.hp = 1;
    for (const p of g.players.slice(1))
      g = applyAction(g, p.id, { type: 'predict', win: p.id !== 'p3' });
    expect(g.suddenDeath).toBe(true);
    expect(g.phase).toBe('results');
    expect(g.players.map((p) => p.hp)).toEqual([0, 1, 1, 1]);
    expect(g.players[0].eliminated).toBe(true);
  });
  it('declares the last survivor and supports a fresh rematch lobby', () => {
    let g = blindFixture();
    for (const p of g.players) p.hp = 1;
    g = blindCalls(g, [true, true, true, true]);
    expect(g.phase).toBe('finished');
    expect(g.winnerId).toBe('p3');
    g = applyAction(g, g.hostId, { type: 'rematch' });
    expect(g.phase).toBe('lobby');
    expect(g.players.every((p) => p.hp === 10 && !p.eliminated && !p.ready)).toBe(true);
  });
  it('waits without changing turns, transfers hosting, and resumes the same seat', () => {
    const g = fixture();
    const current = turn(g)!;
    const offline = setConnected(g, current, false);
    expect(turn(offline)).toBe(current);
    expect(offline.hands).toEqual(g.hands);
    expect(() => applyAction(offline, current, { type: 'bid', value: 0 })).toThrow('Reconnect');
    const hostGone = setConnected(g, g.hostId, false);
    expect(hostGone.hostId).toBe('p1');
    expect(setConnected(hostGone, 'p0', true).hostId).toBe('p1');
  });
  it('recovers hosting when everyone disconnected and one player returns', () => {
    let g = fixture();
    for (const p of g.players) g = setConnected(g, p.id, false);
    g = setConnected(g, 'p2', true);
    expect(g.hostId).toBe('p2');
  });
  it('keeps confirmed bids and advances when the final uncommitted bidder is removed', () => {
    let g = fixture();
    for (let i = 0; i < 3; i++)
      g = applyAction(g, turn(g)!, { type: 'bid', value: i === 0 ? 5 : 0 });
    const bids = structuredClone(g.bids);
    g = removePlayer(g, turn(g)!);
    expect(g.phase).toBe('playing');
    expect(g.bids).toEqual(bids);
  });
  it('removes a kicked unresolved card while preserving earlier completed fights', () => {
    let g = bidAll(fixture());
    for (let i = 0; i < 4; i++) {
      const id = turn(g)!;
      g = applyAction(g, id, { type: 'play', cardId: g.hands[id][0].id });
    }
    const completed = structuredClone(g.fights),
      kicked = turn(g)!;
    g = applyAction(g, kicked, { type: 'play', cardId: g.hands[kicked][0].id });
    g = removePlayer(g, kicked);
    expect(g.fights).toEqual(completed);
    expect(g.trick.some((t) => t.playerId === kicked)).toBe(false);
    expect(g.hands[kicked]).toBeUndefined();
    expect(g.players).toHaveLength(3);
    g = playRound(g);
    expect(['results', 'finished']).toContain(g.phase);
  });
  it('resolves immediately if a removal leaves every remaining player played', () => {
    let g = bidAll(fixture());
    for (let i = 0; i < 3; i++) {
      const id = turn(g)!;
      g = applyAction(g, id, { type: 'play', cardId: g.hands[id][0].id });
    }
    g = removePlayer(g, turn(g)!);
    expect(g.fights).toHaveLength(1);
    expect(g.trick).toEqual([]);
  });
  it('resolves a blind round after the only uncommitted player is removed', () => {
    let g = blindFixture();
    for (let i = 0; i < 3; i++) g = applyAction(g, `p${i}`, { type: 'predict', win: false });
    g = removePlayer(g, 'p3');
    expect(g.phase).toBe('results');
    expect(g.fights[0].winnerId).toBe('p2');
  });
  it('permits only the host to remove players or end the match', () => {
    const g = fixture();
    expect(() => applyAction(g, 'p1', { type: 'kick', playerId: 'p2' })).toThrow('host');
    expect(() => applyAction(g, 'p1', { type: 'end' })).toThrow('host');
    const ended = applyAction(g, 'p0', { type: 'end' });
    expect(ended.phase).toBe('lobby');
    expect(ended.winnerId).toBeNull();
    expect(ended.round).toBe(0);
  });
  it('awards the sole remaining player after a kick', () => {
    let g = fixture();
    g = removePlayer(g, 'p1');
    g = removePlayer(g, 'p2');
    g = removePlayer(g, 'p3');
    expect(g.phase).toBe('finished');
    expect(g.winnerId).toBe('p0');
  });
  it.each([4, 8])('completes full %i-player matches across 20 deterministic deals', (count) => {
    for (let seed = 1; seed <= 20; seed++) {
      let g = fixture(count, seed);
      const rng = random(seed * 9);
      let guard = 0;
      while (g.phase !== 'finished' && guard++ < 400) {
        if (g.phase === 'bidding' || g.phase === 'playing' || g.phase === 'special')
          g = playRound(g);
        if (g.phase === 'blind')
          while (g.phase === 'blind') g = applyAction(g, turn(g)!, { type: 'predict', win: false });
        if (g.phase === 'results') g = applyAction(g, g.hostId, { type: 'next' }, rng);
        expect(g.players.every((p) => Number.isFinite(p.hp) && p.hp >= 0)).toBe(true);
      }
      expect(g.phase).toBe('finished');
      expect(active(g)).toHaveLength(1);
    }
  });
});
