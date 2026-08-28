import { createComponent, html } from 'barebind';

import { Footer } from './footer.js';
import { Header } from './header.js';
import { Main } from './main.js';
import type { TodoStore } from './store.js';

interface AppProps {
  store: TodoStore;
}

export const App = createComponent(function App({ store }: AppProps) {
  this.provide(store);

  return html`
    <section class="todoapp">
      <${Header({})}>
      <${Main({})}>
      <${Footer({})}>
    </section>
    <footer class="info">
      <p>Double-click to edit a todo</p>
      <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
    </footer>
  `;
});
