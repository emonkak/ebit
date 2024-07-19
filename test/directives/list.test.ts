import { describe, expect, it, vi } from 'vitest';

import { directiveTag } from '../../src/binding.js';
import {
  InPlaceListBinding,
  OrderedListBinding,
  inPlaceList,
  orderedList,
} from '../../src/directives/list.js';
import { PartType } from '../../src/types.js';
import { SyncUpdater } from '../../src/updater/syncUpdater.js';
import { text } from '../directives.js';
import { MockUpdateContext } from '../mocks.js';
import { allCombinations, permutations } from '../testUtils.js';

describe('orderedList()', () => {
  it('should construst a new OrderedListDirective', () => {
    const items = ['foo', 'bar', 'baz'];
    const valueSelector = (item: string) => item;
    const keySelector = (item: string) => item;
    const directive = orderedList(items, keySelector, valueSelector);

    expect(directive.items).toBe(items);
    expect(directive.valueSelector).toBe(valueSelector);
    expect(directive.keySelector).toBe(keySelector);
  });
});

describe('inPlaceList()', () => {
  it('should construst a new OrderedListDirective used indexes as keys', () => {
    const items = ['foo', 'bar', 'baz'];
    const valueSelector = (item: string) => item;
    const directive = inPlaceList(items, valueSelector);

    expect(directive.items).toBe(items);
    expect(directive.valueSelector).toBe(valueSelector);
  });
});

describe('OrderedListDirective', () => {
  describe('[directiveTag]()', () => {
    it('should return an instance of OrderedListBinding', () => {
      const directive = orderedList(
        ['foo', 'bar', 'baz'],
        (item) => item,
        (item) => item,
      );
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = directive[directiveTag](part, updater);

      expect(binding.value).toBe(directive);
      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
      expect(binding.bindings).toEqual([]);
    });

    it('should throw an error if the part is not a ChildNodePart', () => {
      const directive = orderedList(
        ['foo', 'bar', 'baz'],
        (item) => item,
        (item) => item,
      );
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());

      expect(() => directive[directiveTag](part, updater)).toThrow(
        'OrderedListDirective must be used in ChildNodePart.',
      );
    });
  });
});

describe('OrderedListBinding', () => {
  describe('.connect()', () => {
    it('should connect new bindings from items', () => {
      const directive = orderedList(
        ['foo', 'bar', 'baz'],
        (item) => item,
        (item) => text(item),
      );
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new OrderedListBinding(directive, part);

      container.appendChild(part.node);
      binding.connect(updater);
      updater.flush();

      expect(binding.startNode.nodeValue).toBe('foo');
      expect(binding.bindings.map((binding) => binding.value.content)).toEqual([
        'foo',
        'bar',
        'baz',
      ]);
      expect(container.innerHTML).toBe(
        'foo<!--foo-->bar<!--bar-->baz<!--baz--><!---->',
      );
    });

    it('should not enqueue self as a mutation effect if already scheduled', () => {
      const directive = orderedList(
        ['foo', 'bar', 'baz'],
        (item) => item,
        (item) => text(item),
      );
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new OrderedListBinding(directive, part);
      const commitSpy = vi.spyOn(binding, 'commit');

      binding.connect(updater);
      binding.connect(updater);
      updater.flush();

      expect(commitSpy).toHaveBeenCalledOnce();
    });
  });

  describe('.bind()', () => {
    it('should update items according to keys', () => {
      const source = ['foo', 'bar', 'baz', 'qux'];

      for (const items1 of allCombinations(source)) {
        for (const items2 of allCombinations(source)) {
          const directive1 = orderedList(
            items1,
            (item) => item,
            (item) => text(item),
          );
          const directive2 = orderedList(
            items2,
            (item) => item,
            (item) => text(item),
          );
          const container = document.createElement('div');
          const part = {
            type: PartType.ChildNode,
            node: document.createComment(''),
          } as const;
          const updater = new SyncUpdater(new MockUpdateContext());
          const binding = new OrderedListBinding(directive1, part);

          container.appendChild(part.node);
          binding.connect(updater);
          updater.flush();

          binding.bind(directive2, updater);
          updater.flush();

          expect(
            binding.bindings.map((binding) => binding.value.content),
          ).toEqual(directive2.items);
          expect(container.innerHTML).toBe(
            items2.map((item) => item + '<!--' + item + '-->').join('') +
              '<!---->',
          );
        }
      }
    });

    it('should update items containing duplicate keys', () => {
      const source1 = ['foo', 'bar', 'baz', 'baz', 'baz'];
      const source2 = ['foo', 'bar', 'baz'];

      for (const permutation1 of permutations(source1)) {
        for (const permutation2 of permutations(source2)) {
          for (const [items1, items2] of [
            [permutation1, permutation2],
            [permutation2, permutation1],
          ]) {
            const directive1 = orderedList(
              items1!,
              (item) => item,
              (item) => text(item),
            );
            const directive2 = orderedList(
              items2!,
              (item) => item,
              (item) => text(item),
            );
            const container = document.createElement('div');
            const part = {
              type: PartType.ChildNode,
              node: document.createComment(''),
            } as const;
            const updater = new SyncUpdater(new MockUpdateContext());
            const binding = new OrderedListBinding(directive1, part);

            container.appendChild(part.node);
            binding.connect(updater);
            updater.flush();

            binding.bind(directive2, updater);
            updater.flush();

            expect(
              binding.bindings.map((binding) => binding.value.content),
            ).toEqual(directive2.items);
            expect(container.innerHTML).toBe(
              items2!.map((item) => item + '<!--' + item + '-->').join('') +
                '<!---->',
            );
          }
        }
      }
    });

    it('should swap items according to keys', () => {
      const source = ['foo', 'bar', 'baz'];

      for (const items1 of permutations(source)) {
        for (const items2 of permutations(source)) {
          const directive1 = orderedList(
            items1,
            (item) => item,
            (item) => text(item),
          );
          const directive2 = orderedList(
            items2,
            (item) => item,
            (item) => text(item),
          );
          const container = document.createElement('div');
          const part = {
            type: PartType.ChildNode,
            node: document.createComment(''),
          } as const;
          const updater = new SyncUpdater(new MockUpdateContext());
          const binding = new OrderedListBinding(directive1, part);

          container.appendChild(part.node);
          binding.connect(updater);
          updater.flush();

          binding.bind(directive2, updater);
          updater.flush();

          expect(
            binding.bindings.map((binding) => binding.value.content),
          ).toEqual(directive2.items);
          expect(container.innerHTML).toBe(
            items2.map((item) => item + '<!--' + item + '-->').join('') +
              '<!---->',
          );
        }
      }
    });

    it('should do nothing if the items is the same as previous ones', () => {
      const items = ['foo', 'bar', 'baz'];
      const directive1 = orderedList(
        items,
        (item) => item,
        (item) => item,
      );
      const directive2 = orderedList(
        items,
        (item) => item,
        (item) => item,
      );
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new OrderedListBinding(directive1, part);

      binding.connect(updater);
      updater.flush();

      binding.bind(directive2, updater);

      expect(updater.isPending()).toBe(false);
      expect(updater.isScheduled()).toBe(false);
    });
  });

  describe('.unbind()', () => {
    it('should unbind current bindings', () => {
      const directive = orderedList(
        ['foo', 'bar', 'baz'],
        (item) => item,
        (item) => item,
      );
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new OrderedListBinding(directive, part);

      container.appendChild(part.node);
      binding.connect(updater);
      updater.flush();

      binding.unbind(updater);
      updater.flush();

      expect(binding.bindings).toHaveLength(0);
      expect(container.innerHTML).toBe('<!---->');
    });

    it('should not enqueue self as a mutation effect if already scheduled', () => {
      const directive = orderedList(
        ['foo', 'bar', 'baz'],
        (item) => item,
        (item) => item,
      );
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new OrderedListBinding(directive, part);
      const commitSpy = vi.spyOn(binding, 'commit');

      binding.unbind(updater);
      binding.unbind(updater);
      updater.flush();

      expect(commitSpy).toHaveBeenCalledOnce();
    });
  });

  describe('.disconnect()', () => {
    it('should disconnect current bindings', () => {
      const directive = orderedList(
        ['foo', 'bar', 'baz'],
        (item) => item,
        (item) => text(item),
      );
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new OrderedListBinding(directive, part);

      container.appendChild(part.node);
      binding.connect(updater);
      updater.flush();

      const disconnectSpies = binding.bindings.map((binding) =>
        vi.spyOn(binding, 'disconnect'),
      );

      binding.disconnect();

      expect(disconnectSpies).toHaveLength(3);
      for (const disconnectSpy of disconnectSpies) {
        expect(disconnectSpy).toHaveBeenCalledOnce();
      }
      expect(container.innerHTML).toBe(
        'foo<!--foo-->bar<!--bar-->baz<!--baz--><!---->',
      );
    });
  });
});

describe('InPlaceListDirective', () => {
  describe('[directiveTag]()', () => {
    it('should return an instance of InPlaceListBinding', () => {
      const directive = inPlaceList(['foo', 'bar', 'baz'], (item) => item);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = directive[directiveTag](part, updater);

      expect(binding.value).toBe(directive);
      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
      expect(binding.bindings).toEqual([]);
    });

    it('should throw an error if the part is not a ChildNodePart', () => {
      const directive = inPlaceList(['foo', 'bar', 'baz'], (item) => item);
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());

      expect(() => directive[directiveTag](part, updater)).toThrow(
        'InPlaceListDirective must be used in ChildNodePart.',
      );
    });
  });
});

describe('InPlaceListBinding', () => {
  describe('.connect()', () => {
    it('should connect new bindings from items', () => {
      const directive = inPlaceList(['foo', 'bar', 'baz'], (item) =>
        text(item),
      );
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new InPlaceListBinding(directive, part);

      container.appendChild(part.node);
      binding.connect(updater);
      updater.flush();

      expect(binding.startNode.nodeValue).toBe('foo');
      expect(binding.bindings.map((binding) => binding.value.content)).toEqual([
        'foo',
        'bar',
        'baz',
      ]);
      expect(container.innerHTML).toBe(
        'foo<!--0-->bar<!--1-->baz<!--2--><!---->',
      );
    });

    it('should not enqueue self as a mutation effect if already scheduled', () => {
      const directive = inPlaceList(['foo', 'bar', 'baz'], (item) =>
        text(item),
      );
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new InPlaceListBinding(directive, part);
      const commitSpy = vi.spyOn(binding, 'commit');

      binding.connect(updater);
      binding.connect(updater);
      updater.flush();

      expect(commitSpy).toHaveBeenCalledOnce();
    });
  });

  describe('.bind()', () => {
    it('should update with longer list than last time', () => {
      const directive1 = inPlaceList(['foo', 'bar', 'baz'], (item) =>
        text(item),
      );
      const directive2 = inPlaceList(['qux', 'baz', 'bar', 'foo'], (item) =>
        text(item),
      );
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new InPlaceListBinding(directive1, part);

      container.appendChild(part.node);
      binding.connect(updater);
      updater.flush();

      binding.bind(directive2, updater);
      updater.flush();

      expect(binding.bindings.map((binding) => binding.value.content)).toEqual(
        directive2.items,
      );
      expect(container.innerHTML).toBe(
        'qux<!--0-->baz<!--1-->bar<!--2-->foo<!--3--><!---->',
      );
    });

    it('should update with shoter list than last time', () => {
      const directive1 = inPlaceList(['foo', 'bar', 'baz'], (item) =>
        text(item),
      );
      const directive2 = inPlaceList(['bar', 'foo'], (item) => text(item));
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new InPlaceListBinding(directive1, part);

      container.appendChild(part.node);
      binding.connect(updater);
      updater.flush();

      binding.bind(directive2, updater);
      updater.flush();

      expect(binding.bindings.map((binding) => binding.value.content)).toEqual(
        directive2.items,
      );
      expect(container.innerHTML).toBe('bar<!--0-->foo<!--1--><!---->');
    });

    it('should do nothing if the items is the same as previous ones', () => {
      const items = ['foo', 'bar', 'baz'];
      const directive1 = inPlaceList(items, (item) => item);
      const directive2 = inPlaceList(items, (item) => item);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new InPlaceListBinding(directive1, part);

      binding.connect(updater);
      updater.flush();

      binding.bind(directive2, updater);

      expect(updater.isPending()).toBe(false);
      expect(updater.isScheduled()).toBe(false);
    });
  });

  describe('.unbind()', () => {
    it('should unbind current bindings', () => {
      const directive = inPlaceList(['foo', 'bar', 'baz'], (item) => item);
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new InPlaceListBinding(directive, part);

      container.appendChild(part.node);
      binding.connect(updater);
      updater.flush();

      binding.unbind(updater);
      updater.flush();

      expect(binding.bindings).toHaveLength(0);
      expect(container.innerHTML).toBe('<!---->');
    });

    it('should not enqueue self as a mutation effect if already scheduled', () => {
      const directive = inPlaceList(['foo', 'bar', 'baz'], (item) => item);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new InPlaceListBinding(directive, part);
      const commitSpy = vi.spyOn(binding, 'commit');

      binding.unbind(updater);
      binding.unbind(updater);
      updater.flush();

      expect(commitSpy).toHaveBeenCalledOnce();
    });
  });

  describe('.disconnect()', () => {
    it('should disconnect current bindings', () => {
      const directive = inPlaceList(['foo', 'bar', 'baz'], (item) =>
        text(item),
      );
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const updater = new SyncUpdater(new MockUpdateContext());
      const binding = new InPlaceListBinding(directive, part);

      container.appendChild(part.node);
      binding.connect(updater);
      updater.flush();

      const disconnectSpies = binding.bindings.map((binding) =>
        vi.spyOn(binding, 'disconnect'),
      );

      binding.disconnect();

      expect(disconnectSpies).toHaveLength(3);
      for (const disconnectSpy of disconnectSpies) {
        expect(disconnectSpy).toHaveBeenCalledOnce();
      }
      expect(container.innerHTML).toBe(
        'foo<!--0-->bar<!--1-->baz<!--2--><!---->',
      );
    });
  });
});
