export interface RenderingEngine<TContext> {
  flushEffects(effects: Effect[], mode: EffectMode): void;
  getHTMLTemplate(
    tokens: ReadonlyArray<string>,
    data: unknown[],
  ): Template<unknown[], TContext>;
  getSVGTemplate(
    tokens: ReadonlyArray<string>,
    data: unknown[],
  ): Template<unknown[], TContext>;
  getVariable(component: Component<TContext>, key: PropertyKey): unknown;
  renderBlock<TProps, TData>(
    block: Block<TProps, TData, TContext>,
    props: TProps,
    hooks: Hook[],
    component: Component<TContext>,
    updater: Updater<TContext>,
  ): TemplateResult<TData, TContext>;
  setVariable(
    component: Component<TContext>,
    key: PropertyKey,
    value: unknown,
  ): void;
}

export interface Updater<TContext = unknown> {
  getCurrentComponent(): Component<TContext> | null;
  getCurrentPriority(): TaskPriority;
  isScheduled(): boolean;
  isUpdating(): boolean;
  waitForUpdate(): Promise<void>;
  enqueueComponent(component: Component<TContext>): void;
  enqueueLayoutEffect(effect: Effect): void;
  enqueueMutationEffect(effect: Effect): void;
  enqueuePassiveEffect(effect: Effect): void;
  scheduleUpdate(): void;
}

export interface Component<TContext = unknown> {
  get dirty(): boolean;
  get parent(): Component<TContext> | null;
  get priority(): TaskPriority;
  shouldUpdate(): boolean;
  update(engine: RenderingEngine<TContext>, updater: Updater<TContext>): void;
  requestUpdate(priority: TaskPriority, updater: Updater<TContext>): void;
}

export type Block<TProps, TData, TContext> = (
  props: TProps,
  context: TContext,
) => TemplateResult<TData, TContext>;

export interface Template<TData, TContext = unknown> {
  hydrate(
    data: TData,
    updater: Updater<TContext>,
  ): TemplateFragment<TData, TContext>;
  isSameTemplate(other: Template<TData, TContext>): boolean;
}

export interface TemplateFragment<TData, TContext = unknown> {
  get startNode(): ChildNode | null;
  get endNode(): ChildNode | null;
  bind(data: TData, updater: Updater<TContext>): void;
  unbind(updater: Updater): void;
  mount(part: ChildNodePart): void;
  unmount(part: ChildNodePart): void;
  disconnect(): void;
}

export interface TemplateResult<TData, TContext> {
  get template(): Template<TData, TContext>;
  get data(): TData;
}

export interface Effect {
  commit(mode: EffectMode): void;
}

export type EffectMode = 'mutation' | 'layout' | 'passive';

export type Part =
  | AttributePart
  | ChildNodePart
  | ElementPart
  | EventPart
  | NodePart
  | PropertyPart;

export enum PartType {
  Attribute = 0,
  ChildNode = 1,
  Element = 2,
  Event = 3,
  Node = 4,
  Property = 5,
}

export interface AttributePart {
  type: PartType.Attribute;
  node: Element;
  name: string;
}

export interface ChildNodePart {
  type: PartType.ChildNode;
  node: ChildNode;
}

export interface ElementPart {
  type: PartType.Element;
  node: Element;
}

export interface EventPart {
  type: PartType.Event;
  node: Element;
  name: string;
}

export interface PropertyPart {
  type: PartType.Property;
  node: Element;
  name: string;
}

export interface NodePart {
  type: PartType.Node;
  node: ChildNode;
}

export type Hook =
  | EffectHook
  | MemoHook<any>
  | ReducerHook<any, any>
  | FinilizerHook;

export enum HookType {
  Effect = 0,
  Memo = 1,
  Reducer = 2,
  Finalizer = 3,
}

export interface EffectHook {
  type: HookType.Effect;
  cleanup: Cleanup | void;
  dependencies: unknown[] | undefined;
}

export interface MemoHook<TResult> {
  type: HookType.Memo;
  value: TResult;
  dependencies: unknown[] | undefined;
}

export interface ReducerHook<TState, TAction> {
  type: HookType.Reducer;
  dispatch: (action: TAction) => void;
  state: TState;
}

export interface FinilizerHook {
  type: HookType.Finalizer;
}

export type Cleanup = () => void;

export type EffectCallback = () => Cleanup | void;

export type Ref<T> = RefCallback<T> | RefObject<T>;

export type RefCallback<T> = (value: T) => void;

export interface RefObject<T> {
  current: T;
}

// Reexport TaskPriority in Scheduler API.
export type TaskPriority = 'user-blocking' | 'user-visible' | 'background';
