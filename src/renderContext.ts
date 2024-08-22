import {
  type Block,
  type Cleanup,
  type Effect,
  type EffectCallback,
  type EffectHook,
  type FinalizerHook,
  type Hook,
  HookType,
  type IdentifierHook,
  type MemoHook,
  PartType,
  type ReducerHook,
  type RefObject,
  type TaskPriority,
  type TemplateDirective,
  type TemplateView,
  UpdateContext,
  type UpdateQueue,
  type UpdateRuntime,
  type Updater,
} from './baseTypes.js';
import { resolveBinding } from './binding.js';
import { dependenciesAreChanged } from './compare.js';
import {
  LazyTemplateResult,
  TemplateResult,
} from './directives/templateResult.js';
import {
  type ElementData,
  ElementTemplate,
} from './templates/elementTemplate.js';
import { EmptyTemplate } from './templates/emptyTemplate.js';
import { LazyTemplate } from './templates/lazyTemplate.js';
import { TextTemplate, ValueTemplate } from './templates/singleTemplate.js';
import {
  UnsafeHTMLTemplate,
  UnsafeSVGTemplate,
} from './templates/unsafeContentTemplate.js';

export const usableTag = Symbol('Usable');

export type Usable<TResult, TContext> =
  | UsableObject<TResult, TContext>
  | UsableCallback<TResult, TContext>;

export interface UsableObject<TResult, TContext> {
  [usableTag](context: TContext): TResult;
}

export type UsableCallback<TResult, TContext> = (context: TContext) => TResult;

export type InitialState<TState> = [TState] extends [Function]
  ? () => TState
  : (() => TState) | TState;

export type NewState<TState> = [TState] extends [Function]
  ? (prevState: TState) => TState
  : ((prevState: TState) => TState) | TState;

export class RenderContext {
  private readonly _host: UpdateRuntime<RenderContext>;

  private readonly _updater: Updater<RenderContext>;

  private readonly _block: Block<RenderContext>;

  private readonly _hooks: Hook[];

  private readonly _queue: UpdateQueue<RenderContext>;

  private _hookIndex = 0;

  constructor(
    host: UpdateRuntime<RenderContext>,
    updater: Updater<RenderContext>,
    block: Block<RenderContext>,
    hooks: Hook[],
    queue: UpdateQueue<RenderContext>,
  ) {
    this._host = host;
    this._updater = updater;
    this._block = block;
    this._hooks = hooks;
    this._queue = queue;
  }

  element<TElementValue, TChildNodeValue>(
    type: string,
    elementValue: TElementValue,
    childNodeValue: TChildNodeValue,
  ): TemplateResult<
    ElementData<TElementValue, TChildNodeValue>,
    RenderContext
  > {
    const template = new ElementTemplate<TElementValue, TChildNodeValue>(type);
    return new TemplateResult(template, { elementValue, childNodeValue });
  }

  empty(): TemplateResult<null, RenderContext> {
    const template = EmptyTemplate.instance;
    return new TemplateResult(template, null);
  }

  /**
   * @internal
   */
  finalize(): void {
    const currentHook = this._hooks[this._hookIndex++];

    if (currentHook !== undefined) {
      ensureHookType<FinalizerHook>(HookType.Finalizer, currentHook);
    } else {
      this._hooks.push({ type: HookType.Finalizer });

      // Refuse to use new hooks after finalization.
      Object.freeze(this._hooks);
    }
  }

  forceUpdate(priority?: TaskPriority): void {
    const context = new UpdateContext(
      this._host,
      this._updater,
      this._block,
      this._queue,
    );
    this._block.requestUpdate(
      priority ?? this._host.getCurrentPriority(),
      context,
    );
  }

  getContextValue(key: unknown): unknown {
    return this._host.getScopedValue(key, this._block);
  }

  html<TData extends readonly any[]>(
    tokens: TemplateStringsArray,
    ...data: TData
  ): LazyTemplateResult<TData, RenderContext> {
    const host = this._host;
    const template = new LazyTemplate(
      () => host.getHTMLTemplate(tokens, data),
      tokens,
    );
    return new LazyTemplateResult(template, data);
  }

  isFirstRender(): boolean {
    return this._hooks.at(-1)?.type !== HookType.Finalizer;
  }

  isRendering(): boolean {
    return this._hooks[this._hookIndex - 1]?.type !== HookType.Finalizer;
  }

  only<T>(value: T): TemplateResult<T, RenderContext> {
    const template = ValueTemplate.instance;
    return new TemplateResult(template, value);
  }

  setContextValue(key: unknown, value: unknown): void {
    this._host.setScopedValue(key, value, this._block);
  }

  svg<TData extends readonly any[]>(
    tokens: TemplateStringsArray,
    ...data: TData
  ): LazyTemplateResult<TData, RenderContext> {
    const host = this._host;
    const template = new LazyTemplate(
      () => host.getSVGTemplate(tokens, data),
      tokens,
    );
    return new LazyTemplateResult(template, data);
  }

  text<T>(value: T): TemplateResult<T, RenderContext> {
    const template = TextTemplate.instance;
    return new TemplateResult(template, value);
  }

  unsafeHTML(content: string): LazyTemplateResult<null, RenderContext> {
    const template = new UnsafeHTMLTemplate(content);
    return new LazyTemplateResult(template, null);
  }

  unsafeSVG(content: string): LazyTemplateResult<null, RenderContext> {
    const template = new UnsafeSVGTemplate(content);
    return new LazyTemplateResult(template, null);
  }

  use<TResult>(usable: Usable<TResult, RenderContext>): TResult {
    return usableTag in usable ? usable[usableTag](this) : usable(this);
  }

  useCallback<TCallback extends Function>(
    callback: TCallback,
    dependencies: unknown[],
  ): TCallback {
    return this.useMemo(() => callback, dependencies);
  }

  useDeferredValue<TValue>(value: TValue, initialValue?: TValue): TValue {
    const [deferredValue, setDeferredValue] = this.useState<TValue>(
      (() => initialValue ?? value) as InitialState<TValue>,
    );

    this.useEffect(() => {
      setDeferredValue((() => value) as NewState<TValue>, 'background');
    }, [value]);

    return deferredValue;
  }

  useEffect(callback: EffectCallback, dependencies?: unknown[]): void {
    const currentHook = this._hooks[this._hookIndex++];

    if (currentHook !== undefined) {
      ensureHookType<EffectHook>(HookType.PassiveEffect, currentHook);

      if (dependenciesAreChanged(currentHook.dependencies, dependencies)) {
        this._queue.passiveEffects.push(new InvokeEffectHook(currentHook));
      }

      currentHook.callback = callback;
      currentHook.dependencies = dependencies;
    } else {
      const hook: EffectHook = {
        type: HookType.PassiveEffect,
        callback,
        dependencies,
        cleanup: undefined,
      };
      this._hooks.push(hook);
      this._queue.passiveEffects.push(new InvokeEffectHook(hook));
    }
  }

  useId(): string {
    let currentHook = this._hooks[this._hookIndex++];

    if (currentHook !== undefined) {
      ensureHookType<IdentifierHook>(HookType.Identifier, currentHook);
    } else {
      currentHook = {
        type: HookType.Identifier,
        id: this._host.nextIdentifier(),
      };
      this._hooks.push(currentHook);
    }

    return ':' + this._host.getHostName() + '-' + currentHook.id + ':';
  }

  useInsertionEffect(callback: EffectCallback, dependencies?: unknown[]): void {
    const currentHook = this._hooks[this._hookIndex++];

    if (currentHook !== undefined) {
      ensureHookType<EffectHook>(HookType.InsertionEffect, currentHook);

      if (dependenciesAreChanged(currentHook.dependencies, dependencies)) {
        this._queue.mutationEffects.push(new InvokeEffectHook(currentHook));
      }

      currentHook.callback = callback;
      currentHook.dependencies = dependencies;
    } else {
      const hook: EffectHook = {
        type: HookType.InsertionEffect,
        callback,
        dependencies,
        cleanup: undefined,
      };
      this._hooks.push(hook);
      this._queue.mutationEffects.push(new InvokeEffectHook(hook));
    }
  }

  useLayoutEffect(callback: EffectCallback, dependencies?: unknown[]): void {
    const currentHook = this._hooks[this._hookIndex++];

    if (currentHook !== undefined) {
      ensureHookType<EffectHook>(HookType.LayoutEffect, currentHook);

      if (dependenciesAreChanged(currentHook.dependencies, dependencies)) {
        this._queue.layoutEffects.push(new InvokeEffectHook(currentHook));
      }

      currentHook.callback = callback;
      currentHook.dependencies = dependencies;
    } else {
      const hook: EffectHook = {
        type: HookType.LayoutEffect,
        callback,
        dependencies,
        cleanup: undefined,
      };
      this._hooks.push(hook);
      this._queue.layoutEffects.push(new InvokeEffectHook(hook));
    }
  }

  useMemo<TResult>(factory: () => TResult, dependencies: unknown[]): TResult {
    let currentHook = this._hooks[this._hookIndex++];

    if (currentHook !== undefined) {
      ensureHookType<MemoHook<TResult>>(HookType.Memo, currentHook);

      if (dependenciesAreChanged(currentHook.dependencies, dependencies)) {
        currentHook.value = factory();
        currentHook.dependencies = dependencies;
      }
    } else {
      currentHook = {
        type: HookType.Memo,
        value: factory(),
        dependencies,
      };
      this._hooks.push(currentHook);
    }

    return currentHook.value;
  }

  useReducer<TState, TAction>(
    reducer: (state: TState, action: TAction) => TState,
    initialState: InitialState<TState>,
  ): readonly [TState, (action: TAction, priority?: TaskPriority) => void] {
    let currentHook = this._hooks[this._hookIndex++];

    if (currentHook !== undefined) {
      ensureHookType<ReducerHook<TState, TAction>>(
        HookType.Reducer,
        currentHook,
      );
    } else {
      const hook: ReducerHook<TState, TAction> = {
        type: HookType.Reducer,
        state:
          typeof initialState === 'function' ? initialState() : initialState,
        dispatch: (action: TAction, priority?: TaskPriority) => {
          const nextState = reducer(hook.state, action);
          if (!Object.is(hook.state, nextState)) {
            hook.state = nextState;
            this.forceUpdate(priority);
          }
        },
      };
      currentHook = hook;
      this._hooks.push(hook);
    }

    return [currentHook.state, currentHook.dispatch];
  }

  useRef<T>(initialValue: T): RefObject<T> {
    return this.useMemo(() => ({ current: initialValue }), []);
  }

  useState<TState>(
    initialState: InitialState<TState>,
  ): readonly [
    TState,
    (newState: NewState<TState>, priority?: TaskPriority) => void,
  ] {
    return this.useReducer(
      (state, action) =>
        typeof action === 'function' ? action(state) : action,
      initialState,
    );
  }

  useSyncEnternalStore<T>(
    subscribe: (subscruber: () => void) => Cleanup | void,
    getSnapshot: () => T,
    priority?: TaskPriority,
  ): T {
    this.useEffect(
      () =>
        subscribe(() => {
          this.forceUpdate(priority);
        }),
      [subscribe, priority],
    );
    return getSnapshot();
  }
}

class InvokeEffectHook implements Effect {
  private readonly _hook: EffectHook;

  constructor(hook: EffectHook) {
    this._hook = hook;
  }

  commit(): void {
    const { cleanup, callback } = this._hook;
    cleanup?.();
    this._hook.cleanup = callback();
  }
}

function ensureHookType<TExpectedHook extends Hook>(
  expectedType: TExpectedHook['type'],
  hook: Hook,
): asserts hook is TExpectedHook {
  if (hook.type !== expectedType) {
    throw new Error(
      `Unexpected hook type. Expected "${expectedType}" but got "${hook.type}".`,
    );
  }
}
