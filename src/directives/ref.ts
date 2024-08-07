import {
  type AttributePart,
  type Binding,
  CommitStatus,
  type Directive,
  type DirectiveContext,
  type Effect,
  type Part,
  PartType,
  type RefValue,
  type UpdateContext,
  directiveTag,
} from '../baseTypes.js';
import { ensureDirective, reportPart } from '../error.js';

type ElementRef = RefValue<Element | null>;

export function ref(ref: ElementRef | null): Ref {
  return new Ref(ref);
}

export class Ref implements Directive<Ref> {
  private readonly _ref: ElementRef | null;

  constructor(ref: ElementRef | null) {
    this._ref = ref;
  }

  get ref(): ElementRef | null {
    return this._ref;
  }

  [directiveTag](part: Part, _contex: DirectiveContext): RefBinding {
    if (part.type !== PartType.Attribute || part.name !== 'ref') {
      throw new Error(
        'Ref directive must be used in a "ref" attribute, but it is used here:\n' +
          reportPart(part),
      );
    }
    return new RefBinding(this, part);
  }
}

export class RefBinding implements Binding<Ref>, Effect {
  private _value: Ref;

  private readonly _part: AttributePart;

  private _memoizedRef: ElementRef | null = null;

  private _status = CommitStatus.Committed;

  constructor(directive: Ref, part: AttributePart) {
    this._value = directive;
    this._part = part;
  }

  get value(): Ref {
    return this._value;
  }

  get part(): AttributePart {
    return this._part;
  }

  get startNode(): ChildNode {
    return this._part.node;
  }

  get endNode(): ChildNode {
    return this._part.node;
  }

  connect(context: UpdateContext<unknown>): void {
    this._requestCommit(context);
    this._status = CommitStatus.Mounting;
  }

  bind(newValue: Ref, context: UpdateContext<unknown>): void {
    DEBUG: {
      ensureDirective(Ref, newValue, this._part);
    }
    if (newValue.ref !== this._memoizedRef) {
      this._requestCommit(context);
      this._status = CommitStatus.Mounting;
    }
    this._value = newValue;
  }

  unbind(context: UpdateContext<unknown>): void {
    if (this._memoizedRef !== null) {
      this._requestCommit(context);
      this._status = CommitStatus.Unmounting;
    }
  }

  disconnect() {
    this._status = CommitStatus.Committed;
  }

  commit(): void {
    switch (this._status) {
      case CommitStatus.Mounting: {
        const oldRef = this._memoizedRef ?? null;
        const newRef = this._value.ref;

        if (oldRef !== null) {
          invokeRef(oldRef, null);
        }

        if (newRef !== null) {
          invokeRef(newRef, this._part.node);
        }

        this._memoizedRef = this._value.ref;
        break;
      }
      case CommitStatus.Unmounting: {
        const ref = this._value.ref;

        /* istanbul ignore else @preserve */
        if (ref !== null) {
          invokeRef(ref, null);
        }

        this._memoizedRef = null;
        break;
      }
    }

    this._status = CommitStatus.Committed;
  }

  private _requestCommit(context: UpdateContext<unknown>): void {
    if (this._status === CommitStatus.Committed) {
      context.enqueueLayoutEffect(this);
    }
  }
}

function invokeRef(ref: ElementRef, value: Element | null): void {
  if (typeof ref === 'function') {
    ref(value);
  } else {
    ref.current = value;
  }
}
