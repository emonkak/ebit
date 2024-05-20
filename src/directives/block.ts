import {
  Binding,
  ChildNodePart,
  Directive,
  Part,
  PartType,
  directiveTag,
} from '../binding.js';
import { Hook, HookType } from '../context.js';
import {
  LOWEST_PRIORITY,
  TaskPriority,
  isHigherPriority,
} from '../scheduler.js';
import type { Scope } from '../scope.js';
import type { Template, TemplateRoot } from '../template.js';
import type { Component, Effect, Updater } from '../updater.js';
import type { TemplateDirective } from './template.js';

export type BlockType<TProps, TContext, TData> = (
  props: TProps,
  context: TContext,
) => TemplateDirective<TData>;

const BlockFlags = {
  NONE: 0,
  UPDATING: 1 << 0,
  MUTATING: 1 << 1,
  UNMOUNTING: 1 << 2,
};

export function block<TProps, TContext, TData>(
  type: BlockType<TProps, TContext, TData>,
  props: TProps,
): BlockDirective<TProps, TContext, TData> {
  return new BlockDirective(type, props);
}

export class BlockDirective<TProps, TContext, TData>
  implements Directive<TContext>
{
  private readonly _type: BlockType<TProps, TContext, TData>;

  private readonly _props: TProps;

  constructor(type: BlockType<TProps, TContext, TData>, props: TProps) {
    this._type = type;
    this._props = props;
  }

  get type(): BlockType<TProps, TContext, TData> {
    return this._type;
  }

  get props(): TProps {
    return this._props;
  }

  [directiveTag](
    part: Part,
    updater: Updater<TContext>,
  ): BlockBinding<TProps, TContext, TData> {
    if (part.type !== PartType.ChildNode) {
      throw new Error('BlockDirective must be used in ChildNodePart.');
    }

    const binding = new BlockBinding(this, part, updater.currentComponent);

    binding.bind(updater);

    return binding;
  }
}

export class BlockBinding<TProps, TContext, TData>
  implements
    Binding<BlockDirective<TProps, TContext, TData>>,
    Effect,
    Component<TContext>
{
  private readonly _part: ChildNodePart;

  private readonly _parent: Component<TContext> | null;

  private _value: BlockDirective<TProps, TContext, TData>;

  private _memoizedType: BlockType<TProps, TContext, TData> | null = null;

  private _memoizedTemplate: Template<TData> | null = null;

  private _pendingRoot: TemplateRoot<TData> | null = null;

  private _memoizedRoot: TemplateRoot<TData> | null = null;

  private _cachedRoots: WeakMap<Template<TData>, TemplateRoot<TData>> | null =
    null;

  private _hooks: Hook[] = [];

  private _priority: TaskPriority = LOWEST_PRIORITY;

  private _flags = BlockFlags.NONE;

  constructor(
    value: BlockDirective<TProps, TContext, TData>,
    part: ChildNodePart,
    parent: Component<TContext> | null = null,
  ) {
    this._value = value;
    this._part = part;
    this._parent = parent;
  }

  get part(): ChildNodePart {
    return this._part;
  }

  get startNode(): ChildNode {
    return this._memoizedRoot?.startNode ?? this._part.node;
  }

  get endNode(): ChildNode {
    return this._part.node;
  }

  get parent(): Component<TContext> | null {
    return this._parent;
  }

  get priority(): TaskPriority {
    return this._priority;
  }

  get dirty(): boolean {
    return !!(
      this._flags & BlockFlags.UPDATING || this._flags & BlockFlags.UNMOUNTING
    );
  }

  get value(): BlockDirective<TProps, TContext, TData> {
    return this._value;
  }

  set value(newValue: BlockDirective<TProps, TContext, TData>) {
    this._value = newValue;
  }

  requestUpdate(updater: Updater, priority: TaskPriority): void {
    if (
      !(this._flags & BlockFlags.UPDATING) ||
      isHigherPriority(priority, this._priority)
    ) {
      this._priority = priority;
      this._flags |= BlockFlags.UPDATING;
      updater.enqueueComponent(this);
      updater.scheduleUpdate();
    }

    this._flags &= ~BlockFlags.UNMOUNTING;
  }

  bind(updater: Updater): void {
    if (!(this._flags & BlockFlags.UPDATING)) {
      this._priority = this._parent?.priority ?? updater.getCurrentPriority();
      this._flags |= BlockFlags.UPDATING;
      updater.enqueueComponent(this);
    }

    this._flags &= ~BlockFlags.UNMOUNTING;
  }

  unbind(updater: Updater): void {
    this._pendingRoot?.unbindData(updater);

    if (this._memoizedRoot !== this._pendingRoot) {
      this._memoizedRoot?.unbindData(updater);
    }

    this._cleanHooks();
    this._requestMutation(updater);

    this._pendingRoot = null;
    this._flags |= BlockFlags.UNMOUNTING;
    this._flags &= ~BlockFlags.UPDATING;
  }

  render(updater: Updater<TContext>, scope: Scope<TContext>): void {
    const { type, props } = this._value;

    if (this._memoizedType !== null && type !== this._memoizedType) {
      this._cleanHooks();
    }

    const previousNumberOfHooks = this._hooks.length;
    const context = scope.createContext(this, this._hooks, updater);
    const { template, data } = type(props, context);

    if (this._pendingRoot !== null) {
      if (this._hooks.length !== previousNumberOfHooks) {
        throw new Error(
          'The block has been rendered different number of hooks than during the previous render.',
        );
      }

      if (this._memoizedTemplate !== template) {
        // First, unbind data of the current root.
        this._pendingRoot.unbindData(updater);

        // We need to mount child nodes before hydration.
        this._requestMutation(updater);

        let nextRoot;

        if (this._cachedRoots !== null) {
          nextRoot = this._cachedRoots.get(template);
          if (nextRoot !== undefined) {
            nextRoot.bindData(data, updater);
          } else {
            nextRoot = template.hydrate(data, updater);
          }
        } else {
          // It is rare that different templates are returned, so we defer
          // creating root caches.
          this._cachedRoots = new WeakMap();
          nextRoot = template.hydrate(data, updater);
        }

        // Remember the previous root for future renderings.
        this._cachedRoots.set(this._memoizedTemplate!, this._pendingRoot);

        this._pendingRoot = nextRoot;
      } else {
        this._pendingRoot.bindData(data, updater);
      }
    } else {
      // Child nodes must be mounted before hydration.
      this._requestMutation(updater);

      this._pendingRoot = template.hydrate(data, updater);
    }

    this._memoizedType = this._value.type;
    this._memoizedTemplate = template;
    this._priority = LOWEST_PRIORITY;
    this._flags &= ~BlockFlags.UPDATING;
  }

  disconnect(): void {
    this._pendingRoot?.disconnect();

    if (this._memoizedRoot !== this._pendingRoot) {
      this._memoizedRoot?.disconnect();
    }

    this._cleanHooks();

    this._pendingRoot = null;
  }

  commit(): void {
    if (this._flags & BlockFlags.UNMOUNTING) {
      this._memoizedRoot?.unmount(this._part);
    } else {
      this._memoizedRoot?.unmount(this._part);
      this._pendingRoot?.mount(this._part);
      this._memoizedRoot = this._pendingRoot;
    }

    this._flags &= ~(BlockFlags.MUTATING | BlockFlags.UNMOUNTING);
  }

  private _cleanHooks(): void {
    const hooks = this._hooks;
    this._hooks = [];
    for (let i = 0, l = hooks.length; i < l; i++) {
      const hook = hooks[i]!;
      if (hook.type === HookType.Effect) {
        hook.cleanup?.();
      }
    }
  }

  private _requestMutation(updater: Updater): void {
    if (!(this._flags & BlockFlags.MUTATING)) {
      updater.enqueueMutationEffect(this);
      this._flags |= BlockFlags.MUTATING;
    }
  }
}
