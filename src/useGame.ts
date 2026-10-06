import { readProfile } from './Profile';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Command, Envelope, GameView, Reply, Session } from '../shared/types';
import { isAndroidApp } from './platform';
import { applyAction, viewFor } from '../shared/engine';
import { PROTOCOL_VERSION, type Difficulty, type GameAction } from '../shared/types';
import { botCanAct } from '../server/bots';
import type { Game } from '../shared/types';
import { createPractice, PRACTICE_PLAYER } from './practice';
import PracticeWorker from './bot.worker?worker&inline';
import { botAction } from '../server/bots';

const KEY = 'ivi-seat';
const LEGACY_KEY = 'deki-seat';
// LAN HTTP pages may not expose randomUUID. These IDs deduplicate requests;
// authentication tokens are generated independently by the server's CSPRNG.
const requestId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
function readSeat(): Session | null {
  try {
    const storage = isAndroidApp ? localStorage : sessionStorage;
    const seat = JSON.parse(storage.getItem(KEY) ?? storage.getItem(LEGACY_KEY) ?? 'null');
    if (seat) storage.setItem(KEY, JSON.stringify(seat));
    return seat;
  } catch {
    return null;
  }
}
function saveSeat(seat: Session | null) {
  try {
    const storage = isAndroidApp ? localStorage : sessionStorage;
    if (seat) {
      storage.setItem(KEY, JSON.stringify(seat));
      storage.setItem(LEGACY_KEY, JSON.stringify(seat));
    } else {
      storage.removeItem(KEY);
      storage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* Play still works if storage is disabled. */
  }
}
export function useGame() {
  const socket = useRef<Socket | null>(null);
  const botWorker = useRef<Worker | null>(null);
  const workerFailed = useRef(false);
  const practiceRef = useRef<Game | null>(null);
  const [practice, setPractice] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const viewRef = useRef<GameView | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(Boolean(readSeat()));
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(readSeat);
  const applyView = (view: GameView | null) => {
    viewRef.current = view;
    setGame(view);
  };
  useEffect(() => {
    const client = io({
      autoConnect: false,
      auth: { protocolVersion: PROTOCOL_VERSION },
      timeout: 12000,
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
    });
    socket.current = client;
    client.on('state', (view: GameView) => {
      if (practiceRef.current) return;
      applyView(view);
      setRestoring(false);
    });
    client.on('connect', async () => {
      const connectionId = client.id;
      try {
        const response = await fetch('/health', {
          signal: AbortSignal.timeout(10000),
          cache: 'no-store',
        });
        const health = await response.json();
        if (client.id !== connectionId || practiceRef.current) return;
        if (health.protocolVersion !== PROTOCOL_VERSION)
          throw new Error('The table server needs an update. Solo games are available.');
      } catch (error) {
        if (client.id !== connectionId || practiceRef.current) return;
        setError(error instanceof Error ? error.message : 'Could not verify the table server.');
        setConnectionFailed(true);
        setRestoring(false);
        client.disconnect();
        return;
      }
      if (practiceRef.current) {
        client.disconnect();
        return;
      }
      setConnected(true);
      setConnectionFailed(false);
      const seat = readSeat();
      if (seat) {
        setRestoring(true);
        client.timeout(10000).emit(
          'command',
          {
            requestId: requestId(),
            command: { type: 'resume', code: seat.code, token: seat.token },
          },
          (err: Error | null, reply: Reply) => {
            if (practiceRef.current) return;
            setRestoring(false);
            if (err) {
              setError('Could not restore your seat. Reconnect to try again.');
              return;
            }
            if (!reply.ok) {
              saveSeat(null);
              setSession(null);
              applyView(null);
              setError(reply.error);
            }
          },
        );
      } else setRestoring(false);
    });
    client.on('disconnect', () => {
      setConnected(false);
      setBusy(false);
    });
    client.on('connect_error', (err) => {
      if ((err as Error & { data?: { code?: string } }).data?.code === 'UPDATE_REQUIRED') {
        setError(err.message);
        client.disconnect();
      }
      setConnected(false);
      setConnectionFailed(true);
      setRestoring(false);
    });
    client.on('removed', (message: string) => {
      if (practiceRef.current) return;
      saveSeat(null);
      setSession(null);
      applyView(null);
      setBusy(false);
      setRestoring(false);
      setError(message);
    });
    client.connect();
    return () => {
      client.removeAllListeners();
      client.disconnect();
      socket.current = null;
    };
  }, []);
  useEffect(() => {
    if (!practice) return;
    // Bundle the worker with the app so offline WebViews never fetch it from the server.
    workerFailed.current = false;
    let worker: Worker;
    try {
      worker = new PracticeWorker();
    } catch {
      workerFailed.current = true;
      return;
    }
    botWorker.current = worker;
    worker.onmessage = (
      event: MessageEvent<{ revision: number; actor: string; action: GameAction | null }>,
    ) => {
      const current = practiceRef.current;
      if (!current || current.revision !== event.data.revision || !event.data.action) return;
      practiceRef.current = applyAction(current, event.data.actor, event.data.action);
      applyView(viewFor(practiceRef.current, PRACTICE_PLAYER));
    };
    worker.onerror = () => {
      workerFailed.current = true;
      worker.terminate();
      botWorker.current = null;
      const current = practiceRef.current;
      // Reschedule the pending turn with a lightweight fallback if workers are unavailable.
      if (current) applyView(viewFor(current, PRACTICE_PLAYER));
    };
    return () => {
      worker.terminate();
      botWorker.current = null;
    };
  }, [practice]);
  useEffect(() => {
    if (!practice) return;
    const timer = window.setTimeout(() => {
      const current = practiceRef.current;
      if (!current) return;
      const bot = current.players.find((p) => p.isBot && botCanAct(viewFor(current, p.id)));
      if (!bot) return;
      const view = viewFor(current, bot.id);
      if (workerFailed.current) {
        const action = botAction(view, bot.difficulty ?? 'medium');
        if (action) {
          practiceRef.current = applyAction(current, bot.id, action);
          applyView(viewFor(practiceRef.current, PRACTICE_PLAYER));
        }
      } else botWorker.current?.postMessage(view);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [game, practice]);
  const startPractice = (name: string, difficulty: Difficulty = 'medium') => {
    practiceRef.current = createPractice(name, difficulty);
    practiceRef.current.players[0].avatar = readProfile().avatar;
    setPractice(true);
    socket.current?.disconnect();
    setRestoring(false);
    setBusy(false);
    setError('');
    applyView(viewFor(practiceRef.current, PRACTICE_PLAYER));
  };
  const retry = () => {
    setError('');
    setConnectionFailed(false);
    socket.current?.disconnect().connect();
  };
  const send = useCallback(async (command: Command): Promise<boolean> => {
    if (practiceRef.current) {
      try {
        if (command.type === 'leave') {
          practiceRef.current = null;
          setPractice(false);
          applyView(null);
          setError('');
          socket.current?.connect();
          return true;
        }
        if (command.type === 'create' || command.type === 'join' || command.type === 'resume')
          return false;
        practiceRef.current = applyAction(practiceRef.current, PRACTICE_PLAYER, command);
        applyView(viewFor(practiceRef.current, PRACTICE_PLAYER));
        setError('');
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Try that move again.');
        return false;
      }
    }
    const client = socket.current;
    if (!client?.connected) {
      setError('Connection lost. Your table is waiting; reconnect to continue.');
      return false;
    }
    setBusy(true);
    setError('');
    const request: Envelope = {
      requestId: requestId(),
      command,
      revision: viewRef.current?.revision,
      round: viewRef.current?.round,
    };
    try {
      // Retry with the same ID, so a lost acknowledgement cannot apply an action twice.
      let reply: Reply | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          reply = await client.timeout(7000).emitWithAck('command', request);
          break;
        } catch {
          if (attempt === 1)
            throw new Error('No response from the table. Reconnect before trying again.');
        }
      }
      if (practiceRef.current) return false;
      if (!reply?.ok) {
        setError(reply && !reply.ok ? reply.error : 'That action could not be completed.');
        return false;
      }
      if (reply.session) {
        saveSeat(reply.session);
        setSession(reply.session);
        if (command.type === 'create' || command.type === 'join') {
          try {
            localStorage.setItem('deki-nickname', command.name);
          } catch {
            /* Optional convenience. */
          }
        }
      }
      if (command.type === 'leave') {
        saveSeat(null);
        setSession(null);
        applyView(null);
        setError('');
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection interrupted.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return {
    game,
    session,
    connected,
    busy,
    restoring,
    error,
    setError,
    send,
    practice,
    startPractice,
    connectionFailed,
    retry,
  };
}
