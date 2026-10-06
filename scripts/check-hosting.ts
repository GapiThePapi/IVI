import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import { createDekiServer } from '../server/app';
import type { Command, Reply } from '../shared/types';

// Exercise the same single-origin HTTP and WebSocket service used in the cloud.
const server = createDekiServer({ staticDir: fileURLToPath(new URL('../dist', import.meta.url)) });
const clients: Socket[] = [];
try {
  await new Promise<void>((resolve) => server.http.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.http.address() as AddressInfo).port}`;
  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', protocolVersion: 2 });
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /id="root"/);
  const asset = html.match(/src="([^"]+\.js)"/)?.[1];
  assert.ok(asset, 'Production JavaScript is referenced');
  assert.equal((await fetch(new URL(asset, origin))).status, 200);
  async function connect(transport: 'polling' | 'websocket') {
    const socket = io(origin, {
      auth: { protocolVersion: 2 },
      transports: [transport],
      reconnection: false,
      timeout: 5000,
    });
    clients.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    return socket;
  }
  async function send(socket: Socket, command: Command): Promise<Reply> {
    return socket.timeout(5000).emitWithAck('command', { requestId: randomUUID(), command });
  }
  const host = await connect('websocket');
  const created = await send(host, { type: 'create', name: 'Cloud host' });
  assert.ok(created.ok && created.session, 'Host creates a lobby');
  const code = created.session.code;
  const guest = await connect('polling');
  const joined = await send(guest, { type: 'join', name: 'Friend', code });
  assert.ok(joined.ok && joined.session, 'Friend joins the same lobby using fallback transport');
  const invite = await fetch(`${origin}/?room=${code}`);
  assert.equal(invite.status, 200);
  assert.match(await invite.text(), /id="root"/);
  host.disconnect();
  const returning = await connect('websocket');
  const resumed = await send(returning, { type: 'resume', code, token: created.session.token });
  assert.ok(resumed.ok, 'The host can restore their seat');
  console.log(
    'Hosting check passed: health, frontend, assets, invite, WebSocket lobby, polling join, reconnect.',
  );
} finally {
  for (const client of clients) client.disconnect();
  await server.close();
}
