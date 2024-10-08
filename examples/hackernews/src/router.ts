import { type Component, component } from '@emonkak/ebit/directives.js';
import { Router, integer, route, wildcard } from '@emonkak/ebit/router.js';

import { ItemPage } from './item/ItemPage.js';
import { StoriesPage } from './story/StoriesPage.js';
import { UserPage } from './user/UserPage.js';

export const router = new Router<Component<any, any, any>>([
  route([''], () => component(StoriesPage, { type: 'news' })),
  route(['top'], null, [
    route([integer], ([page]) =>
      component(StoriesPage, { type: 'news', page }),
    ),
  ]),
  route(['new'], () => component(StoriesPage, { type: 'newest' }), [
    route([integer], ([page]) =>
      component(StoriesPage, { type: 'news', page }),
    ),
  ]),
  route(['show'], () => component(StoriesPage, { type: 'show' }), [
    route([integer], ([page]) =>
      component(StoriesPage, { type: 'show', page }),
    ),
  ]),
  route(['ask'], () => component(StoriesPage, { type: 'ask' }), [
    route([integer], ([page]) => component(StoriesPage, { type: 'ask', page })),
  ]),
  route(['jobs'], () => component(StoriesPage, { type: 'jobs' }), [
    route([integer], ([page]) =>
      component(StoriesPage, { type: 'jobs', page }),
    ),
  ]),
  route(['items', integer], ([id]) => component(ItemPage, { id })),
  route(['users', wildcard], ([id]) => component(UserPage, { id })),
]);
