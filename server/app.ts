import express from 'express';
import { createServer } from 'node:http';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import {
  addPlayer,
  applyAction,
  createGame,
  newPlayer,
  removePlayer,
  setConnected,
  viewFor,
} from '../shared/engine';
import type { Envelope, Game, Reply, Session } from '../shared/types';
import { botCanAct } from './bots';
import { BotWorker } from './botExecutor';
import { PROTOCOL_VERSION } from '../shared/types';

const name = z
  .string()
  .trim()
  .min(1, 'Enter a name.')
  .max(20, 'Names can have up to 20 characters.')
  .regex(/^[^\p{Cc}\p{Cf}]+$/u, 'Use a readable name.');
const avatar = z
  .string()
  .max(48000)
  .regex(/^(preset:[0-5]|data:image\/jpeg;base64,[A-Za-z0-9+/]+=*)$/)
  .optional();
const command = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add-bot'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  }),
  z.object({ type: z.literal('set-lives'), lives: z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(15), z.literal(20)]) }),
  z.object({ type: z.literal('choose-special'), win: z.boolean() }),
  z.object({ type: z.literal('profile'), name, avatar }),
  z.object({ type: z.literal('create'), name, avatar }),
  z.object({
    type: z.literal('join'),
    name,
    avatar,
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z2-9]{6}$/),
  }),
  z.object({ type: z.literal('resume'), code: z.string().max(6), token: z.string().max(100) }),
  z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('ready'), ready: z.boolean() }),
  z.object({ type: z.literal('start') }),
  z.object({ type: z.literal('bid'), value: z.number().int().min(0).max(5) }),
  z.object({ type: z.literal('play'), cardId: z.string().max(10) }),
  z.object({ type: z.literal('predict'), win: z.boolean() }),
  z.object({ type: z.literal('next') }),
  z.object({ type: z.literal('kick'), playerId: z.string().max(50) }),
  z.object({ type: z.literal('end') }),
  z.object({ type: z.literal('rematch') }),
]);
const envelope = z.object({
  requestId: z.string().min(1).max(80),
  round: z.number().int().nonnegative().optional(),
  revision: z.number().int().nonnegative().optional(),
  command,
});
interface Member {
  playerId: string;
  socketId?: string;
  replies: Map<string, Reply>;
}
interface Room {
  botTimer?: ReturnType<typeof setTimeout>;
  game: Game;
  members: Map<string, Member>;
}
interface Options {
  botDelayMs?: number;
  random?: () => number;
  staticDir?: string;
}
const secureRandom = () => randomInt(0, 0x100000000) / 0x100000000;

export function createDekiServer(options: Options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => res.json({ status: 'ok', protocolVersion: PROTOCOL_VERSION }));
  if (options.staticDir) {
    app.use(express.static(options.staticDir));
    app.get('/{*path}', (_req, res) => res.sendFile('index.html', { root: options.staticDir! }));
  }
  const http = createServer(app);
  const io = new Server(http, { maxHttpBufferSize: 65536, serveClient: false });
  const rooms = new Map<string, Room>();
  const bots = new BotWorker();
  io.use((socket, next) => {
    if (socket.handshake.auth?.protocolVersion !== PROTOCOL_VERSION) {
      const error = new Error('Update IVI to join online tables.') as Error & { data: unknown };
      error.data = { code: 'UPDATE_REQUIRED' };
      return next(error);
    }
    next();
  });
  const random = options.random ?? secureRandom;

  function broadcast(room: Room) {
    for (const member of room.members.values()) {
      if (member.socketId)
        io.to(member.socketId).emit('state', viewFor(room.game, member.playerId));
    }
    scheduleBot(room);
  }
  function scheduleBot(room: Room) {
    if (room.botTimer) clearTimeout(room.botTimer);
    room.botTimer = undefined;
    if (!rooms.has(room.game.code) || !room.game.players.some((p) => !p.isBot && p.connected))
      return;
    const bot = room.game.players.find((p) => p.isBot && botCanAct(viewFor(room.game, p.id)));
    if (!bot) return;
    room.botTimer = setTimeout(async () => {
      room.botTimer = undefined;
      const revision = room.game.revision;
      const view = viewFor(room.game, bot.id);
      try {
        const action = await bots.decide(view);
        if (!rooms.has(room.game.code) || revision !== room.game.revision) return;
        if (action) room.game = applyAction(room.game, bot.id, action, random);
        broadcast(room);
      } catch {
        if (!rooms.has(room.game.code) || revision !== room.game.revision) return;
        room.game.notice = 'Bot interrupted. Retrying�';
        broadcast(room);
      }
    }, options.botDelayMs ?? 650);
  }
  function locate(socket: Socket) {
    const session = socket.data.session as Session | undefined;
    const room = session && rooms.get(session.code);
    const member = room && room.members.get(session!.token);
    if (!room || !member || member.socketId !== socket.id) throw new Error('Join a table first.');
    return { session: session!, room, member };
  }
  function forget(room: Room, playerId: string, reason: string) {
    for (const [token, member] of room.members) {
      if (member.playerId !== playerId) continue;
      room.members.delete(token);
      const socket = member.socketId && io.sockets.sockets.get(member.socketId);
      if (socket) {
        delete socket.data.session;
        socket.emit('removed', reason);
      }
    }
    room.game = removePlayer(room.game, playerId);
    if (!room.game.players.some((p) => !p.isBot)) {
      if (room.botTimer) clearTimeout(room.botTimer);
      rooms.delete(room.game.code);
    }
  }
  function attach(socket: Socket, room: Room, token: string, member: Member): Session {
    if (member.socketId && member.socketId !== socket.id) {
      const old = io.sockets.sockets.get(member.socketId);
      if (old) {
        delete old.data.session;
        old.emit('removed', 'This seat was opened in another tab.');
        old.disconnect(true);
      }
    }
    member.socketId = socket.id;
    const session = { code: room.game.code, token, playerId: member.playerId };
    socket.data.session = session;
    room.game = setConnected(room.game, member.playerId, true);
    return session;
  }

  io.on('connection', (socket) => {
    const localReplies = new Map<string, Reply>();
    let windowStart = Date.now(),
      received = 0;
    socket.on('command', (input: unknown, acknowledge?: (reply: Reply) => void) => {
      if (typeof acknowledge !== 'function') return;
      if (Date.now() - windowStart > 10000) {
        windowStart = Date.now();
        received = 0;
      }
      if (++received > 100) {
        acknowledge({ ok: false, error: 'Too many actions. Please wait a moment.' });
        return;
      }
      const parsed = envelope.safeParse(input);
      if (!parsed.success) {
        acknowledge({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid action.' });
        return;
      }
      const request: Envelope = parsed.data;
      let cached = localReplies.get(request.requestId);
      try {
        cached ??= locate(socket).member.replies.get(request.requestId);
      } catch {
        /* Not joined yet. */
      }
      if (cached) {
        acknowledge(cached);
        return;
      }
      let reply: Reply;
      try {
        const action = request.command;
        if (action.type === 'create' || action.type === 'join') {
          if (socket.data.session) throw new Error('Leave your current table first.');
          let room: Room;
          const playerId = randomUUID(),
            token = randomBytes(32).toString('hex');
          if (action.type === 'create') {
            if (rooms.size >= 1000) throw new Error('The server is full. Please try again later.');
            const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code: string;
            do {
              code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
            } while (rooms.has(code));
            room = {
              game: createGame(code, newPlayer(playerId, action.name, 0)),
              members: new Map(),
            };
            rooms.set(code, room);
          } else {
            const existing = rooms.get(action.code);
            if (!existing) throw new Error('That table does not exist. Check the code.');
            room = existing;
            room.game = addPlayer(room.game, playerId, action.name);
          }
          room.game.players.find((p) => p.id === playerId)!.avatar = action.avatar;
          const member: Member = { playerId, replies: new Map() };
          room.members.set(token, member);
          reply = { ok: true, session: attach(socket, room, token, member) };
          broadcast(room);
        } else if (action.type === 'resume') {
          const room = rooms.get(action.code),
            member = room?.members.get(action.token);
          if (!room || !member) {
            acknowledge({
              ok: false,
              code: 'SESSION_GONE',
              error:
                'This seat is no longer available. The match may have ended or the server restarted.',
            });
            return;
          }
          if (
            socket.data.session &&
            (socket.data.session.token !== action.token || socket.data.session.code !== action.code)
          )
            throw new Error('Leave your current table first.');
          reply = { ok: true, session: attach(socket, room, action.token, member) };
          broadcast(room);
        } else {
          const { room, member } = locate(socket);
          if (action.type === 'leave') {
            forget(room, member.playerId, 'You left the table.');
          } else {
            if (request.round === undefined || request.round !== room.game.round)
              throw new Error('The round changed. Please try again.');
            if (
              [
                'add-bot',
                'bid',
                'play',
                'predict',
                'choose-special',
                'start',
                'next',
                'kick',
                'end',
                'rematch',
              ].includes(action.type) &&
              request.revision !== room.game.revision
            )
              throw new Error('The table changed. Please try again.');
            room.game = applyAction(room.game, member.playerId, action, random);
            if (action.type === 'kick') {
              for (const [token, kicked] of room.members) {
                if (kicked.playerId !== action.playerId) continue;
                room.members.delete(token);
                const target = kicked.socketId && io.sockets.sockets.get(kicked.socketId);
                if (target) {
                  delete target.data.session;
                  target.emit('removed', 'The host removed you from this table.');
                }
              }
            }
          }
          reply = { ok: true };
          member.replies.set(request.requestId, reply);
          if (member.replies.size > 256) member.replies.delete(member.replies.keys().next().value!);
          broadcast(room);
        }
      } catch (error) {
        reply = {
          ok: false,
          error: error instanceof Error ? error.message : 'That action could not be completed.',
        };
        try {
          const { room, member } = locate(socket);
          socket.emit('state', viewFor(room.game, member.playerId));
        } catch {
          /* Not seated. */
        }
      }
      localReplies.set(request.requestId, reply);
      if (localReplies.size > 256) localReplies.delete(localReplies.keys().next().value!);
      acknowledge(reply);
    });
    socket.on('disconnect', () => {
      try {
        const { room, member } = locate(socket);
        member.socketId = undefined;
        room.game = setConnected(room.game, member.playerId, false);
        broadcast(room);
      } catch {
        /* A replaced or removed socket has no seat. */
      }
    });
  });
  return {
    app,
    http,
    io,
    rooms,
    close: () => {
      for (const room of rooms.values()) if (room.botTimer) clearTimeout(room.botTimer);
      rooms.clear();
      bots.close();
      return new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}
