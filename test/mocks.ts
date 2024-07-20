import type {
  RequestCallbackOptions,
  Scheduler,
  YieldToMainOptions,
} from '../src/scheduler.js';
import {
  type Binding,
  type Block,
  type ChildNodePart,
  type ComponentFunction,
  type Directive,
  type Effect,
  type EffectPhase,
  type Hook,
  type Part,
  type TaskPriority,
  type Template,
  type TemplateFragment,
  type TemplateResultInterface,
  type UpdateContext,
  type Updater,
  directiveTag,
} from '../src/types.js';

export class MockBinding implements Binding<MockDirective> {
  private _value: MockDirective;

  private readonly _part: Part;

  constructor(value: MockDirective, part: Part) {
    this._value = value;
    this._part = part;
  }

  get value(): MockDirective {
    return this._value;
  }

  get part(): Part {
    return this._part;
  }

  get startNode(): ChildNode {
    return this._part.node;
  }

  get endNode(): ChildNode {
    return this._part.node;
  }

  bind(newValue: MockDirective, _updater: Updater): void {
    this._value = newValue;
  }

  connect(_updater: Updater): void {}

  unbind(_updater: Updater): void {}

  disconnect(): void {}
}

export class MockBlock<TContext> implements Block<TContext> {
  private _parent: Block<TContext> | null;

  constructor(parent: Block<TContext> | null = null) {
    this._parent = parent;
  }

  get dirty(): boolean {
    return false;
  }

  get parent(): Block<TContext> | null {
    return this._parent;
  }

  get priority(): TaskPriority {
    return 'background';
  }

  cancelUpdate(): void {}

  shouldUpdate(): boolean {
    return true;
  }

  requestUpdate(_priority: TaskPriority, _updater: Updater<TContext>): void {}

  update(
    _context: UpdateContext<TContext>,
    _updater: Updater<TContext>,
  ): void {}
}

export class MockDirective implements Directive {
  [directiveTag](part: Part, _updater: Updater): MockBinding {
    return new MockBinding(this, part);
  }
}

export class MockScheduler implements Scheduler {
  getCurrentTime(): number {
    return Date.now();
  }

  requestCallback(
    callback: () => void,
    _options?: RequestCallbackOptions,
  ): void {
    callback();
  }

  shouldYieldToMain(_elapsedTime: number): boolean {
    return false;
  }

  yieldToMain(_options?: YieldToMainOptions): Promise<void> {
    return Promise.resolve();
  }
}

export type MockRenderContext = {
  hooks: Hook[];
  block: Block<MockRenderContext>;
  updater: Updater<MockRenderContext>;
};

export class MockUpdateContext implements UpdateContext<MockRenderContext> {
  flushEffects(effects: Effect[], phase: EffectPhase): void {
    for (let i = 0, l = effects.length; i < l; i++) {
      effects[i]!.commit(phase);
    }
  }

  renderComponent<TProps, TData>(
    component: ComponentFunction<TProps, TData, MockRenderContext>,
    props: TProps,
    hooks: Hook[],
    block: Block<MockRenderContext>,
    updater: Updater<MockRenderContext>,
  ): TemplateResultInterface<TData, MockRenderContext> {
    return component(props, { hooks, block, updater });
  }
}

export class MockTemplate<TContext> implements Template<{}, TContext> {
  private _id: number;

  constructor(id = 0) {
    this._id = id;
  }

  hydrate(
    _data: {},
    _updater: Updater<TContext>,
  ): MockTemplateFragment<TContext> {
    return new MockTemplateFragment();
  }

  isSameTemplate(other: Template<{}, TContext>): boolean {
    return other instanceof MockTemplate && other._id === this._id;
  }
}

export class MockTemplateFragment<TContext>
  implements TemplateFragment<{}, TContext>
{
  get startNode(): ChildNode | null {
    return null;
  }

  get endNode(): ChildNode | null {
    return null;
  }

  attach(_data: {}, _updater: Updater<TContext>): void {}

  detach(_updater: Updater): void {}

  mount(_part: ChildNodePart): void {}

  unmount(_part: ChildNodePart): void {}

  disconnect(): void {}
}
