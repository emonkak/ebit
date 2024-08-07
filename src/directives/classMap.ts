import {
  type AttributePart,
  type Binding,
  CommitStatus,
  type Directive,
  type DirectiveContext,
  type Effect,
  type Part,
  PartType,
  type UpdateContext,
  directiveTag,
} from '../baseTypes.js';
import { shallowEqual } from '../compare.js';
import { ensureDirective, reportPart } from '../error.js';

export type ClassDeclaration = { [key: string]: boolean };

export function classMap(classes: ClassDeclaration): ClassMap {
  return new ClassMap(classes);
}

export class ClassMap implements Directive<ClassMap> {
  private readonly _classes: ClassDeclaration;

  constructor(classDeclaration: ClassDeclaration) {
    this._classes = classDeclaration;
  }

  get classes(): ClassDeclaration {
    return this._classes;
  }

  [directiveTag](part: Part, _context: DirectiveContext): ClassMapBinding {
    if (part.type !== PartType.Attribute || part.name !== 'class') {
      throw new Error(
        'ClassMap directive must be used in a "class" attribute, but it is used here:\n' +
          reportPart(part),
      );
    }
    return new ClassMapBinding(this, part);
  }
}

export class ClassMapBinding implements Effect, Binding<ClassMap> {
  private _pendingValue: ClassMap;

  private _memoizedClasses: ClassDeclaration = {};

  private readonly _part: AttributePart;

  private _status = CommitStatus.Committed;

  constructor(value: ClassMap, part: AttributePart) {
    this._pendingValue = value;
    this._part = part;
  }

  get value(): ClassMap {
    return this._pendingValue;
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

  bind(newValue: ClassMap, context: UpdateContext<unknown>): void {
    DEBUG: {
      ensureDirective(ClassMap, newValue, this._part);
    }
    if (!shallowEqual(newValue.classes, this._memoizedClasses)) {
      this._requestCommit(context);
      this._status = CommitStatus.Mounting;
    }
    this._pendingValue = newValue;
  }

  unbind(context: UpdateContext<unknown>): void {
    if (Object.keys(this._memoizedClasses).length > 0) {
      this._requestCommit(context);
      this._status = CommitStatus.Unmounting;
    }
  }

  disconnect(): void {
    this._status = CommitStatus.Committed;
  }

  commit(): void {
    switch (this._status) {
      case CommitStatus.Mounting: {
        const { classList } = this._part.node;
        const oldClasses = this._memoizedClasses;
        const newClasses = this._pendingValue.classes;

        for (const className in newClasses) {
          const enabled = newClasses[className];
          classList.toggle(className, enabled);
        }

        for (const className in oldClasses) {
          if (!Object.hasOwn(newClasses, className)) {
            classList.remove(className);
          }
        }

        this._memoizedClasses = newClasses;
        break;
      }
      case CommitStatus.Unmounting: {
        this._part.node.className = '';
        this._memoizedClasses = {};
        break;
      }
    }

    this._status = CommitStatus.Committed;
  }

  private _requestCommit(context: UpdateContext<unknown>): void {
    if (this._status === CommitStatus.Committed) {
      context.enqueueMutationEffect(this);
    }
  }
}
