import { fileURLToPath } from 'node:url';
import { createDekiServer } from './app';

const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 3001);
const server = createDekiServer({
  staticDir: production ? fileURLToPath(new URL('../dist', import.meta.url)) : undefined,
});
server.http.listen(port, '0.0.0.0', () =>
  console.log(
    `IVI server listening on http://localhost:${port}${production ? '' : ' (open the Vite URL to play)'}`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void server.close().then(() => process.exit(0));
  });
