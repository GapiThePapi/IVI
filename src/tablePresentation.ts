import type { GameView, PlayerView } from '../shared/types';

export function callStatus(wins: number, bid: number | null) {
  if (bid !== null && wins === bid) return 'exact';
  if (bid !== null && wins > 0 && wins < bid) return 'progress';
  return 'neutral';
}
export function fightOrder(game: GameView): PlayerView[] {
  const players = game.players.filter((p) => !p.eliminated).sort((a, b) => a.seat - b.seat);
  const leader = game.trick[0]?.playerId ?? game.fights.at(-1)?.winnerId ?? game.starterId;
  const start = Math.max(
    0,
    players.findIndex((p) => p.id === leader),
  );
  return [...players.slice(start), ...players.slice(0, start)];
}
export function isThrow(dx: number, dy: number) {
  return dy <= -55 && -dy > Math.abs(dx) * 1.2;
}

// Anchor the viewer at the bottom. Turns and eliminations never move seats.
export function tableSeats(game: GameView) {
  const players = [...game.players].sort((a, b) => a.seat - b.seat);
  const anchor = Math.max(
    0,
    players.findIndex((p) => p.id === game.youId),
  );
  return [...players.slice(anchor), ...players.slice(0, anchor)].map((player, index) => {
    const angle = (2 * Math.PI * index) / players.length;
    return {
      player,
      x: 50 - 35 * Math.sin(angle),
      y: 50 + 35 * Math.cos(angle),
      cardX:
        players.length === 4 && index % 2 === 1
          ? 50 - 35 * Math.sin(angle)
          : 50 - 23 * Math.sin(angle),
      cardY:
        players.length === 4
          ? index % 2 === 1
            ? 76
            : 50 + 12 * Math.cos(angle)
          : 50 + 24 * Math.cos(angle),
    };
  });
}
