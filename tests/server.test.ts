import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { turn } from '../shared/engine';
import { PROTOCOL_VERSION } from '../shared/types';
import { createDekiServer } from '../server/app';
import type { Command, GameView, Reply, Session } from '../shared/types';

let server: ReturnType<typeof createDekiServer>;
let url: string;
const clients: Socket[] = [];
interface Client {
  socket: Socket;
  view?: GameView;
  session?: Session;
}
async function connect(): Promise<Client> {
  const socket = io(url, {
    auth: { protocolVersion: PROTOCOL_VERSION },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
  clients.push(socket);
  const client: Client = { socket };
  socket.on('state', (v) => {
    client.view = v;
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return client;
}
async function send(
  client: Client,
  command: Command,
  requestId = randomUUID(),
  revision = client.view?.revision,
): Promise<Reply> {
  const reply: Reply = await client.socket
    .timeout(3000)
    .emitWithAck('command', { requestId, revision, round: client.view?.round, command });
  if (reply.ok && reply.session) client.session = reply.session;
  return reply;
}
async function room(size = 4) {
  const group = [await connect()];
  expect((await send(group[0], { type: 'create', name: 'Host' })).ok).toBe(true);
  for (let i = 1; i < size; i++) {
    const client = await connect();
    expect(
      (await send(client, { type: 'join', name: `Friend ${i}`, code: group[0].session!.code })).ok,
    ).toBe(true);
    group.push(client);
  }
  return group;
}
async function started(size = 4) {
  const group = await room(size);
  for (const client of group)
    expect((await send(client, { type: 'ready', ready: true })).ok).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect((await send(group[0], { type: 'start' })).ok).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  return group;
}
beforeEach(async () => {
  server = createDekiServer({ random: () => 0.1, botDelayMs: 1 });
  await new Promise<void>((resolve) => server.http.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.http.address() as AddressInfo).port}`;
});
afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await server.close();
});

describe('multiplayer protocol', () => {
  it('rejects incompatible online clients with an explicit update message', async () => {
    const old = io(url, {
      auth: { protocolVersion: 1 },
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(old);
    const error = await new Promise<Error>((resolve) => old.once('connect_error', resolve));
    expect(error.message).toContain('Update IVI');
  });
  it('validates special ownership, revision and duplicate decisions over the wire', async () => {
    const group = await started();
    const room = server.rooms.get(group[0].session!.code)!;
    const owner = group[0].session!.playerId;
    room.game.phase = 'special';
    room.game.specialOwnerId = owner;
    room.game.count = 2;
    room.game.fights = [];
    room.game.trick = room.game.players.map((p, i) => ({
      playerId: p.id,
      name: p.name,
      card:
        i === 0
          ? { id: 'special', kind: 'special' as const, level: 0 as const, number: 0 as const }
          : { id: `1-${i}`, level: 1, number: i },
    }));
    for (const c of group)
      await send(c, { type: 'resume', code: c.session!.code, token: c.session!.token });
    await expect.poll(() => group[0].view?.revision).toBe(room.game.revision);
    expect(
      (
        await send(
          group[1],
          { type: 'choose-special', win: true },
          randomUUID(),
          room.game.revision,
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await send(
          group[0],
          { type: 'choose-special', win: true },
          randomUUID(),
          room.game.revision - 1,
        )
      ).ok,
    ).toBe(false);
    const id = randomUUID();
    const revision = room.game.revision;
    expect((await send(group[0], { type: 'choose-special', win: true }, id, revision)).ok).toBe(
      true,
    );
    expect((await send(group[0], { type: 'choose-special', win: true }, id, revision)).ok).toBe(
      true,
    );
    expect(room.game.wins[owner]).toBe(1);
    expect(room.game.fights).toHaveLength(1);
  });
  it('validates the wire format and rejects starting without a room', async () => {
    const c = await connect();
    const reply = await c.socket.emitWithAck('command', {
      requestId: 'bad',
      command: { type: 'bid', value: '3' },
    });
    expect(reply.ok).toBe(false);
    expect((await send(c, { type: 'start' })).ok).toBe(false);
  });
  it('requires 4–8 ready players, prevents late joins, and rejects duplicate names', async () => {
    const group = await room(4),
      newcomer = await connect();
    expect((await send(group[0], { type: 'start' })).ok).toBe(false);
    expect(
      (await send(newcomer, { type: 'join', name: 'Host', code: group[0].session!.code })).ok,
    ).toBe(false);
    for (const c of group) await send(c, { type: 'ready', ready: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await send(group[0], { type: 'start' });
    expect(
      (await send(newcomer, { type: 'join', name: 'Late', code: group[0].session!.code })).ok,
    ).toBe(false);
  });
  it('caps a room at eight and keeps separate rooms isolated', async () => {
    const group = await room(8),
      extra = await connect();
    expect(
      (await send(extra, { type: 'join', name: 'Extra', code: group[0].session!.code })).ok,
    ).toBe(false);
    await send(extra, { type: 'create', name: 'Other host' });
    expect(extra.view!.players).toHaveLength(1);
    expect(group[0].view!.players).toHaveLength(8);
    expect(extra.view!.code).not.toBe(group[0].view!.code);
  });
  it('filters each hand at the socket boundary', async () => {
    const group = await started(8);
    for (const c of group) {
      expect(c.view!.players.find((p) => p.id === c.session!.playerId)!.cards).toHaveLength(5);
      expect(
        c
          .view!.players.filter((p) => p.id !== c.session!.playerId)
          .every((p) => p.cards.length === 0),
      ).toBe(true);
    }
  });
  it('applies repeated request IDs once, and rejects a distinct out-of-turn retry', async () => {
    const group = await started();
    const c = group.find((c) => c.session!.playerId === c.view!.turnId)!;
    const id = randomUUID(),
      revision = c.view!.revision;
    const first = await send(c, { type: 'bid', value: 0 }, id, revision);
    const after = c.view!.revision;
    const second = await send(c, { type: 'bid', value: 0 }, id, revision);
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(c.view!.revision).toBe(after);
    expect((await send(c, { type: 'bid', value: 1 })).ok).toBe(false);
  });
  it('resumes a seat with the same hand and transfers hosting after disconnect', async () => {
    const group = await started();
    const host = group[0],
      session = host.session!;
    const hand = host.view!.players.find((p) => p.id === session.playerId)!.cards;
    host.socket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(group[1].view!.hostId).toBe(group[1].session!.playerId);
    const reconnect = await connect();
    expect(
      (await send(reconnect, { type: 'resume', code: session.code, token: session.token })).ok,
    ).toBe(true);
    expect(reconnect.view!.players.find((p) => p.id === session.playerId)!.cards).toEqual(hand);
    expect(reconnect.view!.hostId).toBe(group[1].session!.playerId);
    expect(
      (await send(await connect(), { type: 'resume', code: session.code, token: 'invalid' })).ok,
    ).toBe(false);
  });
  it('rejects non-host kicks and revokes the removed player’s token', async () => {
    const group = await started(),
      kickedSession = group[2].session!;
    expect((await send(group[1], { type: 'kick', playerId: kickedSession.playerId })).ok).toBe(
      false,
    );
    const removed = new Promise((resolve) => group[2].socket.once('removed', resolve));
    expect((await send(group[0], { type: 'kick', playerId: kickedSession.playerId })).ok).toBe(
      true,
    );
    await removed;
    expect((await send(group[2], { type: 'play', cardId: '1-1' })).ok).toBe(false);
    const retry = await send(await connect(), {
      type: 'resume',
      code: kickedSession.code,
      token: kickedSession.token,
    });
    expect(retry).toMatchObject({ ok: false, code: 'SESSION_GONE' });
  });
  it('accepts ordered public blind calls and rejects out-of-turn predictions', async () => {
    const group = await started();
    const r = server.rooms.get(group[0].session!.code)!;
    r.game.phase = 'blind';
    r.game.round = 5;
    r.game.count = 1;
    for (const p of r.game.players) r.game.hands[p.id] = [r.game.hands[p.id][0]];
    // Resume sends an authoritative snapshot for this arranged blind-round scenario.
    for (const c of group)
      await send(c, { type: 'resume', code: c.session!.code, token: c.session!.token });
    const wrong = group.find((c) => c.session!.playerId !== turn(r.game))!;
    expect((await send(wrong, { type: 'predict', win: false })).ok).toBe(false);
    while (r.game.phase === 'blind') {
      const next = group.find((c) => c.session!.playerId === turn(r.game))!;
      await expect.poll(() => next.view?.revision).toBe(r.game.revision);
      expect((await send(next, { type: 'predict', win: false })).ok).toBe(true);
      await expect.poll(() => group[0].view?.revision).toBe(r.game.revision);
      expect(
        group[0].view!.players.find((p) => p.id === next.session!.playerId)!.blindPrediction,
      ).toBe(false);
    }
    if (r.game.phase === 'special') {
      const owner = group.find((c) => c.session!.playerId === turn(r.game))!;
      expect((await send(owner, { type: 'choose-special', win: false })).ok).toBe(true);
    }
    expect(r.game.phase).toBe('results');
    expect(r.game.revealed).toHaveLength(4);
  });
  it('runs bot turns, pauses while the human is away, and removes bot-only rooms', async () => {
    const host = await connect();
    await send(host, { type: 'create', name: 'Solo' });
    for (let i = 0; i < 3; i++) expect((await send(host, { type: 'add-bot' })).ok).toBe(true);
    const r = server.rooms.get(host.session!.code)!;
    await send(host, { type: 'ready', ready: true });
    await send(host, { type: 'start' });
    expect((await send(host, { type: 'bid', value: 0 })).ok).toBe(true);
    await expect.poll(() => Object.keys(r.game.bids).length, { timeout: 5000 }).toBe(4);
    host.socket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(r.botTimer).toBeUndefined();
    expect(r.game.hostId).toBe(host.session!.playerId);
    const returning = await connect();
    await send(returning, { type: 'resume', code: host.session!.code, token: host.session!.token });
    await send(returning, { type: 'leave' });
    expect(server.rooms.has(host.session!.code)).toBe(false);
  });
});
it('shares profile avatars and rejects unsafe avatar sources', async () => {
  const host = await connect();
  expect((await send(host, { type: 'create', name: 'Avatar host', avatar: 'preset:3' })).ok).toBe(
    true,
  );
  const friend = await connect();
  expect(
    (
      await send(friend, {
        type: 'join',
        name: 'Friend',
        code: host.session!.code,
        avatar: 'preset:2',
      })
    ).ok,
  ).toBe(true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(friend.view!.players[0].avatar).toBe('preset:3');
  expect(
    (
      await send(host, {
        type: 'profile',
        name: 'Avatar host',
        avatar: 'https://example.com/photo.jpg',
      })
    ).ok,
  ).toBe(false);
  expect(
    (
      await send(host, {
        type: 'profile',
        name: 'Avatar host',
        avatar: 'data:image/svg+xml;base64,PHN2Zz4=',
      })
    ).ok,
  ).toBe(false);
  expect((await send(host, { type: 'profile', name: 'Avatar host', avatar: 'preset:5' })).ok).toBe(
    true,
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(friend.view!.players[0].avatar).toBe('preset:5');
});
