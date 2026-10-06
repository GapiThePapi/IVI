import { Worker } from 'node:worker_threads';
import type { GameAction, GameView } from '../shared/types';
export class BotWorker {
  private worker: Worker | null = null;
  private sequence = 0;
  private pending = new Map<
    number,
    { resolve: (action: GameAction | null) => void; reject: (error: Error) => void }
  >();
  decide(view: GameView): Promise<GameAction | null> {
    if (!this.worker) {
      const worker = new Worker(new URL('./bot-worker.mjs', import.meta.url));
      this.worker = worker;
      worker.on('message', ({ id, action, error }) => {
        const call = this.pending.get(id);
        this.pending.delete(id);
        if (error) call?.reject(new Error(error));
        else call?.resolve(action);
      });
      worker.on('error', (error) => {
        this.fail(error);
        this.worker = null;
      });
      worker.on('exit', () => {
        if (this.worker === worker) {
          this.worker = null;
          this.fail(new Error('Bot worker stopped'));
        }
      });
    }
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, view });
    });
  }
  private fail(error: Error) {
    for (const call of this.pending.values()) call.reject(error);
    this.pending.clear();
  }
  close() {
    this.fail(new Error('Table server stopped'));
    void this.worker?.terminate();
    this.worker = null;
  }
}
