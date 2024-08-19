import type { RenderContext } from './renderContext.js';

export interface Route<
  TResult,
  TPatterns extends Pattern[] = Pattern[],
  TInheritArgs extends unknown[] = [],
> {
  patterns: TPatterns;
  handler: Handler<
    [...TInheritArgs, ...ExtractArgs<TPatterns>],
    TResult
  > | null;
  childRoutes: Route<
    TResult,
    Pattern[],
    [...TInheritArgs, ...ExtractArgs<TPatterns>]
  >[];
}

export type Pattern =
  | string
  | RegExp
  | ((component: string, url: RelativeURL, state: unknown) => any);

export type Handler<TArgs extends any[], TResult> = (
  args: TArgs,
  url: RelativeURL,
  state: unknown,
) => TResult;

export interface LocationState {
  readonly url: RelativeURL;
  readonly state: unknown;
  readonly scrollReset: boolean;
  readonly reason: NavigateReason;
}

export type NavigateFunction = (
  url: RelativeURL,
  options?: NavigateOptions,
) => void;

export enum NavigateReason {
  Load,
  Pop,
  Push,
  Replace,
}

export interface NavigateOptions {
  replace?: boolean;
  scrollReset?: boolean;
  state?: unknown;
}

export interface LocationLike {
  pathname: string;
  search: string;
  hash: string;
}

export interface LinkClickHandlerOptions {
  container?: GlobalEventHandlers;
}

type ExtractArgs<TPatterns> = TPatterns extends []
  ? []
  : TPatterns extends [infer THead, ...infer TTail]
    ? [...Match<THead>, ...ExtractArgs<TTail>]
    : unknown[];

type Match<TPattern> = TPattern extends string
  ? []
  : TPattern extends RegExp
    ? [string]
    : TPattern extends (
          component: string,
          url: RelativeURL,
          stae: unknown,
        ) => NonNullable<infer TResult> | null
      ? [TResult]
      : never;

export class Router<TResult> {
  private readonly _routes: Route<TResult>[] = [];

  constructor(routes: Route<TResult>[]) {
    this._routes = routes;
  }

  match(url: RelativeURL, state: unknown = null): TResult | null {
    const path = url.pathname;
    const pathWithoutInitialSlash = path[0] === '/' ? path.slice(1) : path;
    const components = pathWithoutInitialSlash.split('/');

    let routes = this._routes;
    let routeIndex = 0;
    let componentIndex = 0;
    let allArgs: unknown[] = [];

    while (routeIndex < routes.length) {
      const { patterns, childRoutes, handler } = routes[routeIndex]!;
      const args = extractArgs(
        patterns,
        components.slice(componentIndex, componentIndex + patterns.length),
        url,
        state,
      );

      if (args !== null) {
        if (components.length === componentIndex + patterns.length) {
          return handler !== null
            ? handler(allArgs.concat(args), url, state)
            : null;
        }
        if (childRoutes.length > 0) {
          allArgs = allArgs.concat(args);
          routes = childRoutes;
          routeIndex = 0;
          componentIndex += patterns.length;
        } else {
          routeIndex++;
        }
      } else {
        routeIndex++;
      }
    }

    return null;
  }
}

export class RelativeURL {
  private readonly _pathname: string;

  private readonly _searchParams: URLSearchParams;

  private readonly _hash: string;

  static from(value: RelativeURL | URL | LocationLike | string): RelativeURL {
    if (value instanceof RelativeURL) {
      return value;
    }
    if (value instanceof URL) {
      return RelativeURL.fromURL(value);
    }
    if (typeof value === 'object') {
      return RelativeURL.fromLocation(value);
    }
    return RelativeURL.fromString(value);
  }

  static fromString(urlString: string): RelativeURL {
    // SAFETY: Relative URLs can always be safely initialized.
    return RelativeURL.fromURL(new URL(urlString, 'file:'));
  }

  static fromLocation(location: LocationLike) {
    const { pathname, search, hash } = location;
    return new RelativeURL(pathname, search, hash);
  }

  static fromURL(url: URL): RelativeURL {
    const { pathname, searchParams, hash } = url;
    return new RelativeURL(pathname, searchParams, hash);
  }

  constructor(
    pathname: string,
    search: ConstructorParameters<typeof URLSearchParams>[0] = '',
    hash = '',
  ) {
    this._pathname = pathname;
    this._searchParams = new URLSearchParams(search);
    this._hash = hash;
  }

  get pathname(): string {
    return this._pathname;
  }

  get search(): string {
    return this._searchParams.size > 0
      ? '?' + this._searchParams.toString()
      : '';
  }

  get searchParams(): URLSearchParams {
    return this._searchParams;
  }

  get hash(): string {
    return this._hash;
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this._pathname + this.search + this._hash;
  }
}

export function browserLocation(
  context: RenderContext,
): readonly [LocationState, NavigateFunction] {
  const [locationState, setLocationState] = context.useState<LocationState>(
    () => ({
      url: RelativeURL.fromLocation(location),
      state: history.state,
      scrollReset: false,
      reason: NavigateReason.Load,
    }),
  );

  const navigate = context.useCallback(
    (
      url: RelativeURL,
      {
        replace = false,
        scrollReset = true,
        state = null,
      }: NavigateOptions = {},
    ) => {
      let reason: NavigateReason;
      if (replace) {
        history.replaceState(state, '', url.toString());
        reason = NavigateReason.Replace;
      } else {
        history.pushState(state, '', url.toString());
        reason = NavigateReason.Push;
      }
      setLocationState({
        url,
        state,
        scrollReset,
        reason,
      });
    },
    [],
  );

  context.useEffect(() => {
    const popStateHandler = (event: PopStateEvent) => {
      setLocationState({
        url: RelativeURL.fromLocation(location),
        state: event.state,
        scrollReset: history.scrollRestoration === 'manual',
        reason: NavigateReason.Pop,
      });
    };
    addEventListener('popstate', popStateHandler);
    return () => {
      removeEventListener('popstate', popStateHandler);
    };
  }, []);

  const value = [locationState, navigate] as const;

  context.setContextValue(currentLocation, value);

  return value;
}

export function currentLocation(
  context: RenderContext,
): readonly [LocationState, NavigateFunction] {
  const value = context.getContextValue(currentLocation);

  if (value == null) {
    throw new Error(
      'A context value for the current location does not exist, please ensure it is registered by context.use() with browserLocation or hashLocation.',
    );
  }

  return value as [LocationState, NavigateFunction];
}

export function hashLocation(
  context: RenderContext,
): readonly [LocationState, NavigateFunction] {
  const [locationState, setLocationState] = context.useState<LocationState>(
    () => ({
      url: RelativeURL.fromString(location.hash.slice(1)),
      state: history.state,
      scrollReset: false,
      reason: NavigateReason.Load,
    }),
  );

  const navigate = context.useCallback(
    (
      url: RelativeURL,
      {
        replace = false,
        scrollReset = true,
        state = null,
      }: NavigateOptions = {},
    ) => {
      let reason: NavigateReason;
      if (replace) {
        history.replaceState(state, '', '#' + url.toString());
        reason = NavigateReason.Replace;
      } else {
        history.pushState(state, '', '#' + url.toString());
        reason = NavigateReason.Push;
      }
      setLocationState({
        url,
        state,
        scrollReset,
        reason,
      });
    },
    [],
  );

  context.useEffect(() => {
    const hashChangeHandler = () => {
      setLocationState({
        url: RelativeURL.fromString(location.hash.slice(1)),
        state: history.state,
        scrollReset: history.scrollRestoration === 'manual',
        reason: NavigateReason.Pop,
      });
    };
    addEventListener('hashchange', hashChangeHandler);
    return () => {
      removeEventListener('hashchange', hashChangeHandler);
    };
  }, []);

  const value = [locationState, navigate] as const;

  context.setContextValue(currentLocation, value);

  return value;
}

export function createFormSubmitHandler(
  navigate: NavigateFunction,
): (event: SubmitEvent) => void {
  return (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const form = event.target as HTMLFormElement;
    const submitter = event.submitter as
      | HTMLButtonElement
      | HTMLInputElement
      | null;
    const method = submitter?.formMethod ?? form.method;

    if (method !== 'get') {
      return;
    }

    const actionUrl = new URL(
      submitter?.hasAttribute('formaction')
        ? submitter.formAction
        : form.action,
    );
    if (actionUrl.origin !== location.origin) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const searchParams = new URLSearchParams(
      new FormData(form, submitter) as any,
    );
    const url = new RelativeURL(
      actionUrl.pathname,
      searchParams,
      actionUrl.hash,
    );
    const replace =
      form.hasAttribute('data-link-replace') ||
      url.toString() === location.href;
    const scrollReset = !form.hasAttribute('data-link-no-scroll-reset');

    navigate(url, { replace, scrollReset });
  };
}

export function createLinkClickHandler(
  navigate: NavigateFunction,
): (event: MouseEvent) => void {
  return (event) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.button !== 0 ||
      event.defaultPrevented
    ) {
      return;
    }
    // Find a link element excluding nodes in closed shadow trees by
    // composedPath().
    const link = (event.composedPath() as Element[]).find(isLinkElement);
    if (link === undefined || link.origin !== location.origin) {
      return;
    }
    event.preventDefault();
    const url = RelativeURL.fromLocation(link);
    const replace =
      link.hasAttribute('data-link-replace') || link.href === location.href;
    const scrollReset = !link.hasAttribute('data-link-no-scroll-reset');
    navigate(url, { replace, scrollReset });
  };
}

export function resetScrollPosition(locationState: LocationState): void {
  const { url, scrollReset } = locationState;

  if (!scrollReset) {
    return;
  }

  if (url.hash !== '') {
    const hash = decodeURIComponent(url.hash.slice(1));
    const element = document.getElementById(hash);

    if (element !== null) {
      element.scrollIntoView();
      return;
    }
  }

  scrollTo(0, 0);
}

export function integer(component: string): number | null {
  const n = Number.parseInt(component, 10);
  return n.toString() === component ? n : null;
}

export function route<
  TResult,
  const TPatterns extends Pattern[] = Pattern[],
  const TInheritArgs extends unknown[] = [],
>(
  patterns: TPatterns,
  handler: Handler<
    [...TInheritArgs, ...ExtractArgs<TPatterns>],
    TResult
  > | null,
  childRoutes: Route<
    TResult,
    Pattern[],
    [...TInheritArgs, ...ExtractArgs<TPatterns>]
  >[] = [],
): Route<TResult, TPatterns, TInheritArgs> {
  return {
    patterns,
    handler,
    childRoutes,
  };
}

export function wildcard(component: string): string {
  return component;
}

function extractArgs<TPatterns extends Pattern[]>(
  patterns: TPatterns,
  components: string[],
  url: RelativeURL,
  state: unknown,
): ExtractArgs<TPatterns> | null {
  if (patterns.length !== components.length) {
    return null;
  }
  const args: unknown[] = [];
  for (let i = 0, l = patterns.length; i < l; i++) {
    const pattern = patterns[i]!;
    const component = components[i]!;
    if (typeof pattern === 'string') {
      if (pattern !== component) {
        return null;
      }
    } else if (typeof pattern === 'function') {
      const match = pattern(component, url, state);
      if (match == null) {
        return null;
      }
      args.push(match);
    } else {
      const match = component.match(pattern);
      if (match === null) {
        return null;
      }
      args.push(match[0]);
    }
  }
  return args as ExtractArgs<TPatterns>;
}

function isLinkElement(element: Element): element is HTMLAnchorElement {
  return (
    element.tagName === 'A' &&
    element.hasAttribute('href') &&
    !element.hasAttribute('target') &&
    !element.hasAttribute('download') &&
    element.getAttribute('rel') !== 'external'
  );
}
