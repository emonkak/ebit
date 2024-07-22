import { resolveBinding } from '../binding.js';
import {
  type Binding,
  type Directive,
  type Part,
  type Updater,
  directiveTag,
  ensureDirective,
  nameOf,
  nameTag,
} from '../types.js';
import { dependenciesAreChanged } from '../utils.js';

export function memo<T>(
  factory: () => T,
  dependencies: unknown[] | undefined,
): Memo<T> {
  return new Memo(factory, dependencies);
}

export class Memo<T> implements Directive {
  private readonly _factory: () => T;

  private readonly _dependencies: unknown[] | undefined;

  constructor(factory: () => T, dependencies: unknown[] | undefined) {
    this._factory = factory;
    this._dependencies = dependencies;
  }

  get factory(): () => T {
    return this._factory;
  }

  get dependencies(): unknown[] | undefined {
    return this._dependencies;
  }

  get [nameTag](): string {
    return 'Memo(' + nameOf(this._factory()) + ')';
  }

  [directiveTag](part: Part, updater: Updater): MemoBinding<T> {
    return new MemoBinding(this, part, updater);
  }
}

export class MemoBinding<T> implements Binding<Memo<T>> {
  private _directive: Memo<T>;

  private readonly _binding: Binding<T>;

  constructor(directive: Memo<T>, part: Part, updater: Updater) {
    this._directive = directive;
    this._binding = resolveBinding(directive.factory(), part, updater);
  }

  get value(): Memo<T> {
    return this._directive;
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

  get binding(): Binding<T> {
    return this._binding;
  }

  connect(updater: Updater): void {
    this._binding.connect(updater);
  }

  bind(newValue: Memo<T>, updater: Updater): void {
    DEBUG: {
      ensureDirective(Memo, newValue);
    }
    const oldDependencies = this._directive.dependencies;
    const newDependencies = newValue.dependencies;
    if (dependenciesAreChanged(oldDependencies, newDependencies)) {
      this._directive = newValue;
      this._binding.bind(newValue.factory(), updater);
    }
  }

  unbind(updater: Updater): void {
    this._directive = new Memo(this._directive.factory, undefined);
    this._binding.unbind(updater);
  }

  disconnect(): void {
    this._directive = new Memo(this._directive.factory, undefined);
    this._binding.disconnect();
  }
}
