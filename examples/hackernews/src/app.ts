import { createComponent, html } from 'barebind';
import { HashAdapter, SyncNavigationScene } from 'barebind/addons/router';

import { Nav } from './nav.js';
import { NotFound } from './not-found.js';
import { router } from './router.js';
import type { AppStore } from './store.js';

interface AppProps {
  store: AppStore;
}

export const App = createComponent(function App({ store }: AppProps) {
  const adapter = this.useMemo(() => new HashAdapter(), []);
  const scene = this.use(SyncNavigationScene(adapter));
  const page = router.match(scene.url) ?? NotFound({ url: scene.url });

  this.provide(store);

  return html`
    <header class="header">
      <${Nav({})}>
    </header>
    <main class="main">
      <${page}>
    </main>
  `;
});
