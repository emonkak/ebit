import type { RenderContext, TemplateResult } from '@emonkak/ebit';
import { component } from '@emonkak/ebit/directives.js';

import { Footer } from './Footer.js';
import { Header } from './Header.js';
import { Main } from './Main.js';
import type { TodoState } from './state.js';

interface AppProps {
  state: TodoState;
}

export function App(
  { state }: AppProps,
  context: RenderContext,
): TemplateResult {
  context.use(state);

  return context.html`
    <section class="todoapp">
      <${component(Header, {})}>
      <${component(Main, {})}>
      <${component(Footer, {})}>
    </section>
    <footer class="info">
      <p>Double-click to edit a todo</p>
      <p>Created by the TodoMVC Team</p>
      <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
    </footer>
  `;
}
