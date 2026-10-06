export const PROTOCOL_VERSION = 3;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Phase = 'lobby' | 'bidding' | 'playing' | 'special' | 'blind' | 'results' | 'finished';
export type Card =
  | { kind?: 'normal'; id: string; level: number; number: number }
  | { kind: 'special'; id: string; level: 0; number: 0 };
export interface Player {
  avatar?: string;
  isBot?: boolean;
  difficulty?: Difficulty;
  id: string;
  name: string;
  seat: number;
  connected: boolean;
  ready: boolean;
  hp: number;
  eliminated: boolean;
}
export interface Play {
  playerId: string;
  name: string;
  card: Card;
}
export interface Fight {
  specialChoice?: boolean;
  number: number;
  plays: Play[];
  winnerId: string;
  winnerName: string;
}
export interface Score {
  playerId: string;
  name: string;
  prediction: number | boolean;
  wins: number;
  loss: number;
  hp: number;
  eliminated: boolean;
}
export interface Game {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  specialOwnerId: string | null;
  round: number;
  count: number;
  startingHp: number;
  starterSeat: number;
  leaderSeat: number;
  hands: Record<string, Card[]>;
  bids: Record<string, number>;
  blind: Record<string, boolean>;
  wins: Record<string, number>;
  trick: Play[];
  fights: Fight[];
  results: Score[];
  revealed: Play[];
  winnerId: string | null;
  suddenDeath: boolean;
  revision: number;
  notice: string;
}
export interface PlayerView extends Player {
  bid: number | null;
  wins: number;
  handCount: number;
  cards: Card[];
  predictionLocked: boolean;
  blindPrediction: boolean | null;
}
export interface GameView {
  code: string;
  hostId: string;
  youId: string;
  players: PlayerView[];
  phase: Phase;
  specialOwnerId: string | null;
  round: number;
  count: number;
  startingHp: number;
  starterId: string | null;
  turnId: string | null;
  forbiddenBid: number | null;
  bidTotal: number;
  trick: Play[];
  fights: Fight[];
  results: Score[];
  revealed: Play[];
  winnerId: string | null;
  suddenDeath: boolean;
  revision: number;
  notice: string;
}
export type GameAction =
  | { type: 'profile'; name: string; avatar?: string }
  | { type: 'add-bot'; difficulty?: Difficulty }
  | { type: 'set-lives'; lives: number }
  | { type: 'choose-special'; win: boolean }
  | { type: 'ready'; ready: boolean }
  | { type: 'start' }
  | { type: 'bid'; value: number }
  | { type: 'play'; cardId: string }
  | { type: 'predict'; win: boolean }
  | { type: 'next' }
  | { type: 'kick'; playerId: string }
  | { type: 'end' }
  | { type: 'rematch' };
export type Command =
  | { type: 'create'; name: string; avatar?: string }
  | { type: 'join'; name: string; code: string; avatar?: string }
  | { type: 'resume'; code: string; token: string }
  | { type: 'leave' }
  | GameAction;
export interface Envelope {
  requestId: string;
  revision?: number;
  round?: number;
  command: Command;
}
export interface Session {
  code: string;
  token: string;
  playerId: string;
}
export type Reply =
  { ok: true; session?: Session } | { ok: false; error: string; code?: 'SESSION_GONE' };
