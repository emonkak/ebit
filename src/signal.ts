import {
  Binding,
  Directive,
  Part,
  directiveTag,
  initializeBinding,
  updateBinding,
} from './binding.js';
import { Context, UsableObject, usableTag } from './context.js';
import { LinkedList } from './linkedList.js';
import type { Updater } from './updater.js';

export type Subscriber = () => void;

export type Subscription = () => void;

type UnwrapSignals<T> = T extends any[]
  ? {
      [P in keyof T]: T[P] extends Signal<infer Value> ? Value : never;
    }
  : never;

export abstract class Signal<T> implements Directive, UsableObject<void> {
  abstract get value(): T;

  abstract get version(): number;

  abstract subscribe(subscriber: Subscriber): Subscription;

  map<TResult>(
    selector: (value: T) => TResult,
  ): ComputedSignal<TResult, [Signal<T>]> {
    return ComputedSignal.lift(selector, [this as Signal<T>]);
  }

  toJSON(): T {
    return this.value;
  }

  valueOf(): T {
    return this.value;
  }

  [usableTag](context: Context): void {
    context.useEffect(
      () =>
        this.subscribe(() => {
          context.requestUpdate();
        }),
      [this],
    );
  }

  [directiveTag](part: Part, updater: Updater): SignalBinding<T> {
    const binding = initializeBinding(this.value, part, updater);

    return new SignalBinding(this, binding, updater);
  }
}

export class SignalBinding<T> implements Binding<Signal<T>> {
  private readonly _binding: Binding<T>;

  private _signal: Signal<T>;

  private _subscription: Subscription | null;

  constructor(signal: Signal<T>, binding: Binding<T>, updater: Updater) {
    this._signal = signal;
    this._binding = binding;
    this._subscription = this._subscribeSignal(signal, updater);
  }

  get part(): Part {
    return this._binding.part;
  }

  get startNode(): ChildNode {
    return this._binding.startNode;
  }

  get endNode(): ChildNode {
    return this._binding.endNode;
  }

  get value(): Signal<T> {
    return this._signal;
  }

  set value(newSignal: Signal<T>) {
    this._signal = newSignal;
  }

  bind(updater: Updater): void {
    updateBinding(this._binding, this._signal.value, updater);
    this._subscription?.();
    this._subscription = this._subscribeSignal(this._signal, updater);
  }

  unbind(updater: Updater): void {
    this._binding.unbind(updater);
    this._subscription?.();
    this._subscription = null;
  }

  disconnect(): void {
    this._binding.disconnect();
    this._subscription?.();
    this._subscription = null;
  }

  private _subscribeSignal(signal: Signal<T>, updater: Updater): Subscription {
    return signal.subscribe(() => {
      this._binding.value = signal.value;
      this._binding.bind(updater);
      updater.scheduleUpdate();
    });
  }
}

export class AtomSignal<T> extends Signal<T> {
  private readonly _subscribers = new LinkedList<Subscriber>();

  private _value: T;

  private _version = 0;

  constructor(initialValue: T) {
    super();
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  set value(newValue: T) {
    this._value = newValue;
    this.forceUpdate();
  }

  get version(): number {
    return this._version;
  }

  forceUpdate() {
    this._version += 1;

    for (
      let node = this._subscribers.front();
      node !== null;
      node = node.next
    ) {
      const subscriber = node.value;
      subscriber();
    }
  }

  subscribe(subscriber: Subscriber): Subscription {
    const node = this._subscribers.pushBack(subscriber);
    return () => {
      this._subscribers.remove(node);
    };
  }
}

export class ComputedSignal<
  TResult,
  const TDependencies extends Signal<any>[],
> extends Signal<TResult> {
  private readonly _factory: (...signals: TDependencies) => TResult;

  private readonly _dependencies: TDependencies;

  private _memoizedValue: TResult | null = null;

  private _memoizedVersion = -1; // -1 is indicated an uninitialized signal.

  static lift<TResult, const TDependencies extends Signal<any>[]>(
    factory: (...signals: UnwrapSignals<TDependencies>) => TResult,
    dependencies: TDependencies,
  ): ComputedSignal<TResult, TDependencies> {
    return new ComputedSignal((...dependencies) => {
      const args = dependencies.map(
        (dependency) => dependency.value,
      ) as UnwrapSignals<TDependencies>;
      return factory(...args);
    }, dependencies);
  }

  constructor(
    factory: (...signals: TDependencies) => TResult,
    dependencies: TDependencies,
  ) {
    super();
    this._factory = factory;
    this._dependencies = dependencies;
  }

  get value(): TResult {
    const newVersion = this.version;
    if (this._memoizedVersion < newVersion) {
      const factory = this._factory;
      this._memoizedVersion = newVersion;
      this._memoizedValue = factory(...this._dependencies);
    }
    return this._memoizedValue!;
  }

  get version(): number {
    const dependencies = this._dependencies;

    let version = 0;

    for (let i = 0, l = dependencies.length; i < l; i++) {
      version += dependencies[i]!.version;
    }

    return version;
  }

  subscribe(subscriber: Subscriber): Subscription {
    const subscriptions = this._dependencies.map((dependency) =>
      dependency.subscribe(subscriber),
    );
    return () => {
      for (let i = 0, l = subscriptions.length; i < l; i++) {
        subscriptions[i]!();
      }
    };
  }
}
