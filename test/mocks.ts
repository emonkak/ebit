import type {
  RequestCallbackOptions,
  Scheduler,
  YieldToMainOptions,
} from '../src/scheduler.js';
import {
  type Binding,
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
  type UpdateBlock,
  type UpdateContext,
  type Updater,
  directiveTag,
} from '../src/types.js';

export class MockBinding implements Binding<MockDirective>, Effect {
  private _directive: MockDirective;

  private readonly _part: Part;

  private _text: Text = document.createTextNode('');

  constructor(value: MockDirective, part: Part) {
    this._directive = value;
    this._part = part;
  }

  get value(): MockDirective {
    return this._directive;
  }

  get part(): Part {
    return this._part;
  }

  get startNode(): ChildNode {
    return this._text.parentNode !== null ? this._text : this._part.node;
  }

  get endNode(): ChildNode {
    return this._part.node;
  }

  bind(newValue: MockDirective, updater: Updater): void {
    this._directive = newValue;
    updater.enqueueMutationEffect(this);
  }

  connect(updater: Updater): void {
    updater.enqueueMutationEffect(this);
  }

  unbind(updater: Updater): void {
    this._directive = new MockDirective(null);
    updater.enqueueMutationEffect(this);
  }

  disconnect(): void {}

  commit() {
    const { content } = this._directive;

    this._text.nodeValue = content;

    if (content !== null) {
      this._part.node.before(this._text);
    } else {
      this._text.remove();
    }
  }
}

export class MockUpdateBlock<TContext> implements UpdateBlock<TContext> {
  private _parent: UpdateBlock<TContext> | null;

  constructor(parent: UpdateBlock<TContext> | null = null) {
    this._parent = parent;
  }

  get isUpdating(): boolean {
    return false;
  }

  get parent(): UpdateBlock<TContext> | null {
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

  performUpdate(
    _context: UpdateContext<TContext>,
    _updater: Updater<TContext>,
  ): void {}
}

export class MockDirective implements Directive {
  private _content: string | null;

  constructor(content: string | null = null) {
    this._content = content;
  }

  get content(): string | null {
    return this._content;
  }

  [directiveTag](part: Part, _updater: Updater<unknown>): MockBinding {
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

export interface MockRenderContext {
  hooks: Hook[];
  block: UpdateBlock<MockRenderContext>;
  updater: Updater<MockRenderContext>;
}

export class MockUpdateContext implements UpdateContext<MockRenderContext> {
  flushEffects(effects: Effect[], phase: EffectPhase): void {
    for (let i = 0, l = effects.length; i < l; i++) {
      effects[i]!.commit(phase);
    }
  }

  renderComponent<TProps>(
    component: ComponentFunction<TProps, MockRenderContext>,
    props: TProps,
    hooks: Hook[],
    block: UpdateBlock<MockRenderContext>,
    updater: Updater<MockRenderContext>,
  ): TemplateResultInterface<unknown, MockRenderContext> {
    return component(props, { hooks, block, updater });
  }
}

export class MockTemplate<TContext> implements Template<{}, TContext> {
  private _id: number;

  constructor(id = 0) {
    this._id = id;
  }

  render(
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

  bind(_data: {}, _updater: Updater<TContext>): void {}

  unbind(_updater: Updater): void {}

  mount(_part: ChildNodePart): void {}

  unmount(_part: ChildNodePart): void {}

  disconnect(): void {}
}
