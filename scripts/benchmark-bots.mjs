import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { tsImport } from 'tsx/esm/api';
if (isMainThread) {
  const mode = process.argv[2] ?? 'hard';
  const games = Number(process.argv[3] ?? 1000);
  const results = await Promise.all(
    Array.from(
      { length: 4 },
      (_, shard) =>
        new Promise((resolve, reject) => {
          const w = new Worker(new URL(import.meta.url), { workerData: { mode, shard, games } });
          w.on('message', (m) => {
            if (m.done) resolve(m);
            else console.log(JSON.stringify(m));
          });
          w.on('error', reject);
        }),
    ),
  );
  const wins = results.reduce((n, r) => n + r.wins, 0);
  console.log(
    JSON.stringify({
      mode,
      games,
      wins,
      winRate: wins / games,
      baseline: 0.25,
      maxDecisionMs: Math.max(...results.map((r) => r.maxMs)),
    }),
  );
} else {
  const { createGame, newPlayer, applyAction, viewFor, turn } = await tsImport(
    '../shared/engine.ts',
    import.meta.url,
  );
  const { botAction } = await tsImport('../server/bots.ts', import.meta.url);
  const { mode, shard, games } = workerData;
  let wins = 0,
    maxMs = 0;
  for (let match = shard; match < games; match += 4) {
    let seed = match + 151;
    const rng = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    let g = createGame('BENCH', newPlayer('p', 'Target', 0));
    for (let i = 0; i < 3; i++)
      g = applyAction(g, 'p', { type: 'add-bot', difficulty: mode === 'hard' ? 'medium' : 'easy' });
    const target = g.players[match % 4].id;
    for (const p of g.players)
      p.difficulty = p.id === target ? mode : mode === 'hard' ? 'medium' : 'easy';
    g = applyAction(g, 'p', { type: 'ready', ready: true });
    g = applyAction(g, 'p', { type: 'start' }, rng);
    let guard = 0;
    while (g.phase !== 'finished' && guard++ < 20000) {
      if (g.phase === 'results') {
        g = applyAction(g, 'p', { type: 'next' }, rng);
        continue;
      }
      const actor = turn(g);
      const now = performance.now();
      const a = botAction(viewFor(g, actor), undefined, rng);
      maxMs = Math.max(maxMs, performance.now() - now);
      if (!a) throw new Error('stalled ' + g.phase);
      g = applyAction(g, actor, a, rng);
    }
    if (g.phase !== 'finished') throw new Error('match did not finish');
    if (g.winnerId === target) wins++;
    if (match % 100 < 4) parentPort.postMessage({ shard, match, mode });
  }
  parentPort.postMessage({ done: true, wins, maxMs });
}
