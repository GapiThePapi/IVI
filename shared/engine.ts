import { BOT_NAMES } from './names';
import type { Card, Game, GameAction, GameView, Player, Play } from './types';

export const MAX_RANK = 13;
export const deckRankCount = (playerCount: number) => Math.min(MAX_RANK, Math.max(10, playerCount + 5));
export const strength = (card: Card) =>
  card.kind === 'special' ? MAX_RANK * 4 + 1 : (card.level - 1) * MAX_RANK + card.number;
export const makeDeck = (playerCount = 4): Card[] => [
  ...Array.from({ length: deckRankCount(playerCount) * 4 }, (_, i) => ({
    id: `${Math.floor(i / deckRankCount(playerCount)) + 1}-${(i % deckRankCount(playerCount)) + 1}`,
    level: Math.floor(i / deckRankCount(playerCount)) + 1,
    number: (i % deckRankCount(playerCount)) + 1,
  })),
  { kind: 'special', id: 'special', level: 0, number: 0 },
];
export function shuffle(deck: Card[], random: () => number): Card[] {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function requireRule(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export const active = (game: Game) => game.players.filter((p) => !p.eliminated);
const ordered = (players: Player[], start: number) => [
  ...players.filter((p) => p.seat >= start),
  ...players.filter((p) => p.seat < start),
];
export const starter = (game: Game) => ordered(active(game), game.starterSeat)[0];
export function turn(game: Game): string | null {
  if (game.phase === 'special') return game.specialOwnerId;
  if (game.phase === 'blind')
    return (
      ordered(active(game), game.starterSeat).find((p) => game.blind[p.id] === undefined)?.id ??
      null
    );
  if (game.phase === 'bidding')
    return (
      ordered(active(game), game.starterSeat).find((p) => game.bids[p.id] === undefined)?.id ?? null
    );
  if (game.phase === 'playing')
    return (
      ordered(active(game), game.leaderSeat).find(
        (p) => !game.trick.some((t) => t.playerId === p.id),
      )?.id ?? null
    );
  return null;
}
export function forbiddenBid(game: Game): number | null {
  if (
    game.phase !== 'bidding' ||
    active(game).filter((p) => game.bids[p.id] === undefined).length !== 1
  )
    return null;
  const value = game.count - active(game).reduce((sum, p) => sum + (game.bids[p.id] ?? 0), 0);
  return value >= 0 && value <= game.count ? value : null;
}
export function createGame(code: string, player: Player): Game {
  return {
    code,
    hostId: player.id,
    players: [player],
    phase: 'lobby',
    specialOwnerId: null,
    round: 0,
    count: 5,
    startingHp: 10,
    starterSeat: player.seat,
    leaderSeat: player.seat,
    hands: {},
    bids: {},
    blind: {},
    wins: {},
    trick: [],
    fights: [],
    results: [],
    revealed: [],
    winnerId: null,
    suddenDeath: false,
    revision: 0,
    notice: '',
  };
}
export function newPlayer(id: string, name: string, seat: number, startingHp = 10): Player {
  return { id, name, seat, connected: true, ready: false, hp: startingHp, eliminated: false };
}
export function addPlayer(game: Game, id: string, name: string): Game {
  requireRule(game.phase === 'lobby', 'This match has already started. Join the next match.');
  requireRule(game.players.length < 8, 'This table is full.');
  requireRule(
    !game.players.some((p) => p.name.toLowerCase() === name.toLowerCase()),
    'That name is already at this table.',
  );
  const next = structuredClone(game);
  next.players.push(
    newPlayer(id, name, Math.max(-1, ...next.players.map((p) => p.seat)) + 1, next.startingHp),
  );
  next.revision++;
  return next;
}
function beginRound(game: Game, random: () => number) {
  const deck = shuffle(makeDeck(active(game).length), random);
  game.count = 5 - ((game.round - 1) % 5);
  game.hands = {};
  game.bids = {};
  game.blind = {};
  game.wins = {};
  game.trick = [];
  game.fights = [];
  game.results = [];
  game.revealed = [];
  game.specialOwnerId = null;
  game.suddenDeath = false;
  game.notice = '';
  const players = ordered(active(game), game.starterSeat);
  for (const p of players) {
    game.hands[p.id] = [];
    game.wins[p.id] = 0;
  }
  for (let c = 0; c < game.count; c++) for (const p of players) game.hands[p.id].push(deck.pop()!);
  for (const p of players) game.hands[p.id].sort((a, b) => strength(a) - strength(b));
  game.leaderSeat = players[0].seat;
  game.phase = game.count === 1 ? 'blind' : 'bidding';
}
function score(game: Game) {
  const players = active(game);
  game.results = players.map((p) => {
    const wins = game.wins[p.id] ?? 0;
    const prediction = game.count === 1 ? game.blind[p.id] : game.bids[p.id];
    const loss =
      game.count === 1 ? Number(prediction !== (wins === 1)) : Math.abs(Number(prediction) - wins);
    p.hp = Math.max(0, p.hp - loss);
    p.eliminated = p.hp === 0;
    return {
      playerId: p.id,
      name: p.name,
      prediction,
      wins,
      loss,
      hp: p.hp,
      eliminated: p.eliminated,
    };
  });
  if (active(game).length === 0) {
    for (const p of players) {
      p.hp = 1;
      p.eliminated = false;
    }
    game.suddenDeath = true;
    game.notice = 'Everyone fell together. Sudden death: remaining players return with 1 HP.';
  }
  game.phase = 'results';
  if (active(game).length === 1) {
    game.phase = 'finished';
    game.winnerId = active(game)[0].id;
  }
}
function resolveBlind(game: Game) {
  if (!active(game).every((p) => game.blind[p.id] !== undefined)) return;
  game.revealed = active(game).map((p) => ({
    playerId: p.id,
    name: p.name,
    card: game.hands[p.id][0],
  }));
  game.trick = structuredClone(game.revealed);
  resolveFight(game);
}
function resolveFight(game: Game, choice?: boolean) {
  if (!active(game).every((p) => game.trick.some((t) => t.playerId === p.id))) return;
  const special = game.trick.find((p) => p.card.kind === 'special');
  if (special && choice === undefined) {
    game.specialOwnerId = special.playerId;
    game.phase = 'special';
    return;
  }
  const winner =
    special && choice
      ? special
      : [...game.trick]
          .filter((p) => p.card.kind !== 'special')
          .sort((a, b) => strength(b.card) - strength(a.card))[0];
  if (!winner) return;
  game.wins[winner.playerId]++;
  game.fights.push({
    number: game.fights.length + 1,
    plays: structuredClone(game.trick),
    winnerId: winner.playerId,
    winnerName: winner.name,
    ...(special ? { specialChoice: choice } : {}),
  });
  game.trick = [];
  game.specialOwnerId = null;
  game.phase = 'playing';
  game.leaderSeat = game.players.find((p) => p.id === winner.playerId)!.seat;
  if (game.fights.length === game.count) score(game);
}
function resetLobby(game: Game, notice = '') {
  const startingHp = game.startingHp;
  const reset = createGame(game.code, game.players[0]);
  Object.assign(game, reset, {
    hostId: game.hostId,
    players: game.players.map((p) => ({
      ...p,
      ready: Boolean(p.isBot),
      hp: startingHp,
      eliminated: false,
    })),
    revision: game.revision,
    startingHp,
    notice,
  });
}
function transferHost(game: Game, previousSeat: number) {
  const candidates = game.players.filter((p) => p.connected && !p.isBot);
  const next = candidates.find((p) => p.seat > previousSeat) ?? candidates[0];
  if (next) game.hostId = next.id;
}
export function setConnected(game: Game, playerId: string, connected: boolean): Game {
  const next = structuredClone(game);
  const player = next.players.find((p) => p.id === playerId);
  if (!player) return next;
  player.connected = connected;
  if (!connected && next.phase === 'lobby') player.ready = false;
  if (
    (!connected && next.hostId === playerId) ||
    !next.players.some((p) => p.id === next.hostId && p.connected)
  )
    transferHost(next, player.seat);
  next.revision++;
  return next;
}
export function removePlayer(game: Game, playerId: string): Game {
  const next = structuredClone(game);
  const player = next.players.find((p) => p.id === playerId);
  requireRule(player, 'That player has already left.');
  next.players = next.players.filter((p) => p.id !== playerId);
  delete next.hands[playerId];
  delete next.bids[playerId];
  delete next.blind[playerId];
  delete next.wins[playerId];
  next.trick = next.trick.filter((p) => p.playerId !== playerId);
  if (next.hostId === playerId) transferHost(next, player.seat);
  next.notice = `${player.name} left the table. Existing predictions and completed fights still count.`;
  if (next.phase !== 'lobby' && next.phase !== 'finished') {
    if (active(next).length <= 1) {
      next.phase = 'finished';
      next.winnerId = active(next)[0]?.id ?? null;
    } else if (next.phase === 'bidding' && !turn(next)) {
      next.phase = 'playing';
      next.leaderSeat = starter(next)!.seat;
    } else if (next.phase === 'special') {
      next.revealed = next.revealed.filter((p) => p.playerId !== playerId);
      resolveFight(next);
    } else if (next.phase === 'playing') resolveFight(next);
    else if (next.phase === 'blind') resolveBlind(next);
  }
  next.revision++;
  return next;
}
export function applyAction(
  game: Game,
  actorId: string,
  action: GameAction,
  random: () => number = Math.random,
): Game {
  const next = structuredClone(game);
  const player = next.players.find((p) => p.id === actorId);
  requireRule(player, 'You are no longer at this table.');
  requireRule(player.connected, 'Reconnect to continue.');
  if (['add-bot', 'set-lives', 'start', 'next', 'kick', 'end', 'rematch'].includes(action.type))
    requireRule(next.hostId === actorId, 'Only the host can do that.');
  switch (action.type) {
    case 'profile':
      requireRule(
        action.name.trim().length > 0 && action.name.trim().length <= 20,
        'Use 1�20 characters.',
      );
      requireRule(
        !next.players.some(
          (p) => p.id !== actorId && p.name.toLowerCase() === action.name.trim().toLowerCase(),
        ),
        'That name is already at this table.',
      );
      player.name = action.name.trim();
      player.avatar = action.avatar;
      break;
    case 'add-bot': {
      let number = 1;
      while (
        next.players.some(
          (p) => p.id === `bot-${number}` || p.name.toLowerCase() === `bot ${number}`,
        )
      )
        number++;
      const available = BOT_NAMES.filter(
        (name) => !next.players.some((p) => p.name.toLowerCase() === name.toLowerCase()),
      );
      const botName = available[Math.floor(random() * available.length)] ?? `Capo ${number}`;
      const added = addPlayer(next, `bot-${number}`, botName);
      const bot = added.players[added.players.length - 1];
      bot.isBot = true;
      bot.avatar = `preset:${(number - 1) % 6}`;
      bot.ready = true;
      bot.difficulty = action.difficulty ?? 'medium';
      return added;
    }
    case 'set-lives':
      requireRule(next.phase === 'lobby', 'Lives can only change in the lobby.');
      requireRule([3, 5, 10, 15, 20].includes(action.lives), 'Choose an available lives value.');
      next.startingHp = action.lives;
      next.players.forEach((p) => {
        p.hp = action.lives;
        p.eliminated = false;
      });
      break;
    case 'ready':
      requireRule(next.phase === 'lobby', 'Readiness can only change in the lobby.');
      player.ready = action.ready;
      break;
    case 'start':
      requireRule(next.phase === 'lobby', 'A match is already in progress.');
      requireRule(
        next.players.length >= 4 && next.players.length <= 8,
        'You need 4–8 players to start.',
      );
      requireRule(
        next.players.every((p) => p.connected && p.ready),
        'Everyone needs to be connected and ready.',
      );
      next.round = 1;
      next.starterSeat = next.players[Math.floor(random() * next.players.length)].seat;
      beginRound(next, random);
      break;
    case 'bid':
      requireRule(
        next.phase === 'bidding' && turn(next) === actorId,
        'Wait for your prediction turn.',
      );
      requireRule(
        Number.isInteger(action.value) && action.value >= 0 && action.value <= next.count,
        'Choose a prediction within this round’s range.',
      );
      requireRule(
        action.value !== forbiddenBid(next),
        `The total cannot equal ${next.count}. Choose another prediction.`,
      );
      next.bids[actorId] = action.value;
      if (!turn(next)) {
        next.phase = 'playing';
        next.leaderSeat = starter(next)!.seat;
      }
      break;
    case 'play': {
      requireRule(
        next.phase === 'playing' && turn(next) === actorId,
        'Wait for your turn to play.',
      );
      const index = next.hands[actorId].findIndex((c) => c.id === action.cardId);
      requireRule(index >= 0, 'That card is not in your hand.');
      const [card] = next.hands[actorId].splice(index, 1);
      next.trick.push({ playerId: actorId, name: player.name, card });
      resolveFight(next);
      break;
    }
    case 'choose-special':
      requireRule(
        next.phase === 'special' && next.specialOwnerId === actorId,
        'Wait for your special-card decision.',
      );
      resolveFight(next, action.win);
      break;
    case 'predict':
      requireRule(
        next.phase === 'blind' && !player.eliminated && turn(next) === actorId,
        'It is not your blind round.',
      );
      requireRule(next.blind[actorId] === undefined, 'Your prediction is already locked.');
      next.blind[actorId] = action.win;
      resolveBlind(next);
      break;
    case 'next': {
      requireRule(next.phase === 'results', 'Finish this round first.');
      const players = active(next);
      next.starterSeat = (players.find((p) => p.seat > next.starterSeat) ?? players[0]).seat;
      next.round++;
      beginRound(next, random);
      break;
    }
    case 'kick':
      requireRule(action.playerId !== actorId, 'Use Leave table to leave your own seat.');
      return removePlayer(next, action.playerId);
    case 'end':
      resetLobby(next, 'The host ended the match. Ready up for a fresh start.');
      break;
    case 'rematch':
      requireRule(next.phase === 'finished', 'Finish the match before starting another.');
      resetLobby(next);
      break;
  }
  next.revision++;
  return next;
}
export function viewFor(game: Game, viewerId: string): GameView {
  const viewer = game.players.find((p) => p.id === viewerId);
  const participant = Boolean(viewer && !viewer.eliminated);
  const isRevealed =
    (game.phase === 'results' || game.phase === 'finished' || game.phase === 'special') &&
    game.revealed.length > 0;
  return {
    code: game.code,
    hostId: game.hostId,
    youId: viewerId,
    phase: game.phase,
    specialOwnerId: game.specialOwnerId,
    round: game.round,
    count: game.count,
    startingHp: game.startingHp,
    starterId: starter(game)?.id ?? null,
    turnId: turn(game),
    forbiddenBid: forbiddenBid(game),
    bidTotal: active(game).reduce((s, p) => s + (game.bids[p.id] ?? 0), 0),
    players: game.players.map((p) => ({
      ...p,
      bid: game.bids[p.id] ?? null,
      wins: game.wins[p.id] ?? 0,
      handCount: game.hands[p.id]?.length ?? 0,
      cards: structuredClone(
        (
          game.phase === 'blind'
            ? participant && p.id !== viewerId
            : p.id === viewerId && game.phase !== 'lobby' && game.count !== 1
        )
          ? (game.hands[p.id] ?? [])
          : isRevealed
            ? game.revealed.filter((t) => t.playerId === p.id).map((t) => t.card)
            : [],
      ),
      predictionLocked: game.blind[p.id] !== undefined,
      blindPrediction: game.blind[p.id] ?? null,
    })),
    trick: structuredClone(game.trick),
    fights: structuredClone(game.fights),
    results: structuredClone(game.results),
    revealed: structuredClone(game.revealed),
    winnerId: game.winnerId,
    suddenDeath: game.suddenDeath,
    revision: game.revision,
    notice: game.notice,
  };
}
