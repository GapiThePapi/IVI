import { makeDeck, strength } from '../shared/engine';
import type { Card, Difficulty, GameAction, GameView } from '../shared/types';

const pick = <T>(items: T[], random: () => number) => items[Math.floor(random() * items.length)];
const estimate = (cards: Card[], opponents: number) =>
  cards.reduce(
    (n, c) => n + (c.kind === 'special' ? 0.65 : Math.pow(strength(c) / 52, opponents)),
    0,
  );
export function botCanAct(view: GameView) {
  const me = view.players.find((p) => p.id === view.youId);
  return Boolean(
    me &&
    !me.eliminated &&
    me.connected &&
    view.turnId === me.id &&
    ['bidding', 'playing', 'blind', 'special'].includes(view.phase),
  );
}
function normalAction(
  view: GameView,
  difficulty: Difficulty,
  random: () => number,
): GameAction | null {
  if (!botCanAct(view)) return null;
  const me = view.players.find((p) => p.id === view.youId)!;
  if (view.phase === 'special')
    return {
      type: 'choose-special',
      win: view.count === 1 ? Boolean(me.blindPrediction) : me.wins < (me.bid ?? 0),
    };
  if (view.phase === 'blind') {
    const visible = view.players.flatMap((p) => p.cards);
    const unseen = makeDeck(view.players.length).filter(
      (c) => !visible.some((v) => v.id === c.id),
    );
    const specialHolder = view.players.find((p) => p.cards.some((c) => c.kind === 'special'));
    const high = Math.max(0, ...visible.filter((c) => c.kind !== 'special').map(strength));
    const probability =
      unseen.filter(
        (c) =>
          c.kind === 'special' ||
          (strength(c) > high && (!specialHolder || specialHolder.blindPrediction === false)),
      ).length / unseen.length;
    return {
      type: 'predict',
      win: difficulty === 'easy' && random() < 0.3 ? random() > 0.5 : probability > 0.5,
    };
  }
  if (view.phase === 'bidding') {
    const target =
      Math.round(estimate(me.cards, view.players.filter((p) => !p.eliminated).length - 1)) +
      (difficulty === 'easy' ? pick([-1, 0, 1], random) : 0);
    const legal = Array.from({ length: view.count + 1 }, (_, i) => i).filter(
      (i) => i !== view.forbiddenBid,
    );
    legal.sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
    return { type: 'bid', value: legal[0] };
  }
  if (!me.cards.length) return null;
  if (difficulty === 'easy') return { type: 'play', cardId: pick(me.cards, random).id };
  const card = selectCard(
    me.cards,
    me.wins,
    me.bid ?? 0,
    view.trick.map((p) => p.card),
  );
  return { type: 'play', cardId: card.id };
}
function selectCard(hand: Card[], wins: number, bid: number, trick: Card[]): Card {
  const cards = [...hand].sort((a, b) => strength(a) - strength(b));
  const high = Math.max(0, ...trick.map(strength));
  if (wins < bid)
    return (trick.length ? cards.find((c) => strength(c) > high) : cards.at(-1)) ?? cards[0];
  return (
    cards.find((c) => c.kind === 'special') ??
    [...cards].reverse().find((c) => strength(c) < high) ??
    cards[0]
  );
}
interface SimSeat {
  id: string;
  hand: Card[];
  wins: number;
  bid: number;
}
// The simulator receives only the public, filtered view. Unseen cards are sampled,
// never read from the real game. All candidates share each sampled deal.
function sampleSeats(view: GameView, random: () => number): SimSeat[] {
  const seen = new Set(
    [
      ...view.players.flatMap((p) => p.cards),
      ...view.trick.map((p) => p.card),
      ...view.fights.flatMap((f) => f.plays.map((p) => p.card)),
    ].map((c) => c.id),
  );
  const deck = makeDeck(view.players.length).filter((c) => !seen.has(c.id));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return view.players
    .filter((p) => !p.eliminated)
    .sort((a, b) => a.seat - b.seat)
    .map((p) => {
      const hand = p.id === view.youId ? [...p.cards] : deck.splice(0, p.handCount);
      return {
        id: p.id,
        hand,
        wins: p.wins,
        bid:
          p.bid ?? Math.round(estimate(hand, view.players.filter((p) => !p.eliminated).length - 1)),
      };
    });
}
function rollout(
  view: GameView,
  source: SimSeat[],
  action: GameAction,
): { loss: number; rivalLoss: number } {
  const seats = source.map((p) => ({ ...p, hand: [...p.hand] }));
  const me = seats.find((p) => p.id === view.youId)!;
  if (action.type === 'bid') me.bid = action.value;
  let trick = view.trick.map((p) => ({ playerId: p.playerId, card: p.card }));
  let leader = trick[0]?.playerId ?? view.fights.at(-1)?.winnerId ?? view.starterId ?? seats[0].id;
  let first = true;
  for (let fight = 0; fight < 6; fight++) {
    if (!trick.length && seats.every((p) => !p.hand.length)) break;
    const start = seats.findIndex((p) => p.id === leader);
    for (let i = 0; i < seats.length; i++) {
      const p = seats[(Math.max(0, start) + i) % seats.length];
      if (trick.some((t) => t.playerId === p.id) || !p.hand.length) continue;
      const card =
        first && action.type === 'play' && p.id === me.id
          ? p.hand.find((c) => c.id === action.cardId)!
          : selectCard(
              p.hand,
              p.wins,
              p.bid,
              trick.map((t) => t.card),
            );
      p.hand.splice(
        p.hand.findIndex((c) => c.id === card.id),
        1,
      );
      trick.push({ playerId: p.id, card });
    }
    const special = trick.find((t) => t.card.kind === 'special');
    const owner = seats.find((p) => p.id === special?.playerId);
    const winSpecial =
      owner &&
      (first && action.type === 'choose-special' && owner.id === me.id
        ? action.win
        : owner.wins < owner.bid);
    const winner = winSpecial
      ? special!
      : [...trick]
          .filter((t) => t.card.kind !== 'special')
          .sort((a, b) => strength(b.card) - strength(a.card))[0];
    if (!winner) break;
    seats.find((p) => p.id === winner.playerId)!.wins++;
    leader = winner.playerId;
    trick = [];
    first = false;
  }
  return {
    loss: Math.abs(me.wins - me.bid),
    rivalLoss: seats
      .filter((p) => p.id !== me.id)
      .reduce((n, p) => n + Math.abs(p.wins - p.bid), 0),
  };
}
export function botAction(
  view: GameView,
  difficulty: Difficulty = view.players.find((p) => p.id === view.youId)?.difficulty ?? 'medium',
  random: () => number = Math.random,
): GameAction | null {
  const baseline = normalAction(view, difficulty, random);
  if (
    !baseline ||
    difficulty !== 'hard' ||
    view.phase === 'blind' ||
    (view.phase === 'special' && view.count === 1)
  )
    return baseline;
  const me = view.players.find((p) => p.id === view.youId)!;
  const candidates: GameAction[] =
    view.phase === 'bidding'
      ? Array.from({ length: view.count + 1 }, (_, value) => ({
          type: 'bid' as const,
          value,
        })).filter((a) => a.value !== view.forbiddenBid)
      : view.phase === 'special'
        ? [
            { type: 'choose-special', win: false },
            { type: 'choose-special', win: true },
          ]
        : me.cards.map((c) => ({ type: 'play', cardId: c.id }));
  const totals = candidates.map(() => ({ loss: 0, rivalLoss: 0 }));
  for (let sample = 0; sample < 256; sample++) {
    const seats = sampleSeats(view, random);
    candidates.forEach((a, i) => {
      const r = rollout(view, seats, a);
      totals[i].loss += r.loss;
      totals[i].rivalLoss += r.rivalLoss;
    });
  }
  let best = 0;
  for (let i = 1; i < candidates.length; i++) {
    // Opponent disruption breaks ties only when expected own loss is within .02 HP.
    if (
      totals[i].loss < totals[best].loss - 5 ||
      (Math.abs(totals[i].loss - totals[best].loss) <= 5 &&
        totals[i].rivalLoss > totals[best].rivalLoss)
    )
      best = i;
  }
  return candidates[best];
}
