/// <reference path="../typings/scheduler.d.ts" />

export const directiveTag: unique symbol = Symbol('Directive');

export interface Binding<TValue, TContext = unknown> {
  get value(): TValue;
  get part(): Part;
  get startNode(): ChildNode;
  get endNode(): ChildNode;
  connect(context: UpdateContext<TContext>): void;
  bind(newValue: TValue, context: UpdateContext<TContext>): void;
  unbind(context: UpdateContext<TContext>): void;
  disconnect(context: UpdateContext<TContext>): void;
}

export interface Directive<TThis, TContext = unknown> {
  [directiveTag](
    this: TThis,
    part: Part,
    context: DirectiveContext<TContext>,
  ): Binding<TThis, TContext>;
}

export interface Block<TContext = unknown> {
  get binding(): Binding<unknown, TContext>;
  get isUpdating(): boolean;
  get parent(): Block<TContext> | null;
  get priority(): TaskPriority;
  shouldUpdate(): boolean;
  cancelUpdate(): void;
  requestUpdate(priority: TaskPriority, context: UpdateContext<TContext>): void;
  update(context: UpdateContext<TContext>): void;
}

// Re-export TaskPriority in Scheduler API.
export type TaskPriority = globalThis.TaskPriority;

export type ComponentType<TProps, TValues, TContext> = (
  props: TProps,
  context: TContext,
) => TemplateResult<TValues, TContext>;

export interface UpdateQueue<TContext> {
  blocks: Block<TContext>[];
  mutationEffects: Effect[];
  layoutEffects: Effect[];
  passiveEffects: Effect[];
  flags: number;
}

export enum UpdateFlag {
  None = 0b0,
  InProgress = 0b1,
}

export interface RenderHost<TContext> {
  flushComponent<TProps, TValues>(
    type: ComponentType<TProps, TValues, TContext>,
    props: TProps,
    hooks: Hook[],
    updater: Updater<TContext>,
    block: Block<TContext>,
    queue: UpdateQueue<TContext>,
  ): TemplateResult<TValues, TContext>;
  flushEffects(effects: Effect[], phase: CommitPhase): void;
  getCurrentPriority(): TaskPriority;
  getTemplate<TValues extends readonly any[]>(
    strings: readonly string[],
    values: TValues,
    mode: TemplateMode,
  ): Template<TValues, TContext>;
  getHostName(): string;
  getScopedValue(key: unknown, block: Block<TContext>): unknown;
  getUnsafeTemplate(
    content: string,
    mode: TemplateMode,
  ): Template<readonly [], TContext>;
  nextIdentifier(): number;
  resolveBinding<TValue>(value: TValue, part: Part): Binding<TValue, TContext>;
  setScopedValue(key: unknown, value: unknown, block: Block<TContext>): void;
}

export interface Updater<TContext> {
  isScheduled(): boolean;
  flushUpdate(queue: UpdateQueue<TContext>, host: RenderHost<TContext>): void;
  scheduleUpdate(
    queue: UpdateQueue<TContext>,
    host: RenderHost<TContext>,
  ): void;
  waitForUpdate(): Promise<void>;
}

export interface Template<TValues, TContext = unknown> {
  render(
    values: TValues,
    context: DirectiveContext<TContext>,
  ): TemplateView<TValues, TContext>;
  isSameTemplate(other: Template<unknown, unknown>): boolean;
  wrapInResult(values: TValues): TemplateResult<TValues, TContext>;
}

export interface TemplateResult<
  TValues = readonly unknown[],
  TContext = unknown,
> {
  get template(): Template<TValues, TContext>;
  get values(): TValues;
}

export interface TemplateView<TValues, TContext = unknown> {
  get startNode(): ChildNode | null;
  get endNode(): ChildNode | null;
  connect(context: UpdateContext<TContext>): void;
  bind(values: TValues, context: UpdateContext<TContext>): void;
  unbind(context: UpdateContext<TContext>): void;
  disconnect(context: UpdateContext<TContext>): void;
  mount(part: ChildNodePart): void;
  unmount(part: ChildNodePart): void;
}

export type TemplateMode = 'html' | 'math' | 'svg';

export interface Effect {
  commit(phase: CommitPhase): void;
}

export enum CommitPhase {
  Mutation,
  Layout,
  Passive,
}

export enum CommitStatus {
  Committed,
  Mounting,
  Unmounting,
}

export type Part =
  | AttributePart
  | ChildNodePart
  | ElementPart
  | EventPart
  | NodePart
  | PropertyPart;

export enum PartType {
  Attribute,
  ChildNode,
  Element,
  Event,
  Node,
  Property,
}

export interface AttributePart {
  type: PartType.Attribute;
  node: Element;
  name: string;
}

export interface ChildNodePart {
  type: PartType.ChildNode;
  node: Comment;
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
  | IdentifierHook
  | MemoHook<any>
  | ReducerHook<any, any>
  | FinalizerHook;

export enum HookType {
  InsertionEffect,
  LayoutEffect,
  PassiveEffect,
  Identifier,
  Memo,
  Reducer,
  Finalizer,
}

export interface EffectHook {
  type:
    | HookType.InsertionEffect
    | HookType.LayoutEffect
    | HookType.PassiveEffect;
  callback: EffectCallback;
  cleanup: Cleanup | void;
  dependencies: unknown[] | null;
}

export interface IdentifierHook {
  type: HookType.Identifier;
  id: number;
}

export interface MemoHook<TResult> {
  type: HookType.Memo;
  value: TResult;
  dependencies: unknown[] | null;
}

export interface ReducerHook<TState, TAction> {
  type: HookType.Reducer;
  dispatch: (action: TAction) => void;
  state: TState;
}

export interface FinalizerHook {
  type: HookType.Finalizer;
}

export type Cleanup = () => void;

export type EffectCallback = () => Cleanup | void;

export type RefCallback<T> = (value: T) => Cleanup | void;

export interface RefObject<T> {
  current: T;
}

export interface DirectiveContext<TContext = unknown> {
  readonly host: RenderHost<TContext>;
  readonly block: Block<TContext> | null;
}

export class UpdateContext<TContext = unknown> {
  constructor(
    public readonly host: RenderHost<TContext>,
    public readonly updater: Updater<TContext>,
    public readonly block: Block<TContext>,
    /**
     * @internal
     */
    public readonly queue: UpdateQueue<TContext> = createUpdateQueue(),
  ) {}

  enqueueBlock(block: Block<TContext>): void {
    this.queue.blocks.push(block);
  }

  enqueueMutationEffect(effect: Effect): void {
    this.queue.mutationEffects.push(effect);
  }

  enqueueLayoutEffect(effect: Effect): void {
    this.queue.layoutEffects.push(effect);
  }

  enqueuePassiveEffect(effect: Effect): void {
    this.queue.passiveEffects.push(effect);
  }

  flushComponent<TProps, TValues>(
    type: ComponentType<TProps, TValues, TContext>,
    props: TProps,
    hooks: Hook[],
  ): TemplateResult<TValues, TContext> {
    return this.host.flushComponent(
      type,
      props,
      hooks,
      this.updater,
      this.block,
      this.queue,
    );
  }

  flushUpdate(): void {
    this.updater.flushUpdate(this.queue, this.host);
  }

  isPending(): boolean {
    return (
      this.updater.isScheduled() ||
      this.queue.blocks.length > 0 ||
      this.queue.mutationEffects.length > 0 ||
      this.queue.layoutEffects.length > 0 ||
      this.queue.passiveEffects.length > 0
    );
  }

  scheduleUpdate(): void {
    this.updater.scheduleUpdate(this.queue, this.host);
  }
}

export function createUpdateQueue<TContext>(
  flags: number = UpdateFlag.None,
): UpdateQueue<TContext> {
  return {
    blocks: [],
    mutationEffects: [],
    layoutEffects: [],
    passiveEffects: [],
    flags,
  };
}

export function isDirective<TValue>(
  value: TValue,
): value is TValue & Directive<TValue> {
  return value !== null && typeof value === 'object' && directiveTag in value;
}

export function resolveBinding<TValue, TContext>(
  value: TValue,
  part: Part,
  context: DirectiveContext<TContext>,
): Binding<TValue, TContext> {
  if (isDirective(value)) {
    return value[directiveTag](part, context);
  } else {
    return context.host.resolveBinding(value, part);
  }
}
