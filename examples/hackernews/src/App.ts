import type { RenderContext, TemplateDirective } from '@emonkak/ebit';
import { component, memo } from '@emonkak/ebit/directives.js';
import {
  createFormSubmitHandler,
  createLinkClickHandler,
  hashLocation,
  resetScrollPosition,
} from '@emonkak/ebit/router.js';

import { Nav } from './Nav.js';
import { NotFound } from './NotFound.js';
import { router } from './router.js';
import type { ItemState, StoryState, UserState } from './state.js';

interface AppProps {
  itemState: ItemState;
  storyState: StoryState;
  userState: UserState;
}

export function App(
  { userState, itemState, storyState }: AppProps,
  context: RenderContext,
): TemplateDirective {
  const [locationState, navigate] = context.use(hashLocation);
  const page =
    router.dispatch(locationState.url, locationState.state) ??
    component(NotFound, { url: locationState.url });

  context.use(itemState);
  context.use(storyState);
  context.use(userState);

  context.useLayoutEffect(() => {
    const handleLinkClick = createLinkClickHandler(navigate);
    const handleFormSubmit = createFormSubmitHandler(navigate);
    addEventListener('click', handleLinkClick);
    addEventListener('submit', handleFormSubmit);
    return () => {
      removeEventListener('click', handleLinkClick);
      removeEventListener('submit', handleFormSubmit);
    };
  }, []);

  context.useLayoutEffect(() => {
    resetScrollPosition(locationState);
  }, [locationState]);

  return context.html`
    <div>
      <${memo(() => component(Nav, {}), [])}>
      <${page}>
    </div>
  `;
}
