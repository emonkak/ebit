import { type RenderContext, usableTag } from '@emonkak/ebit';
import { atom } from '@emonkak/ebit/directives.js';

export interface Story {
  comments_count: number;
  domain: string;
  id: number;
  points: number;
  time: number;
  time_ago: string;
  title: string;
  type: string;
  url: string;
  user: string;
}

export type StoryType = 'news' | 'newest' | 'show' | 'ask' | 'jobs';

const STORY_API_ORIGIN = 'https://node-hnapi.herokuapp.com';
const USER_API_ORIGIN = 'https://hacker-news.firebaseio.com';

export class StoryStore {
  readonly stories$ = atom<Story[]>([]);

  readonly type$ = atom<StoryType | null>(null);

  readonly page$ = atom(0);

  readonly isLoading$ = atom(false);

  static [usableTag](context: RenderContext): StoryStore {
    const store = context.getContextValue(this);
    if (!(store instanceof this)) {
      throw new Error(`The context value for ${this.name} is not registered.`);
    }
    return store;
  }

  [usableTag](context: RenderContext): void {
    context.setContextValue(this.constructor, this);
  }

  async fetchStories(type: StoryType, page: number): Promise<void> {
    this.isLoading$.value = true;

    try {
      const url =
        STORY_API_ORIGIN +
        '/' +
        type +
        '?' +
        new URLSearchParams({ page: page.toString() });
      const response = await fetch(url);
      if (response.ok) {
        this.stories$.value = await response.json();
        this.type$.value = type;
        this.page$.value = page;
      }
    } finally {
      this.isLoading$.value = false;
    }
  }
}

export interface Item {
  comments: Comment[];
  comments_count: number;
  content: string;
  id: number;
  points: number;
  time: number;
  time_ago: string;
  title: string;
  type: string;
  url: string;
  domain?: string;
  user: string;
}

export interface Comment {
  comments: Comment[];
  content: string;
  id: number;
  level: number;
  time: number;
  time_ago: string;
  user: string;
}

export class ItemStore {
  readonly item$ = atom<Item | null>(null);

  readonly isLoading$ = atom(false);

  readonly error$ = atom<Error | null>(null);

  static [usableTag](context: RenderContext): ItemStore {
    const store = context.getContextValue(this);
    if (!(store instanceof this)) {
      throw new Error(`The context value for ${this.name} is not registered.`);
    }
    return store;
  }

  [usableTag](context: RenderContext): void {
    context.setContextValue(this.constructor, this);
  }

  async fetchItem(id: number): Promise<void> {
    this.isLoading$.value = true;

    try {
      const url = STORY_API_ORIGIN + '/item/' + id;
      const response = await fetch(url);
      const data = response.ok
        ? await response.json()
        : { error: response.statusText };
      if (typeof data?.error === 'string') {
        this.item$.value = null;
        this.error$.value = data;
      } else {
        this.item$.value = data;
        this.error$.value = null;
      }
    } finally {
      this.isLoading$.value = false;
    }
  }
}

export interface User {
  about?: string;
  created: number;
  id: string;
  karma: number;
  submitted: number[];
}

export class UserStore {
  readonly user$ = atom<User | null>(null);

  readonly isLoading$ = atom(false);

  readonly error$ = atom<Error | null>(null);

  static [usableTag](context: RenderContext): UserStore {
    const store = context.getContextValue(this);
    if (!(store instanceof this)) {
      throw new Error(`The context value for ${this.name} could not be found.`);
    }
    return store;
  }

  [usableTag](context: RenderContext): void {
    context.setContextValue(this.constructor, this);
  }

  async fetchUser(id: string): Promise<void> {
    this.isLoading$.value = true;

    try {
      const url = USER_API_ORIGIN + '/v0/user/' + id + '.json';
      const response = await fetch(url);
      const data = response.ok ? await response.json() : null;
      if (data === null) {
        this.user$.value = null;
        this.error$.value = { error: `User ${id} not found.` };
      } else {
        this.user$.value = data;
        this.error$.value = null;
      }
    } finally {
      this.isLoading$.value = false;
    }
  }
}

export interface Error {
  error: string;
}
