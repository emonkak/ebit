import type { RenderContext, TemplateResult } from '@emonkak/ebit';
import { component, optional } from '@emonkak/ebit/directives.js';

import { UserState } from '../state.js';
import { UserView } from './UserView.js';

export interface UserPageProps {
  id: string;
}

export function UserPage(
  { id }: UserPageProps,
  context: RenderContext,
): TemplateResult {
  const state = context.use(UserState);
  const [user, error, isLoading] = context.use([
    state.user$,
    state.error$,
    state.isLoading$,
  ]);

  context.useEffect(() => {
    if (state.user$.value === null || state.user$.value.id !== id) {
      state.fetchUser(id);
    }
  }, [id]);

  if (!isLoading && error !== null) {
    return context.html`
      <div class="error-view">
        <h1>${error.error}</h1>
      </div>
    `;
  }

  return context.html`<${optional(
    !isLoading && user !== null ? component(UserView, { user: user! }) : null,
  )}>`;
}
