import { parentPort } from 'node:worker_threads';
import { tsImport } from 'tsx/esm/api';
const { botAction } = await tsImport('./bots.ts', import.meta.url);
parentPort.on('message', ({ id, view }) => {
  try {
    parentPort.postMessage({ id, action: botAction(view) });
  } catch (error) {
    parentPort.postMessage({ id, error: String(error) });
  }
});
