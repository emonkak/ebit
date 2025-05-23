import type { RenderContext, TemplateResult } from '@emonkak/ebit';
import { optional } from '@emonkak/ebit/directives.js';

import type { User } from '../store.js';

export interface UserProps {
  user: User;
}

export function UserView(
  { user }: UserProps,
  context: RenderContext,
): TemplateResult {
  return context.html`
    <div class="user-view">
      <h1>User : ${user.id}</h1>
      <ul class="meta">
        <li>
          <span class="label">Created:</span> ${user.created}
        </li>
        <li>
          <span class="label">Karma:</span> ${user.karma}
        </li>
        <${optional(
          user.about
            ? context.html`<li .innerHTML=${user.about} class="about"></li>`
            : null,
        )}>
      </ul>
      <p class="links">
        <a href=${`https://news.ycombinator.com/submitted?id=${user.id}`}>submissions</a>
        ${' '}
        <a href=${`https://news.ycombinator.com/threads?id=${user.id}`}>comments</a>
      </p>
    </div>
  `;
}
