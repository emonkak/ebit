import {
  type Binding,
  type Block,
  type CommitPhase,
  type Effect,
  type Hook,
  type Part,
  PartType,
  type RenderHost,
  type TaskPriority,
  type Template,
  UpdateContext,
  type UpdateQueue,
  type Updater,
  nameOf,
  resolveBinding,
} from './baseTypes.js';
import { AttributeBinding } from './bindings/attribute.js';
import { BlockBinding } from './bindings/block.js';
import { ElementBinding } from './bindings/element.js';
import { EventBinding } from './bindings/event.js';
import { NodeBinding } from './bindings/node.js';
import { PropertyBinding } from './bindings/property.js';
import { RenderContext } from './renderContext.js';
import { LazyTemplate } from './templates/lazyTemplate.js';
import { TaggedTemplate, getMarker } from './templates/taggedTemplate.js';

export interface ClientRenderHostOptions {
  hostName?: string;
  constants?: Map<unknown, unknown>;
}

export interface Root<T> {
  mount(): void;
  unmount(): void;
  update(value: T): void;
}

export class ClientRenderHost implements RenderHost<RenderContext> {
  private readonly _constants: Map<unknown, unknown>;

  private readonly _scopes: WeakMap<
    Block<RenderContext>,
    Map<unknown, unknown>
  > = new WeakMap();

  private readonly _cachedTemplates: WeakMap<
    TemplateStringsArray,
    Template<readonly any[], RenderContext>
  > = new WeakMap();

  private _hostName: string;

  private _idCounter = 0;

  constructor({
    hostName = getRandomString(8),
    constants = new Map(),
  }: ClientRenderHostOptions = {}) {
    this._hostName = hostName;
    this._constants = constants;
  }

  beginRender(
    updater: Updater<RenderContext>,
    block: Block<RenderContext>,
    queue: UpdateQueue<RenderContext>,
    hooks: Hook[],
  ): RenderContext {
    return new RenderContext(this, updater, block, queue, hooks);
  }

  createRoot<TValue>(
    value: TValue,
    container: Node,
    updater: Updater<RenderContext>,
  ): Root<TValue> {
    const part = {
      type: PartType.ChildNode,
      node: document.createComment(''),
    } as const;

    DEBUG: {
      part.node.data = nameOf(value);
    }

    const binding = resolveBinding(value, part, { host: this, block: null });
    const block = BlockBinding.ofRoot(binding);
    const context = new UpdateContext(this, updater, block);

    return {
      mount(): void {
        context.enqueueMutationEffect(new MountNode(part.node, container));
        binding.connect(context);
        context.flushUpdate();
      },
      unmount(): void {
        binding.unbind(context);
        context.enqueueMutationEffect(new UnmountNode(part.node, container));
        context.flushUpdate();
      },
      update(newValue: TValue): void {
        binding.bind(newValue, context);
        context.flushUpdate();
      },
    };
  }

  finishRender(context: RenderContext): void {
    context.finalize();
  }

  flushEffects(effects: Effect[], phase: CommitPhase): void {
    for (let i = 0, l = effects.length; i < l; i++) {
      effects[i]!.commit(phase);
    }
  }

  getCurrentPriority(): TaskPriority {
    const currentEvent = window.event;
    if (currentEvent !== undefined) {
      return isContinuousEvent(currentEvent) ? 'user-visible' : 'user-blocking';
    } else {
      return 'user-visible';
    }
  }

  getHostName(): string {
    return this._hostName;
  }

  getHTMLTemplate<TData extends readonly any[]>(
    tokens: TemplateStringsArray,
    data: TData,
  ): Template<TData, RenderContext> {
    let template = this._cachedTemplates.get(tokens);

    if (template === undefined) {
      const marker = getMarker(this._hostName);
      template = new LazyTemplate(() =>
        TaggedTemplate.parseHTML(tokens, data, marker),
      );
      this._cachedTemplates.set(tokens, template);
    }

    return template;
  }

  getScopedValue(
    key: unknown,
    block: Block<RenderContext> | null = null,
  ): unknown {
    let currentBlock = block;
    while (currentBlock !== null) {
      const value = this._scopes.get(currentBlock)?.get(key);
      if (value !== undefined) {
        return value;
      }
      currentBlock = currentBlock.parent;
    }
    return this._constants.get(key);
  }

  getSVGTemplate<TData extends readonly any[]>(
    tokens: TemplateStringsArray,
    data: TData,
  ): Template<TData, RenderContext> {
    let template = this._cachedTemplates.get(tokens);

    if (template === undefined) {
      const marker = getMarker(this._hostName);
      template = new LazyTemplate(() =>
        TaggedTemplate.parseSVG(tokens, data, marker),
      );
      this._cachedTemplates.set(tokens, template);
    }

    return template;
  }

  nextIdentifier(): number {
    return ++this._idCounter;
  }

  resolveBinding<TValue>(
    value: TValue,
    part: Part,
  ): Binding<TValue, RenderContext> {
    switch (part.type) {
      case PartType.Attribute:
        return new AttributeBinding(value, part);
      case PartType.ChildNode:
        return new NodeBinding(value, part);
      case PartType.Element:
        return new ElementBinding(value, part) as Binding<any, RenderContext>;
      case PartType.Event:
        return new EventBinding(value, part) as Binding<any, RenderContext>;
      case PartType.Node:
        return new NodeBinding(value, part);
      case PartType.Property:
        return new PropertyBinding(value, part);
    }
  }

  setScopedValue(
    key: unknown,
    value: unknown,
    block: Block<RenderContext>,
  ): void {
    let scope = this._scopes.get(block);
    if (scope !== undefined) {
      scope.set(key, value);
    } else {
      scope = new Map();
      scope.set(key, value);
      this._scopes.set(block, scope);
    }
  }
}

class MountNode implements Effect {
  private readonly _node: Node;

  private readonly _container: Node;

  constructor(node: Node, container: Node) {
    this._node = node;
    this._container = container;
  }

  commit(): void {
    this._container.appendChild(this._node);
  }
}

class UnmountNode implements Effect {
  private readonly _node: Node;

  private readonly _container: Node;

  constructor(node: Node, container: Node) {
    this._node = node;
    this._container = container;
  }

  commit(): void {
    this._container.removeChild(this._node);
  }
}

function getRandomString(length: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (byte) =>
    (byte % 36).toString(36),
  ).join('');
}

function isContinuousEvent(event: Event): boolean {
  switch (event.type as keyof DocumentEventMap) {
    case 'drag':
    case 'dragenter':
    case 'dragleave':
    case 'dragover':
    case 'mouseenter':
    case 'mouseleave':
    case 'mousemove':
    case 'mouseout':
    case 'mouseover':
    case 'pointerenter':
    case 'pointerleave':
    case 'pointermove':
    case 'pointerout':
    case 'pointerover':
    case 'scroll':
    case 'touchmove':
    case 'wheel':
      return true;
    default:
      return false;
  }
}

declare global {
  interface Window {
    /**
     * This property is marked as deprecated. But we use this to determine the
     * task priority. This definition suppresses "'event' is deprecated." warning
     * reported by VSCode.
     */
    readonly event: Event | undefined;
  }
}