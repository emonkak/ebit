import { describe, expect, it, vi } from 'vitest';

import { type Hook, HookType, createUpdateQueue } from '../src/baseTypes.js';
import { Literal, LiteralProcessor } from '../src/literal.js';
import { RenderContext, usableTag } from '../src/renderContext.js';
import { SyncUpdater } from '../src/updaters/syncUpdater.js';
import {
  MockBlock,
  MockRenderHost,
  MockTemplate,
  MockUsableObject,
} from './mocks.js';

describe('RenderContext', () => {
  describe('.constructor()', () => {
    it('should construct a new RenderContext', () => {
      const host = new MockRenderHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const literalProcessor = new LiteralProcessor();
      const hooks: Hook[] = [];
      const queue = createUpdateQueue();
      const context = new RenderContext(
        host,
        updater,
        block,
        queue,
        hooks,
        literalProcessor,
      );

      expect(context.host).toBe(host);
      expect(context.updater).toBe(updater);
      expect(context.block).toBe(block);
      expect(context.literalProcessor).toBe(literalProcessor);
      expect(context.queue).toBe(queue);
      expect(context.hooks).toBe(hooks);
    });
  });

  describe('.dynamicHTML()', () => {
    it('should return a TemplateResult with literals representing HTML fragment', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<any, RenderContext>();
      const processSpy = vi.spyOn(context.literalProcessor, 'process');
      const getTemplateSpy = vi
        .spyOn(context.host, 'getTemplate')
        .mockReturnValue(template);

      expect(
        context.dynamicHTML`<${new Literal('div')}>Hello, ${'World'}!</${new Literal('div')}>`,
      ).toStrictEqual({
        template,
        values: ['World'],
      });
      expect(processSpy).toHaveBeenCalledOnce();
      expect(processSpy).toHaveBeenCalledWith(
        ['<', '>Hello, ', '!</', '>'],
        [new Literal('div'), 'World', new Literal('div')],
      );
      expect(getTemplateSpy).toHaveBeenCalledOnce();
      expect(getTemplateSpy).toHaveBeenCalledWith(
        ['<div>Hello, ', '!</div>'],
        ['World'],
        'html',
      );
    });
  });

  describe('.dynamicMath()', () => {
    it('should return a TemplateResult with literals representing HTML fragment', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<any, RenderContext>();
      const processLiteralsSpy = vi.spyOn(context.literalProcessor, 'process');
      const getTemplateSpy = vi
        .spyOn(context.host, 'getTemplate')
        .mockReturnValue(template);

      expect(
        context.dynamicMath`<${new Literal('mi')}>${'x'}</${new Literal('mi')}>`,
      ).toStrictEqual({
        template,
        values: ['x'],
      });
      expect(processLiteralsSpy).toHaveBeenCalledOnce();
      expect(processLiteralsSpy).toHaveBeenCalledWith(
        ['<', '>', '</', '>'],
        [new Literal('mi'), 'x', new Literal('mi')],
      );
      expect(getTemplateSpy).toHaveBeenCalledOnce();
      expect(getTemplateSpy).toHaveBeenCalledWith(
        ['<mi>', '</mi>'],
        ['x'],
        'math',
      );
    });
  });

  describe('.dynamicSVG()', () => {
    it('should return a TemplateResult with literals representing SVG fragment', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<any, RenderContext>();
      const processSpy = vi.spyOn(context.literalProcessor, 'process');
      const getTemplateSpy = vi
        .spyOn(context.host, 'getTemplate')
        .mockReturnValue(template);

      expect(
        context.dynamicSVG`<${new Literal('text')}>Hello, ${'World'}!</${new Literal('text')}>`,
      ).toStrictEqual({
        template,
        values: ['World'],
      });
      expect(processSpy).toHaveBeenCalledOnce();
      expect(processSpy).toHaveBeenCalledWith(
        ['<', '>Hello, ', '!</', '>'],
        [new Literal('text'), 'World', new Literal('text')],
      );
      expect(getTemplateSpy).toHaveBeenCalledOnce();
      expect(getTemplateSpy).toHaveBeenCalledWith(
        ['<text>Hello, ', '!</text>'],
        ['World'],
        'svg',
      );
    });
  });

  describe('.finalize()', () => {
    it('should enqueue a Finalizer hook', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      context.finalize();

      expect(context.hooks).toStrictEqual([{ type: HookType.Finalizer }]);

      context = context.clone();
      context.finalize();

      expect(context.hooks).toStrictEqual([{ type: HookType.Finalizer }]);
    });

    it('should throw an error if a hook is added after finalization', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      expect(() => {
        context.finalize();
        context.useEffect(() => {});
      }).toThrow('Cannot add property');
    });

    it('should throw an error if fewer hooks are used than last time', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      context.useEffect(() => {});
      context.finalize();

      expect(() => {
        context = context.clone();
        context.finalize();
      }).toThrow('Unexpected hook type.');
    });

    it('should throw an error if more hooks are used than last time', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      context.finalize();

      expect(() => {
        context = context.clone();
        context.useEffect(() => {});
      }).toThrow('Unexpected hook type.');
    });
  });

  describe('.forceUpdate()', () => {
    it('should request update with the given priority', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');

      context = context.clone();
      context.forceUpdate('background');

      expect(requestUpdateSpy).toHaveBeenCalledOnce();
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'background',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );
    });

    it('should request update with the host priority', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');
      const getCurrentPrioritySpy = vi
        .spyOn(context.host, 'getCurrentPriority')
        .mockReturnValue('user-blocking');

      context.forceUpdate();

      expect(requestUpdateSpy).toHaveBeenCalledOnce();
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'user-blocking',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );
      expect(getCurrentPrioritySpy).toHaveBeenCalledOnce();
    });
  });

  describe('.getContextValue()', () => {
    it('should get a value from the block scope', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const getScopedValueSpy = vi
        .spyOn(context.host, 'getScopedValue')
        .mockReturnValue(123);

      expect(context.getContextValue('foo')).toBe(123);
      expect(getScopedValueSpy).toHaveBeenCalledOnce();
      expect(getScopedValueSpy).toHaveBeenCalledWith('foo', context.block);
    });
  });

  describe('.html()', () => {
    it('should return a TemplateResult representing HTML fragment', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<any, RenderContext>();
      const getTemplateSpy = vi
        .spyOn(context.host, 'getTemplate')
        .mockReturnValue(template);

      expect(context.html`<div>Hello, ${'World'}!</div>`).toStrictEqual({
        template,
        values: ['World'],
      });
      expect(getTemplateSpy).toHaveBeenCalledOnce();
      expect(getTemplateSpy).toHaveBeenCalledWith(
        ['<div>Hello, ', '!</div>'],
        ['World'],
        'html',
      );
    });
  });

  describe('.isFinalized()', () => {
    it('should check whether the context is finalized', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      expect(context.isFinalized()).toBe(false);
      context.finalize();
      expect(context.isFinalized()).toBe(true);

      context = context.clone();

      expect(context.isFinalized()).toBe(false);
      context.finalize();
      expect(context.isFinalized()).toBe(true);
    });
  });

  describe('.isRendered()', () => {
    it('should check whether the context is rendered at least once', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      expect(context.isRendered()).toBe(false);
      context.finalize();
      expect(context.isRendered()).toBe(true);

      context = context.clone();

      expect(context.isRendered()).toBe(true);
      context.finalize();
      expect(context.isRendered()).toBe(true);
    });
  });

  describe('.math()', () => {
    it('should return a TemplateResult representing HTML fragment', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<any, RenderContext>();
      const getTemplateSpy = vi
        .spyOn(context.host, 'getTemplate')
        .mockReturnValue(template);

      expect(context.math`<mi>${'x'}</mi>`).toStrictEqual({
        template,
        values: ['x'],
      });
      expect(getTemplateSpy).toHaveBeenCalledOnce();
      expect(getTemplateSpy).toHaveBeenCalledWith(
        ['<mi>', '</mi>'],
        ['x'],
        'math',
      );
    });
  });

  describe('.setContextValue()', () => {
    it('should set a value to the block scope', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const setScopedValueSpy = vi.spyOn(context.host, 'setScopedValue');

      context.setContextValue('foo', 123);

      expect(setScopedValueSpy).toHaveBeenCalledOnce();
      expect(setScopedValueSpy).toHaveBeenCalledWith('foo', 123, context.block);
    });
  });

  describe('.svg()', () => {
    it('should return a TemplateResult representing SVG fragment', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<any, RenderContext>();
      const getTemplateSpy = vi
        .spyOn(context.host, 'getTemplate')
        .mockReturnValue(template);

      expect(context.svg`<text>Hello, ${'World'}!</text>`).toStrictEqual({
        template,
        values: ['World'],
      });
      expect(getTemplateSpy).toHaveBeenCalledOnce();
      expect(getTemplateSpy).toHaveBeenCalledWith(
        ['<text>Hello, ', '!</text>'],
        ['World'],
        'svg',
      );
    });
  });

  describe('.use()', () => {
    it('should handle a UsableCallback', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const usableCallback = vi.fn(() => 'foo');

      expect(context.use(usableCallback)).toBe('foo');
      expect(usableCallback).toHaveBeenCalledOnce();
      expect(usableCallback).toHaveBeenCalledWith(context);
    });

    it('should handle a UsableObject', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const usableObject = new MockUsableObject('foo');
      const usableObjectSpy = vi.spyOn(usableObject, usableTag);

      expect(context.use(usableObject)).toBe('foo');
      expect(usableObjectSpy).toHaveBeenCalledOnce();
      expect(usableObjectSpy).toHaveBeenCalledWith(context);
    });

    it('should handle a UsableArray', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const usableCallback = vi.fn(() => 'foo' as const);
      const usableObject = new MockUsableObject('bar');
      const usableObjectSpy = vi.spyOn(usableObject, usableTag);

      expect(context.use([usableCallback, usableObject])).toStrictEqual([
        'foo',
        'bar',
      ]);
      expect(usableObjectSpy).toHaveBeenCalledOnce();
      expect(usableObjectSpy).toHaveBeenCalledWith(context);
      expect(usableCallback).toHaveBeenCalledOnce();
      expect(usableCallback).toHaveBeenCalledWith(context);
    });
  });

  describe('.unsafeHTML()', () => {
    it('should return a TemplateResult representing raw HTML string', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<readonly [], RenderContext>();
      const content = '<div>Hello, World!</div>';
      const getUnsafeTemplateSpy = vi
        .spyOn(context.host, 'getUnsafeTemplate')
        .mockReturnValue(template);

      expect(context.unsafeHTML(content)).toStrictEqual({
        template,
        values: [],
      });
      expect(getUnsafeTemplateSpy).toHaveBeenCalledOnce();
      expect(getUnsafeTemplateSpy).toHaveBeenCalledWith(content, 'html');
    });
  });

  describe('.unsafeMath()', () => {
    it('should return a TemplateResult representing raw SVG string', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<readonly [], RenderContext>();
      const content = '<mi>x</mi><mo>x</mo><mn>2</mn>';
      const getUnsafeTemplateSpy = vi
        .spyOn(context.host, 'getUnsafeTemplate')
        .mockReturnValue(template);

      expect(context.unsafeMath(content)).toStrictEqual({
        template,
        values: [],
      });
      expect(getUnsafeTemplateSpy).toHaveBeenCalledOnce();
      expect(getUnsafeTemplateSpy).toHaveBeenCalledWith(content, 'math');
    });
  });

  describe('.unsafeSVG()', () => {
    it('should return a TemplateResult representing raw SVG string', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate<readonly [], RenderContext>();
      const content = '<text>Hello, World!</text>';
      const getUnsafeTemplateSpy = vi
        .spyOn(context.host, 'getUnsafeTemplate')
        .mockReturnValue(template);

      expect(context.unsafeSVG(content)).toStrictEqual({
        template,
        values: [],
      });
      expect(getUnsafeTemplateSpy).toHaveBeenCalledOnce();
      expect(getUnsafeTemplateSpy).toHaveBeenCalledWith(content, 'svg');
    });
  });

  describe('.useCallback()', () => {
    it('should return a memoized callback', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const callback1 = () => {};
      const callback2 = () => {};
      const callback3 = () => {};

      expect(context.useCallback(callback1, ['foo'])).toBe(callback1);

      context = context.clone();

      expect(context.useCallback(callback2, ['foo'])).toBe(callback1);

      context = context.clone();

      expect(context.useCallback(callback3, ['bar'])).toBe(callback3);
    });
  });

  describe('.useDeferredValue()', () => {
    it('should return a value deferred until next rendering', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');

      expect(context.useDeferredValue('foo')).toBe('foo');
      context.flushUpdate();
      expect(requestUpdateSpy).toHaveBeenCalledTimes(0);

      context = context.clone();

      expect(context.useDeferredValue('bar')).toBe('foo');
      context.flushUpdate();
      expect(requestUpdateSpy).toHaveBeenCalledTimes(1);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'background',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );

      context = context.clone();

      expect(context.useDeferredValue('bar')).toBe('bar');
      context.flushUpdate();
      expect(requestUpdateSpy).toHaveBeenCalledTimes(1);
    });

    it('should return a initial value if it is presented', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      expect(context.useDeferredValue('bar', 'foo')).toBe('foo');
      context.flushUpdate();

      context = context.clone();

      expect(context.useDeferredValue('baz')).toBe('bar');
      context.flushUpdate();

      context = context.clone();

      expect(context.useDeferredValue('baz')).toBe('baz');
    });
  });

  describe('.useEffect()', () => {
    it('should perform a cleanup function when a new effect is enqueued', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const cleanupFn = vi.fn();
      const effectFn = vi.fn().mockReturnValue(cleanupFn);

      context.useEffect(effectFn);
      expect(context.hooks).toStrictEqual([
        {
          type: HookType.PassiveEffect,
          callback: effectFn,
          cleanup: undefined,
          dependencies: null,
        },
      ]);
      expect(context.queue.passiveEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(cleanupFn).not.toHaveBeenCalled();

      context = context.clone();
      context.useEffect(effectFn);
      expect(context.queue.passiveEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(cleanupFn).toHaveBeenCalledOnce();
    });

    it('should not perform an effect function if dependencies are not changed', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const effectFn = vi.fn();

      context.useEffect(effectFn, []);
      expect(context.hooks).toStrictEqual([
        {
          type: HookType.PassiveEffect,
          callback: effectFn,
          cleanup: undefined,
          dependencies: [],
        },
      ]);
      expect(context.queue.passiveEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledOnce();

      context = context.clone();
      context.useEffect(effectFn, []);
      expect(context.queue.passiveEffects).toHaveLength(0);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledOnce();
    });
  });

  describe('.useId()', () => {
    it('should return a unique identifier', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      expect(context.useId()).toBe(':__test__-1:');
      expect(context.useId()).toBe(':__test__-2:');

      context = context.clone();

      expect(context.useId()).toBe(':__test__-1:');
      expect(context.useId()).toBe(':__test__-2:');
    });
  });

  describe('.useInsertionEffect()', () => {
    it('should perform a cleanup function when a new effect is enqueued', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const cleanupFn = vi.fn();
      const effectFn = vi.fn().mockReturnValue(cleanupFn);

      context.useInsertionEffect(effectFn);
      expect(context.hooks).toStrictEqual([
        {
          type: HookType.InsertionEffect,
          callback: effectFn,
          cleanup: undefined,
          dependencies: null,
        },
      ]);
      expect(context.queue.mutationEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(cleanupFn).not.toHaveBeenCalled();

      context = context.clone();
      context.useInsertionEffect(effectFn);
      expect(context.queue.mutationEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(cleanupFn).toHaveBeenCalledOnce();
    });

    it('should not perform an effect function if dependencies are not changed', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const effectFn = vi.fn();

      context.useInsertionEffect(effectFn, []);
      expect(context.hooks).toStrictEqual([
        {
          type: HookType.InsertionEffect,
          callback: effectFn,
          cleanup: undefined,
          dependencies: [],
        },
      ]);
      expect(context.queue.mutationEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledOnce();

      context = context.clone();
      context.useInsertionEffect(effectFn, []);
      expect(context.queue.mutationEffects).toHaveLength(0);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledOnce();
    });
  });

  describe('.useLayoutEffect()', () => {
    it('should perform a cleanup function when a new effect is enqueued', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const cleanupFn = vi.fn();
      const effectFn = vi.fn().mockReturnValue(cleanupFn);

      context.useLayoutEffect(effectFn);
      expect(context.hooks).toStrictEqual([
        {
          type: HookType.LayoutEffect,
          callback: effectFn,
          cleanup: undefined,
          dependencies: null,
        },
      ]);
      expect(context.queue.layoutEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledTimes(1);
      expect(cleanupFn).not.toHaveBeenCalled();

      context = context.clone();
      context.useLayoutEffect(effectFn);
      expect(context.queue.layoutEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledTimes(2);
      expect(cleanupFn).toHaveBeenCalledOnce();
    });

    it('should not perform an effect function if dependencies are not changed', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const effectFn = vi.fn();

      context.useLayoutEffect(effectFn, []);

      expect(context.hooks).toStrictEqual([
        {
          type: HookType.LayoutEffect,
          callback: effectFn,
          cleanup: undefined,
          dependencies: [],
        },
      ]);
      expect(context.queue.layoutEffects).toHaveLength(1);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledOnce();

      context = context.clone();
      context.useLayoutEffect(effectFn, []);
      expect(context.queue.layoutEffects).toHaveLength(0);

      context.flushUpdate();
      expect(effectFn).toHaveBeenCalledOnce();
    });
  });

  describe('.useMemo()', () => {
    it('should return a memoized value until dependencies is changed', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const factoryFn1 = vi.fn().mockReturnValue('foo');
      const factoryFn2 = vi.fn().mockReturnValue('bar');

      expect(context.useMemo(factoryFn1, ['foo'])).toBe('foo');

      context = context.clone();
      expect(context.useMemo(factoryFn2, ['foo'])).toBe('foo');

      context = context.clone();
      expect(context.useMemo(factoryFn2, ['bar'])).toBe('bar');
    });
  });

  describe('.useReducer()', () => {
    it('should request update with "inherit" priority', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');
      const getCurrentPrioritySpy = vi
        .spyOn(context.host, 'getCurrentPriority')
        .mockReturnValue('user-blocking');
      let [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        [],
      );
      addMessage('foo');

      expect(message).toStrictEqual([]);
      expect(requestUpdateSpy).toHaveBeenCalledTimes(1);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'user-blocking',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );
      expect(getCurrentPrioritySpy).toHaveBeenCalledTimes(1);

      context = context.clone();
      [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        [],
      );
      addMessage('bar');

      expect(message).toStrictEqual(['foo']);
      expect(requestUpdateSpy).toHaveBeenCalledTimes(2);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'user-blocking',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );
      expect(getCurrentPrioritySpy).toHaveBeenCalledTimes(2);

      context = context.clone();
      [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        [],
      );

      expect(message).toStrictEqual(['foo', 'bar']);
    });

    it('should request update with user-specified priority', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');

      let [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        [],
      );
      addMessage('foo', 'user-blocking');

      expect(message).toStrictEqual([]);
      expect(requestUpdateSpy).toHaveBeenCalledTimes(1);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'user-blocking',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );

      context = context.clone();
      [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        [],
      );
      addMessage('bar', 'background');

      expect(message).toStrictEqual(['foo']);
      expect(requestUpdateSpy).toHaveBeenCalledTimes(2);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'background',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );

      context = context.clone();
      [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        [],
      );

      expect(message).toStrictEqual(['foo', 'bar']);
    });

    it('should skip request update if the state has not changed', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');
      let [count, addCount] = context.useReducer<number, number>(
        (count, n) => count + n,
        0,
      );
      addCount(0);

      expect(count).toBe(0);
      expect(requestUpdateSpy).not.toHaveBeenCalled();

      context = context.clone();
      [count] = context.useReducer<number, number>((count, n) => count + n, 0);
      addCount(0);

      expect(count).toBe(0);
      expect(requestUpdateSpy).not.toHaveBeenCalled();
    });

    it('should return the function result as an initial state', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      let [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        () => ['foo', 'bar'],
      );
      addMessage('baz');

      expect(message).toStrictEqual(['foo', 'bar']);

      context = context.clone();
      [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        () => ['foo', 'bar'],
      );

      expect(message).toStrictEqual(['foo', 'bar', 'baz']);
    });

    it('should always return the same dispatcher', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const [message1, addMessage1] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        () => ['foo', 'bar'],
      );

      context = context.clone();
      const [message2, addMessage2] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        () => ['foo', 'bar'],
      );

      expect(message1).toBe(message2);
      expect(addMessage1).toBe(addMessage2);
    });
  });

  describe('.useRef()', () => {
    it('should return the same object', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const ref = context.useRef('foo');

      expect(ref).toStrictEqual({ current: 'foo' });
      expect(Object.isSealed(ref)).toBe(true);

      context = context.clone();

      expect(context.useRef('foo')).toBe(ref);
    });
  });

  describe('.useState()', () => {
    it('should request update with the host priority', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');
      const getCurrentPrioritySpy = vi
        .spyOn(context.host, 'getCurrentPriority')
        .mockReturnValue('user-blocking');
      let [count, setCount] = context.useState(0);
      setCount(1);

      expect(count).toBe(0);
      expect(requestUpdateSpy).toHaveBeenCalledTimes(1);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'user-blocking',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );
      expect(getCurrentPrioritySpy).toHaveBeenCalledTimes(1);

      context = context.clone();
      [count, setCount] = context.useState(0);
      setCount((n) => n + 2);

      expect(count).toBe(1);
      expect(requestUpdateSpy).toHaveBeenCalledTimes(2);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'user-blocking',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );
      expect(getCurrentPrioritySpy).toHaveBeenCalledTimes(2);

      context = context.clone();
      [count, setCount] = context.useState(0);

      expect(count).toBe(3);
    });

    it('should request update with user-specified priority', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');

      let [count, setCount] = context.useState(0);
      setCount(1, 'user-blocking');

      expect(count).toBe(0);
      expect(requestUpdateSpy).toHaveBeenCalledTimes(1);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'user-blocking',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );

      context = context.clone();
      [count, setCount] = context.useState(0);
      setCount((n) => n + 2, 'background');

      expect(count).toBe(1);
      expect(requestUpdateSpy).toHaveBeenCalledTimes(2);
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'background',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );

      context = context.clone();
      [count, setCount] = context.useState(0);

      expect(count).toBe(3);
    });

    it('should skip requst update if the state has not changed', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');
      let [count, setCount] = context.useState(0);
      setCount(0);

      expect(count).toBe(0);
      expect(requestUpdateSpy).not.toHaveBeenCalled();

      context = context.clone();
      [count, setCount] = context.useState(0);
      setCount(0);

      expect(count).toBe(0);
      expect(requestUpdateSpy).not.toHaveBeenCalled();
    });

    it('should return the result of the function as an initial state', () => {
      let context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      let [message, addMessage] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        () => ['foo', 'bar'],
      );
      expect(message).toStrictEqual(['foo', 'bar']);

      addMessage('baz');

      context = context.clone();
      [message] = context.useReducer<string[], string>(
        (messages, message) => [...messages, message],
        () => ['foo', 'bar'],
      );
      expect(message).toStrictEqual(['foo', 'bar', 'baz']);
    });
  });

  describe('.useSyncEnternalStore()', () => {
    it('should return the snapshot value', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const snapshot = 'foo';
      const subscribers: (() => void)[] = [];
      const subscribe = (subscriber: () => void) => {
        const index = subscribers.push(subscriber) - 1;
        return () => {
          subscribers.splice(index, 1);
        };
      };
      const getSnapshot = () => snapshot;

      expect(context.useSyncEnternalStore(subscribe, getSnapshot)).toBe('foo');
    });

    it('should request update with the host priority when changes are notified', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const snapshot = 'foo';
      const subscribers: (() => void)[] = [];
      const subscribe = (subscriber: () => void) => {
        const index = subscribers.push(subscriber) - 1;
        return () => {
          subscribers.splice(index, 1);
        };
      };
      const getSnapshot = () => snapshot;
      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');
      const getCurrentPrioritySpy = vi
        .spyOn(context.host, 'getCurrentPriority')
        .mockReturnValue('user-blocking');

      expect(context.useSyncEnternalStore(subscribe, getSnapshot)).toBe('foo');

      context.flushUpdate();

      for (const subscriber of subscribers) {
        subscriber();
      }

      expect(requestUpdateSpy).toHaveBeenCalledOnce();
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'user-blocking',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );
      expect(getCurrentPrioritySpy).toHaveBeenCalledOnce();
    });

    it('should request update with a user-specified priority when changes are notified', () => {
      const context = new RenderContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const snapshot = 'foo';
      const subscribers: (() => void)[] = [];
      const subscribe = (subscriber: () => void) => {
        const index = subscribers.push(subscriber) - 1;
        return () => {
          subscribers.splice(index, 1);
        };
      };
      const getSnapshot = () => snapshot;

      const requestUpdateSpy = vi.spyOn(context.block, 'requestUpdate');
      const getCurrentPrioritySpy = vi
        .spyOn(context.host, 'getCurrentPriority')
        .mockReturnValue('user-blocking');

      expect(
        context.useSyncEnternalStore(subscribe, getSnapshot, 'background'),
      ).toBe('foo');

      context.flushUpdate();

      for (const subscriber of subscribers) {
        subscriber();
      }

      expect(requestUpdateSpy).toHaveBeenCalledOnce();
      expect(requestUpdateSpy).toHaveBeenCalledWith(
        'background',
        expect.objectContaining({
          host: context.host,
          updater: context.updater,
          block: context.block,
          queue: context.queue,
        }),
      );
      expect(getCurrentPrioritySpy).not.toHaveBeenCalled();
    });
  });
});
