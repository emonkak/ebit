import { describe, expect, it, vi } from 'vitest';

import { NodeBinding } from '../../src/binding.js';
import { Atom, Computed, SignalBinding } from '../../src/directives/signal.js';
import { RenderContext, usableTag } from '../../src/renderContext.js';
import { RenderState } from '../../src/renderState.js';
import { type Hook, PartType, directiveTag, hintTag } from '../../src/types.js';
import { SyncUpdater } from '../../src/updater/syncUpdater.js';
import { MockBlock } from '.././mocks.js';

describe('Signal', () => {
  describe('.toJSON()', () => {
    it('should return the value', () => {
      const signal = new Atom('foo');

      expect('foo').toBe(signal.toJSON());
    });
  });

  describe('.value', () => {
    it('should increment the version on update', () => {
      const signal = new Atom('foo');

      signal.value = 'bar';
      expect(signal.value).toBe('bar');
      expect(signal.version).toBe(1);
    });
  });

  describe('.valueOf()', () => {
    it('should return the value of the signal', () => {
      const signal = new Atom('foo');

      expect('foo').toBe(signal.valueOf());
    });
  });

  describe('[hintTag]', () => {
    it('should return a hint string', () => {
      expect(new Atom('foo')[hintTag]).toBe('Signal(foo)');
    });
  });

  describe('[directiveTag]()', () => {
    it('should construct a new SignalBinding', () => {
      const signal = new Atom('foo');
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new RenderState());
      const binding = signal[directiveTag](part, updater);

      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
      expect(binding.value).toBe(signal);
      expect(binding.binding).toBeInstanceOf(NodeBinding);
      expect(binding.binding.value).toBe('foo');
      expect(updater.isPending()).toBe(false);
      expect(updater.isScheduled()).toBe(false);
    });
  });

  describe('[usableTag]()', () => {
    it('should subscribe the signal and return a signal value', () => {
      const signal = new Atom('foo');
      const block = new MockBlock();
      const hooks: Hook[] = [];
      const state = new RenderState();
      const updater = new SyncUpdater(state);
      const context = new RenderContext(hooks, block, state, updater);

      const requestUpdateSpy = vi.spyOn(block, 'requestUpdate');
      const value = signal[usableTag](context);

      updater.flush();

      expect(value).toBe('foo');
      expect(requestUpdateSpy).not.toHaveBeenCalled();

      signal.value = 'bar';

      updater.flush();

      expect(requestUpdateSpy).toHaveBeenCalled();
    });
  });
});

describe('Atom', () => {
  describe('.value', () => {
    it('should get 0 of the initial version on initalize', () => {
      const signal = new Atom('foo');

      expect(signal.value).toBe('foo');
      expect(signal.version).toBe(0);
    });

    it('should increment the version on update', () => {
      const signal = new Atom('foo');

      signal.value = 'bar';
      expect(signal.value).toBe('bar');
      expect(signal.version).toBe(1);
    });
  });

  describe('.notifyUpdate()', () => {
    it('should increment the version', () => {
      const signal = new Atom(1);

      signal.notifyUpdate();

      expect(1).toBe(signal.value);
      expect(1).toBe(signal.version);
    });
  });

  describe('.setUntrackedValue()', () => {
    it('should set the new value without invoking the callback', () => {
      const signal = new Atom('foo');
      const callback = vi.fn();

      signal.subscribe(callback);
      signal.setUntrackedValue('bar');

      expect(signal.value).toBe('bar');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('.subscribe()', () => {
    it('should invoke the callback on update', () => {
      const signal = new Atom('foo');
      const callback = vi.fn();

      signal.subscribe(callback);
      expect(callback).toHaveBeenCalledTimes(0);

      signal.value = 'bar';
      expect(callback).toHaveBeenCalledTimes(1);

      signal.value = 'baz';
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should not invoke the unsubscribed callback', () => {
      const signal = new Atom('foo');
      const callback = vi.fn();

      signal.subscribe(callback)();
      expect(callback).not.toHaveBeenCalled();

      signal.value = 'bar';
      expect(callback).not.toHaveBeenCalled();

      signal.value = 'baz';
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('Computed', () => {
  describe('.value', () => {
    it('should produce a memoized value by dependent signals', () => {
      const foo = new Atom(1);
      const bar = new Atom(2);
      const baz = new Atom(3);

      const signal = new Computed(
        (foo, bar, baz) => ({ foo: foo.value, bar: bar.value, baz: baz.value }),
        [foo, bar, baz],
      );

      expect(signal.value).toEqual({ foo: 1, bar: 2, baz: 3 });
      expect(signal.value).toBe(signal.value);
      expect(signal.version).toBe(0);
    });

    it('should increment the version when any dependent signal has been updated', () => {
      const foo = new Atom(1);
      const bar = new Atom(2);
      const baz = new Atom(3);

      const signal = new Computed(
        (foo, bar, baz) => ({ foo: foo.value, bar: bar.value, baz: baz.value }),
        [foo, bar, baz],
      );

      foo.value = 10;
      expect(signal.value).toEqual({ foo: 10, bar: 2, baz: 3 });
      expect(signal.version).toBe(1);

      let oldValue = signal.value;

      bar.value = 20;
      expect(signal.value).toEqual({ foo: 10, bar: 20, baz: 3 });
      expect(signal.value).not.toBe(oldValue);
      expect(signal.version).toBe(2);

      oldValue = signal.value;

      baz.value = 30;
      expect(signal.value).toEqual({ foo: 10, bar: 20, baz: 30 });
      expect(signal.value).not.toBe(oldValue);
      expect(signal.version).toBe(3);
    });
  });

  describe('.subscribe()', () => {
    it('should invoke the callback on update', () => {
      const foo = new Atom(1);
      const bar = new Atom(2);
      const baz = new Atom(3);
      const callback = vi.fn();

      const signal = new Computed(
        (foo, bar, baz) => ({ foo: foo.value, bar: bar.value, baz: baz.value }),
        [foo, bar, baz],
      );

      signal.subscribe(callback);
      expect(callback).toHaveBeenCalledTimes(0);

      foo.value++;
      expect(callback).toHaveBeenCalledTimes(1);

      bar.value++;
      expect(callback).toHaveBeenCalledTimes(2);

      baz.value++;
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should not invoke the unsubscribed callback', () => {
      const foo = new Atom(1);
      const bar = new Atom(2);
      const baz = new Atom(3);
      const callback = vi.fn();

      const signal = new Computed(
        (foo, bar, baz) => ({ foo: foo.value, bar: bar.value, baz: baz.value }),
        [foo, bar, baz],
      );

      signal.subscribe(callback)();
      expect(callback).not.toHaveBeenCalled();

      foo.value++;
      expect(callback).not.toHaveBeenCalled();

      bar.value++;
      expect(callback).not.toHaveBeenCalled();

      baz.value++;
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('Projected', () => {
  describe('.value', () => {
    it('should apply the function to each values', () => {
      const signal = new Atom(1);
      const projectedSignal = signal.map((n) => n * 2);

      expect(projectedSignal.value).toBe(2);
      expect(projectedSignal.version).toBe(0);

      signal.value++;

      expect(projectedSignal.value).toBe(4);
      expect(projectedSignal.version).toBe(1);

      signal.value++;

      expect(projectedSignal.value).toBe(6);
      expect(projectedSignal.version).toBe(2);
    });
  });

  describe('.subscribe()', () => {
    it('should invoke the callback on update', () => {
      const signal = new Atom(1);
      const projectedSignal = signal.map((n) => n * 2);
      const callback = vi.fn();

      projectedSignal.subscribe(callback);
      expect(callback).toHaveBeenCalledTimes(0);

      signal.value++;
      expect(callback).toHaveBeenCalledTimes(1);

      signal.value++;
      expect(callback).toHaveBeenCalledTimes(2);

      signal.value++;
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should not invoke the unsubscribed callback', () => {
      const signal = new Atom(1);
      const projectedSignal = signal.map((n) => n * 2);
      const callback = vi.fn();

      projectedSignal.subscribe(callback)();
      expect(callback).not.toHaveBeenCalled();

      signal.value++;
      expect(callback).not.toHaveBeenCalled();

      signal.value++;
      expect(callback).not.toHaveBeenCalled();

      signal.value++;
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('Scanned', () => {
  describe('.value', () => {
    it('should apply the accumulator to each values', () => {
      const signal = new Atom(1);
      const scannedSignal = signal.scan((result, n) => result + n, 0);

      expect(scannedSignal.value).toBe(1);
      expect(scannedSignal.version).toBe(0);

      signal.value++;

      expect(scannedSignal.value).toBe(3);
      expect(scannedSignal.version).toBe(1);

      signal.value++;

      expect(scannedSignal.value).toBe(6);
      expect(scannedSignal.version).toBe(2);
    });
  });

  describe('.subscribe()', () => {
    it('should invoke the callback on update', () => {
      const signal = new Atom(1);
      const scannedSignal = signal.scan((result, n) => result + n, 0);
      const callback = vi.fn();

      scannedSignal.subscribe(callback);
      expect(callback).toHaveBeenCalledTimes(0);

      signal.value++;
      expect(callback).toHaveBeenCalledTimes(1);

      signal.value++;
      expect(callback).toHaveBeenCalledTimes(2);

      signal.value++;
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it('should not invoke the unsubscribed callback', () => {
      const signal = new Atom(1);
      const scannedSignal = signal.scan((result, n) => result + n, 0);
      const callback = vi.fn();

      scannedSignal.subscribe(callback)();
      expect(callback).not.toHaveBeenCalled();

      signal.value++;
      expect(callback).not.toHaveBeenCalled();

      signal.value++;
      expect(callback).not.toHaveBeenCalled();

      signal.value++;
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('SignalBinding', () => {
  describe('.constructor', () => {
    it('should construct a new SignalBinding', () => {
      const signal = new Atom('foo');
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new RenderState());
      const binding = new SignalBinding(signal, part, updater);

      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
      expect(binding.value).toBe(signal);
      expect(binding.binding).toBeInstanceOf(NodeBinding);
      expect(binding.binding.value).toBe('foo');
      expect(updater.isPending()).toBe(false);
      expect(updater.isScheduled()).toBe(false);
    });
  });

  describe('.connect()', () => {
    it('should subscribe the signal', () => {
      const signal = new Atom('foo');
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new RenderState());
      const binding = new SignalBinding(signal, part, updater);

      const connectSpy = vi.spyOn(binding.binding, 'connect');
      const bindSpy = vi.spyOn(binding.binding, 'bind');

      binding.connect(updater);

      expect(binding.binding.value).toBe('foo');
      expect(connectSpy).toHaveBeenCalled();
      expect(bindSpy).not.toHaveBeenCalled();

      signal.value = 'bar';

      expect(binding.binding.value).toBe('bar');
      expect(connectSpy).toHaveBeenCalled();
      expect(bindSpy).toHaveBeenCalledOnce();
    });
  });

  describe('.bind()', () => {
    it('should update the the value binding with current signal value', () => {
      const signal = new Atom('foo');
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new RenderState());
      const binding = new SignalBinding(signal, part, updater);

      const unsubscribeSpy = vi.fn();
      const subscribe = vi
        .spyOn(signal, 'subscribe')
        .mockReturnValue(unsubscribeSpy);
      const connectSpy = vi.spyOn(binding.binding, 'connect');
      const bindSpy = vi.spyOn(binding.binding, 'bind');

      binding.connect(updater);
      signal.setUntrackedValue('bar');
      binding.bind(signal, updater);

      expect(binding.binding.value).toBe('bar');
      expect(connectSpy).toHaveBeenCalled();
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(unsubscribeSpy).not.toHaveBeenCalled();
      expect(subscribe).toHaveBeenCalledOnce();
    });

    it('should unsubscribe the previous subscription if signal changes', () => {
      const signal1 = new Atom('foo');
      const signal2 = new Atom('bar');
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new RenderState());
      const binding = new SignalBinding(signal1, part, updater);

      const unsubscribe1Spy = vi.fn();
      const unsubscribe2Spy = vi.fn();
      const subscribe1Spy = vi
        .spyOn(signal1, 'subscribe')
        .mockReturnValue(unsubscribe1Spy);
      const subscribe2Spy = vi
        .spyOn(signal2, 'subscribe')
        .mockReturnValue(unsubscribe1Spy);
      const connectSpy = vi.spyOn(binding.binding, 'connect');
      const bindSpy = vi.spyOn(binding.binding, 'bind');

      binding.connect(updater);
      binding.bind(signal2, updater);

      expect(binding.binding.value).toBe('bar');
      expect(connectSpy).toHaveBeenCalled();
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(unsubscribe1Spy).toHaveBeenCalledOnce();
      expect(unsubscribe2Spy).not.toHaveBeenCalled();
      expect(subscribe1Spy).toHaveBeenCalledOnce();
      expect(subscribe2Spy).toHaveBeenCalledOnce();
    });

    it('should throw the error if the value is not a signal', () => {
      expect(() => {
        const updater = new SyncUpdater(new RenderState());
        const binding = new SignalBinding(
          new Atom('foo'),
          {
            type: PartType.Attribute,
            node: document.createElement('div'),
            name: 'class',
          },
          updater,
        );
        binding.bind(null as any, updater);
      }).toThrow(
        'A value must be a instance of Signal directive, but got "null".',
      );
    });
  });

  describe('.unbind()', () => {
    it('should unbind the value binding and unsubscribe the signal', () => {
      const signal = new Atom('foo');
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new RenderState());
      const binding = new SignalBinding(signal, part, updater);

      const unsubscribeSpy = vi.fn();
      const subscribeSpy = vi
        .spyOn(signal, 'subscribe')
        .mockReturnValue(unsubscribeSpy);
      const unbindSpy = vi.spyOn(binding.binding, 'unbind');

      binding.connect(updater);

      expect(unbindSpy).not.toHaveBeenCalled();
      expect(unsubscribeSpy).not.toHaveBeenCalled();
      expect(subscribeSpy).toHaveBeenCalledOnce();

      binding.unbind(updater);

      expect(unbindSpy).toHaveBeenCalledOnce();
      expect(unsubscribeSpy).toHaveBeenCalledOnce();
      expect(subscribeSpy).toHaveBeenCalledOnce();
    });
  });

  describe('.disconnect()', () => {
    it('should disconnect the value binding and unsubscribe the signal', () => {
      const signal = new Atom('foo');
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const updater = new SyncUpdater(new RenderState());
      const binding = new SignalBinding(signal, part, updater);

      const unsubscribeSpy = vi.fn();
      const subscribeSpy = vi
        .spyOn(signal, 'subscribe')
        .mockReturnValue(unsubscribeSpy);
      const disconnectSpy = vi.spyOn(binding.binding, 'disconnect');

      binding.connect(updater);

      expect(unsubscribeSpy).not.toHaveBeenCalled();
      expect(subscribeSpy).toHaveBeenCalledOnce();
      expect(disconnectSpy).not.toHaveBeenCalled();

      binding.disconnect();

      expect(unsubscribeSpy).toHaveBeenCalledOnce();
      expect(subscribeSpy).toHaveBeenCalledOnce();
      expect(disconnectSpy).toHaveBeenCalledOnce();
    });
  });
});
