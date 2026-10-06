import { botAction } from '../server/bots';
import type { GameView } from '../shared/types';
self.onmessage = (event: MessageEvent<GameView>) => {
  const view = event.data;
  self.postMessage({ revision: view.revision, actor: view.youId, action: botAction(view) });
};
