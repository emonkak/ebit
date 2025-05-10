/// <reference path="../../typings/moveBefore.d.ts" />

import {
  type Binding,
  type Directive,
  type DirectiveContext,
  type DirectiveElement,
  type Effect,
  type EffectContext,
  type UpdateContext,
  createDirectiveElement,
  resolveBindingTag,
} from './coreTypes.js';
import { inspectPart, inspectValue, markUsedValue } from './debug.js';
import { type ChildNodePart, type Part, PartType } from './part.js';

export type ListValue<TItem, TKey, TResult> = {
  items: readonly TItem[];
  keySelector: (item: TItem, index: number) => TKey;
  valueSelector: (item: TItem, index: number) => TResult;
};

interface Slot<TKey, TValue> {
  binding: Binding<TValue>;
  sentinelNode: Comment;
  key: TKey;
  index: number;
}

export function list<TItem, TKey, TValue>(
  value: ListValue<TItem, TKey, TValue>,
): DirectiveElement<ListValue<TItem, TKey, TValue>> {
  return createDirectiveElement(
    List as Directive<ListValue<TItem, TKey, TValue>>,
    value,
  );
}

export const List: Directive<ListValue<unknown, unknown, unknown>> = {
  [resolveBindingTag](
    value: ListValue<unknown, unknown, unknown>,
    part: Part,
    _context: DirectiveContext,
  ): ListBinding<unknown, unknown, unknown> {
    if (part.type !== PartType.ChildNode) {
      throw new Error(
        'List directive must be used in a child node, but it is used here in:\n' +
          inspectPart(part, markUsedValue(this)),
      );
    }
    return new ListBinding(value, part);
  },
};

export class ListBinding<TItem, TKey, TValue>
  implements Binding<ListValue<TItem, TKey, TValue>>, Effect
{
  private _value: ListValue<TItem, TKey, TValue>;

  private readonly _part: ChildNodePart;

  private _pendingSlots: Slot<TKey, TValue>[] = [];

  private _memoizedSlots: Slot<TKey, TValue>[] = [];

  constructor(value: ListValue<TItem, TKey, TValue>, part: ChildNodePart) {
    this._value = value;
    this._part = part;
  }

  get directive(): Directive<ListValue<TItem, TKey, TValue>> {
    return List as Directive<ListValue<TItem, TKey, TValue>>;
  }

  get value(): ListValue<TItem, TKey, TValue> {
    return this._value;
  }

  get part(): ChildNodePart {
    return this._part;
  }

  connect(context: UpdateContext): void {
    this._reconcileItems(this._value, context);
  }

  bind(value: ListValue<TItem, TKey, TValue>, context: UpdateContext): void {
    this._reconcileItems(value, context);
    this._value = value;
  }

  unbind(context: UpdateContext): void {
    // Unbind slots in reverse order.
    for (let i = this._memoizedSlots.length - 1; i >= 0; i--) {
      this._memoizedSlots[i]!.binding.unbind(context);
    }
    this._pendingSlots = [];
  }

  disconnect(context: UpdateContext): void {
    // Disconnect slots in reverse order.
    for (let i = this._memoizedSlots.length - 1; i >= 0; i--) {
      this._memoizedSlots[i]!.binding.disconnect(context);
    }
  }

  commit(context: EffectContext): void {
    for (
      let newHead = 0, newEnd = this._pendingSlots.length;
      newHead < newEnd;
      newHead++
    ) {
      const slot = this._pendingSlots[newHead]!;
      if (slot.index < 0) {
        const referencePart =
          this._pendingSlots[newHead - 1]?.binding.part ?? this._part;
        mountSlot(slot, referencePart, context);
      } else if (slot.index !== newHead) {
        const referencePart =
          this._pendingSlots[newHead - 1]?.binding.part ?? this._part;
        moveSlot(slot, referencePart, context);
      } else {
        updateSlot(slot, context);
      }
      slot.index = newHead;
    }

    for (
      let oldTail = this._memoizedSlots.length - 1;
      oldTail >= 0;
      oldTail--
    ) {
      const oldSlot = this._memoizedSlots[oldTail]!;
      if (oldSlot.index < 0) {
        unmountSlot(oldSlot, context);
      }
    }

    this._memoizedSlots = this._pendingSlots;
  }

  private _reconcileItems(
    { items, keySelector, valueSelector }: ListValue<TItem, TKey, TValue>,
    context: UpdateContext,
  ): void {
    const oldSlots = this._memoizedSlots;
    const newSlots: Slot<TKey, TValue>[] = new Array(items.length);
    const newKeys = items.map(keySelector);

    const insertSlot = (item: TItem, key: TKey, index: number) => {
      const value = valueSelector(item, index);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = context.resolveBinding(value, part);
      const sentinelNode = document.createComment('');
      binding.connect(context);
      newSlots[index] = {
        binding,
        sentinelNode,
        key,
        index: -1,
      };
    };
    const updateSlot = (slot: Slot<TKey, TValue>, index: number) => {
      slot.binding = context.reconcileBinding(
        slot.binding,
        valueSelector(items[index]!, index),
      );
      newSlots[index] = slot;
    };
    const removeSlot = (slot: Slot<TKey, TValue>) => {
      slot.binding.unbind(context);
      slot.index = -1;
    };

    let oldHead = 0;
    let oldTail = oldSlots.length - 1;
    let newHead = 0;
    let newTail = items.length - 1;

    loop: while (true) {
      switch (true) {
        case oldHead > oldTail:
          while (newHead <= newTail) {
            insertSlot(items[newHead]!, newKeys[newHead]!, newHead);
            newHead++;
          }
          break loop;
        case newHead > newTail:
          while (oldHead <= oldTail) {
            removeSlot(oldSlots[oldHead]!);
            oldHead++;
          }
          break loop;
        case oldSlots[oldHead]!.key === newKeys[newHead]!:
          updateSlot(oldSlots[oldHead]!, newHead);
          oldHead++;
          newHead++;
          break;
        case oldSlots[oldTail]!.key === newKeys[newTail]!:
          updateSlot(oldSlots[oldTail]!, newTail);
          oldTail--;
          newTail--;
          break;
        case oldSlots[oldHead]!.key === newKeys[newTail]!:
          updateSlot(oldSlots[oldHead]!, newTail);
          oldHead++;
          newTail--;
          break;
        case oldSlots[oldTail]!.key === newKeys[newHead]!:
          updateSlot(oldSlots[oldTail]!, newHead);
          oldTail--;
          newHead++;
          break;
        default:
          const newKeyIndices = new Map<TKey, number>();
          for (let i = newHead; i <= newTail; i++) {
            newKeyIndices.set(newKeys[i]!, i);
          }
          while (oldHead <= oldTail) {
            const key = oldSlots[oldHead]!.key;
            const index = newKeyIndices.get(key);
            if (index !== undefined) {
              updateSlot(oldSlots[oldHead]!, index);
              newKeyIndices.delete(key);
            } else {
              removeSlot(oldSlots[oldHead]!);
            }
            oldHead++;
          }
          for (const index of newKeyIndices.values()) {
            insertSlot(items[index]!, newKeys[index]!, index);
          }
          break loop;
      }
    }

    this._pendingSlots = newSlots;
  }
}

function mountSlot<TKey, TValue>(
  { binding, sentinelNode, key, index }: Slot<TKey, TValue>,
  referencePart: Part,
  context: EffectContext,
): void {
  referencePart.node.after(sentinelNode, binding.part.node);
  DEBUG: {
    sentinelNode.nodeValue = `<ListItem index=${index} key=${inspectValue(key)} value=${inspectValue(binding.value)})>`;
    binding.part.node.nodeValue = '</ListItem>';
  }
  binding.commit(context);
}

function moveChildNodes(
  startNode: ChildNode,
  endNode: ChildNode,
  referenceNode: ChildNode | null,
): void {
  // Use moveBefore() alternative to insertBefore() if possible. It preserves
  // states of moves.
  const insertOrMoveBefore =
    Element.prototype.moveBefore ?? Element.prototype.insertBefore;
  const parentNode = startNode.parentNode!;
  let currentNode: ChildNode | null = startNode;
  do {
    const nextNode: ChildNode | null = currentNode.nextSibling;
    insertOrMoveBefore.call(parentNode, currentNode, referenceNode);
    if (currentNode === endNode) {
      break;
    }
    currentNode = nextNode;
  } while (currentNode !== null);
}

function moveSlot<TKey, TValue>(
  { binding, sentinelNode }: Slot<TKey, TValue>,
  referencePart: Part,
  context: EffectContext,
): void {
  moveChildNodes(
    sentinelNode,
    binding.part.node,
    referencePart.node.nextSibling,
  );
  binding.commit(context);
}

function unmountSlot<TKey, TValue>(
  { binding, sentinelNode }: Slot<TKey, TValue>,
  context: EffectContext,
): void {
  binding.commit(context);
  binding.part.node.remove();
  sentinelNode.remove();
}

function updateSlot<TKey, TValue>(
  { binding, sentinelNode, key, index }: Slot<TKey, TValue>,
  context: EffectContext,
): void {
  DEBUG: {
    sentinelNode.nodeValue = `<ListItem index=${index} key=${inspectValue(key)} value=${inspectValue(binding.value)})>`;
  }
  binding.commit(context);
}
