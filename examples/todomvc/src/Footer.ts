import type { RenderContext, TemplateDirective } from '@emonkak/ebit';
import { classMap } from '@emonkak/ebit/directives.js';

import { AppState, TodoFilter } from './state.js';

export interface FooterProps {}

export function Footer(
  _props: FooterProps,
  context: RenderContext,
): TemplateDirective {
  const state = context.use(AppState);
  const { todos$, activeTodos$, filter$ } = state;
  const todos = context.use(todos$);
  const activeTodos = context.use(activeTodos$);
  const filter = context.use(filter$);

  if (todos.length === 0) {
    return context.empty();
  }

  const handleChangeFilter = (newFilter: TodoFilter) => (event: Event) => {
    event.preventDefault();
    filter$.value = newFilter;
  };

  const handleRemoveCompletedTodos = (event: Event) => {
    event.preventDefault();
    state.clearCompletedTodos();
  };

  return context.html`
    <footer class="footer" data-testid="footer">
      <span class="todo-count">${activeTodos.length} ${activeTodos.length === 1 ? 'item' : 'items'} left!</span>
      <ul class="filters" data-testid="footer-navigation">
        <li>
          <a
            class=${classMap({ selected: filter === TodoFilter.ALL })}
            href="#"
            @click=${handleChangeFilter(TodoFilter.ALL)}
          >
            All
          </a>
        </li>
        <li>
          <a
            class=${classMap({ selected: filter === TodoFilter.ACTIVE })}
            href="#"
            @click=${handleChangeFilter(TodoFilter.ACTIVE)}
          >
            Active
          </a>
        </li>
        <li>
          <a
            class=${classMap({ selected: filter === TodoFilter.COMPLETED })}
            href="#"
            @click=${handleChangeFilter(TodoFilter.COMPLETED)}
          >
            Completed
          </a>
        </li>
      </ul>
      <button
        type="button"
        class="clear-completed"
        disabled=${activeTodos.length === todos.length}
        @click=${handleRemoveCompletedTodos}
      >
        Clear completed
      </button>
    </footer>
  `;
}
