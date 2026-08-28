import { decoded, integer, Router, route } from 'barebind/addons/router';
import { ItemPage } from './item/item-page.js';
import { StoriesPage } from './story/stories-page.js';
import { UserPage } from './user/user-page.js';

export const router = new Router<unknown>([
  route([''], () => StoriesPage({ type: 'news' })),
  route(['top'], null, [
    route([integer], ([page]) => StoriesPage({ type: 'news', page })),
  ]),
  route(['new'], () => StoriesPage({ type: 'newest' }), [
    route([integer], ([page]) => StoriesPage({ type: 'news', page })),
  ]),
  route(['show'], () => StoriesPage({ type: 'show' }), [
    route([integer], ([page]) => StoriesPage({ type: 'show', page })),
  ]),
  route(['ask'], () => StoriesPage({ type: 'ask' }), [
    route([integer], ([page]) => StoriesPage({ type: 'ask', page })),
  ]),
  route(['jobs'], () => StoriesPage({ type: 'jobs' }), [
    route([integer], ([page]) => StoriesPage({ type: 'jobs', page })),
  ]),
  route(['items', integer], ([id]) => ItemPage({ id })),
  route(['users', decoded], ([id]) => UserPage({ id })),
]);
