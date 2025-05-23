import type { RenderContext, TemplateResult } from '@emonkak/ebit';
import { component, keyedList } from '@emonkak/ebit/directives.js';

import { StoryStore, type StoryType } from '../store.js';
import { StoryView } from './StoryView.js';

export interface StoriesPageProps {
  type: StoryType;
  page?: number;
}

const STORIES_PER_PAGE = 30;

export function StoriesPage(
  { type, page = 1 }: StoriesPageProps,
  context: RenderContext,
): TemplateResult {
  const store = context.use(StoryStore);
  const [stories, isLoading] = context.use([store.stories$, store.isLoading$]);

  context.useEffect(() => {
    if (store.type$.value !== type || store.page$.value !== page) {
      store.fetchStories(type, page);
    }
  }, [type, page]);

  return context.html`
    <div class="story-view">
      <div class="story-list-nav">
        <${
          !isLoading && page > 1
            ? context.html`
                <a
                  class="page-link"
                  href=${`#/${storyTypeToPathName(type)}/${page - 1}`}
                  aria-label="Previous Page"
                >
                  &lt; prev
                </a>
              `
            : context.html`
                <span class="page-link disabled" aria-hidden="true">
                  &lt; prev
                </span>
              `
        }>
        <span>page ${page}</span>
        <${
          !isLoading && stories.length >= STORIES_PER_PAGE
            ? context.html`
                <a
                  class="page-link"
                  href=${`#/${storyTypeToPathName(type)}/${page + 1}`}
                  aria-label="Next Page"
                >
                  more &gt;
                </a>
              `
            : context.html`
                <span class="page-link disabled" aria-hidden="true">
                  more &gt;
                </span>
              `
        }>
      </div>
      <main class="story-list">
        <ul>
          <${keyedList(
            stories,
            (story) => story.id,
            (story) => component(StoryView, { story }),
          )}>
        </ul>
      </main>
    </div>
  `;
}

function storyTypeToPathName(type: StoryType): string {
  switch (type) {
    case 'news':
      return 'top';
    case 'newest':
      return 'new';
    case 'show':
      return 'show';
    case 'ask':
      return 'ask';
    case 'jobs':
      return 'jobs';
  }
}
