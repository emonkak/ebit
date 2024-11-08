import {
  type Binding,
  type Directive,
  type DirectiveContext,
  type Part,
  type UpdateContext,
  directiveTag,
  nameOf,
  resolveBinding,
} from '../baseTypes.js';
import { ensureDirective } from '../error.js';
import { NoValue } from './noValue.js';

export type Either<TLeft, TRight> = Left<TLeft> | Right<TRight>;

export namespace Either {
  export function left<TLeft>(left: TLeft): Left<TLeft> {
    return new Left(left);
  }

  export function right<TRight>(right: TRight): Right<TRight> {
    return new Right(right);
  }
}

export function optional<TValue>(
  value: TValue | null | undefined,
): Either<NoValue, TValue> {
  return value != null ? new Right(value) : new Left(NoValue.instance);
}

export class Left<TLeft> implements Directive<Either<TLeft, unknown>> {
  private readonly _value: TLeft;

  constructor(value: TLeft) {
    this._value = value;
  }

  get value(): TLeft {
    return this._value;
  }

  get [Symbol.toStringTag](): string {
    return `Left(${nameOf(this._value)})`;
  }

  [directiveTag](
    part: Part,
    context: DirectiveContext,
  ): EitherBinding<TLeft, unknown> {
    return new EitherBinding(this, part, context);
  }
}

export class Right<TRight> implements Directive<Either<unknown, TRight>> {
  private readonly _value: TRight;

  constructor(value: TRight) {
    this._value = value;
  }

  get value(): TRight {
    return this._value;
  }

  get [Symbol.toStringTag](): string {
    return `Right(${nameOf(this._value)})`;
  }

  [directiveTag](
    part: Part,
    context: DirectiveContext,
  ): EitherBinding<unknown, TRight> {
    return new EitherBinding(this, part, context);
  }
}

export class EitherBinding<TLeft, TRight>
  implements Binding<Either<TLeft, TRight>>
{
  private _leftBinding: Binding<TLeft> | null = null;

  private _rightBinding: Binding<TRight> | null = null;

  private _value: Either<TLeft, TRight>;

  constructor(
    value: Either<TLeft, TRight>,
    part: Part,
    context: DirectiveContext,
  ) {
    if (value instanceof Left) {
      this._leftBinding = resolveBinding(value.value, part, context);
      this._rightBinding = null;
    } else {
      this._leftBinding = null;
      this._rightBinding = resolveBinding(value.value, part, context);
    }
    this._value = value;
  }

  get value(): Either<TLeft, TRight> {
    return this._value;
  }

  get part(): Part {
    return this.binding.part;
  }

  get startNode(): ChildNode {
    return this.binding.startNode;
  }

  get endNode(): ChildNode {
    return this.binding.endNode;
  }

  get binding(): Binding<TLeft> | Binding<TRight> {
    return this._value instanceof Left
      ? this._leftBinding!
      : this._rightBinding!;
  }

  connect(context: UpdateContext): void {
    this.binding.connect(context);
  }

  bind(newValue: Either<TLeft, TRight>, context: UpdateContext): void {
    DEBUG: {
      ensureDirective([Left, Right], newValue, this.binding.part);
    }

    const oldValue = this._value;

    if (oldValue.constructor === newValue.constructor) {
      if (newValue instanceof Left) {
        this._leftBinding!.bind(newValue.value, context);
      } else {
        this._rightBinding!.bind(newValue.value, context);
      }
    } else {
      if (newValue instanceof Left) {
        this._rightBinding!.unbind(context);
        if (this._leftBinding !== null) {
          this._leftBinding.bind(newValue.value, context);
        } else {
          this._leftBinding = resolveBinding(
            newValue.value,
            this._rightBinding!.part,
            context,
          );
          this._leftBinding.connect(context);
        }
      } else {
        this._leftBinding!.unbind(context);
        if (this._rightBinding !== null) {
          this._rightBinding.bind(newValue.value, context);
        } else {
          this._rightBinding = resolveBinding(
            newValue.value,
            this._leftBinding!.part,
            context,
          );
          this._rightBinding.connect(context);
        }
      }
    }

    this._value = newValue;
  }

  unbind(context: UpdateContext): void {
    this.binding.unbind(context);
  }

  disconnect(context: UpdateContext): void {
    this.binding.disconnect(context);
  }
}
