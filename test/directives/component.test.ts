import { describe, expect, it, vi } from 'vitest';
import {
  PartType,
  UpdateContext,
  directiveTag,
  nameTag,
} from '../../src/baseTypes.js';
import {
  Component,
  ComponentBinding,
  component,
} from '../../src/directives/component.js';
import { TemplateResult } from '../../src/directives/templateResult.js';
import type { RenderContext } from '../../src/renderContext.js';
import { SyncUpdater } from '../../src/updater/syncUpdater.js';
import {
  MockBlock,
  MockTemplate,
  MockTemplateFragment,
  MockUpdateHost,
} from '../mocks.js';

describe('component()', () => {
  it('should construct a new Component directive wrapped in Root directive', () => {
    const type = () => new TemplateResult(new MockTemplate(), {});
    const props = {};
    const value = component(type, props);

    expect(value.type).toBe(type);
    expect(value.props).toBe(props);
  });
});

describe('Component', () => {
  describe('[nameTag]', () => {
    it('should return a string represented itself', () => {
      const value = new Component(function foo() {
        return new TemplateResult(new MockTemplate(), {});
      }, {});
      expect(value[nameTag]).toBe('Component(foo)');
    });
  });

  describe('[directiveTag]()', () => {
    it('should return a new BlockBinding wrapped in Root', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new Component(
        () => new TemplateResult(new MockTemplate(), {}),
        {},
      );
      const binding = value[directiveTag](part, context);

      expect(binding.value).toBe(value);
      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
      expect(binding.binding).toBeInstanceOf(ComponentBinding);
    });

    it('should throw an error if the part is not a ChildNodePart', () => {
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new Component(
        () => new TemplateResult(new MockTemplate(), {}),
        {},
      );

      expect(() => value[directiveTag](part, context)).toThrow(
        'Component directive must be used in a child node,',
      );
    });
  });
});

describe('ComponentBinding', () => {
  describe('.connect()', () => {
    it('should not render the template if it is already rendered', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const data = {};
      const template = new MockTemplate();
      const fragment = new MockTemplateFragment(data, [
        document.createComment(''),
      ]);
      const value = new Component(() => new TemplateResult(template, data), {});
      const binding = new ComponentBinding(value, part);

      const renderSpy = vi
        .spyOn(template, 'render')
        .mockReturnValueOnce(fragment);
      const mountSpy = vi.spyOn(fragment, 'mount');

      binding.connect(context);
      context.flushUpdate();

      binding.connect(context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data, context);
      expect(mountSpy).toHaveBeenCalledOnce();
      expect(mountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(fragment.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should update the block if an update is requested', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext<RenderContext>(host, updater, block);

      const value = new Component<{}, unknown, RenderContext>(
        (_props, context) => {
          context.forceUpdate('user-blocking');
          return new TemplateResult(new MockTemplate(), {});
        },
        {},
      );
      const binding = new ComponentBinding(value, part);

      const requstUpdateSpy = vi.spyOn(block, 'requestUpdate');

      binding.connect(context);

      expect(requstUpdateSpy).toHaveBeenCalledOnce();
      expect(requstUpdateSpy).toHaveBeenCalledWith('user-blocking', context);
    });

    it('should remount the fragment if it is unmounted', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const data = {};
      const template = new MockTemplate();
      const fragment = new MockTemplateFragment(data, [
        document.createComment(''),
      ]);
      const value = new Component(() => new TemplateResult(template, data), {});
      const binding = new ComponentBinding(value, part);

      const renderSpy = vi
        .spyOn(template, 'render')
        .mockReturnValueOnce(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const bindSpy = vi.spyOn(fragment, 'bind');
      const unbindSpy = vi.spyOn(fragment, 'unbind');
      const mountSpy = vi.spyOn(fragment, 'mount');
      const unmountSpy = vi.spyOn(fragment, 'unmount');

      binding.connect(context);
      context.flushUpdate();

      binding.unbind(context);
      context.flushUpdate();

      binding.connect(context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(data, context);
      expect(unbindSpy).toHaveBeenCalledOnce();
      expect(unbindSpy).toHaveBeenCalledWith(context);
      expect(mountSpy).toHaveBeenCalledTimes(2);
      expect(mountSpy).toHaveBeenCalledWith(part);
      expect(unmountSpy).toHaveBeenCalledOnce();
      expect(unmountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(fragment.startNode);
      expect(binding.endNode).toBe(part.node);
    });
  });

  describe('.bind()', () => {
    it('should bind data to the current fragment if it is a renderd from the same template', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const data1 = {};
      const data2 = {};
      const template = new MockTemplate();
      const fragment = new MockTemplateFragment(data1, [
        document.createComment(''),
      ]);
      const value1 = new Component(
        () => new TemplateResult(template, data1),
        {},
      );
      const value2 = new Component(
        () => new TemplateResult(template, data2),
        {},
      );
      const binding = new ComponentBinding(value1, part);

      const renderSpy = vi
        .spyOn(template, 'render')
        .mockReturnValueOnce(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const bindSpy = vi.spyOn(fragment, 'bind');
      const mountSpy = vi.spyOn(fragment, 'mount');

      binding.connect(context);
      context.flushUpdate();

      binding.bind(value2, context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data1, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(data2, context);
      expect(mountSpy).toHaveBeenCalledOnce();
      expect(mountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(fragment.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should unbind data from the current fragment if it is a renderd from a different template', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const data1 = {};
      const data2 = {};
      const data3 = {};
      const template1 = new MockTemplate();
      const template2 = new MockTemplate();
      const template3 = new MockTemplate();
      const fragment1 = new MockTemplateFragment(data1, [
        document.createComment(''),
      ]);
      const fragment2 = new MockTemplateFragment(data2, [
        document.createComment(''),
      ]);
      const fragment3 = new MockTemplateFragment(data3, [
        document.createComment(''),
      ]);
      const value1 = new Component(
        () => new TemplateResult(template1, data1),
        {},
      );
      const value2 = new Component(
        () => new TemplateResult(template2, data2),
        {},
      );
      const value3 = new Component(
        () => new TemplateResult(template3, data3),
        {},
      );
      const binding = new ComponentBinding(value1, part);

      const render1Spy = vi
        .spyOn(template1, 'render')
        .mockReturnValueOnce(fragment1);
      const render2Spy = vi
        .spyOn(template2, 'render')
        .mockReturnValueOnce(fragment2);
      const render3Spy = vi
        .spyOn(template3, 'render')
        .mockReturnValueOnce(fragment3);
      const connect1Spy = vi.spyOn(fragment1, 'connect');
      const connect2Spy = vi.spyOn(fragment2, 'connect');
      const connect3Spy = vi.spyOn(fragment3, 'connect');
      const unbind1Spy = vi.spyOn(fragment1, 'unbind');
      const unbind2Spy = vi.spyOn(fragment2, 'unbind');
      const unbind3Spy = vi.spyOn(fragment3, 'unbind');
      const mount1Spy = vi.spyOn(fragment1, 'mount');
      const mount2Spy = vi.spyOn(fragment2, 'mount');
      const mount3Spy = vi.spyOn(fragment3, 'mount');
      const unmount1Spy = vi.spyOn(fragment1, 'unmount');
      const unmount2Spy = vi.spyOn(fragment2, 'unmount');
      const unmount3Spy = vi.spyOn(fragment3, 'unmount');

      binding.connect(context);
      context.flushUpdate();

      binding.bind(value2, context);
      context.flushUpdate();

      binding.bind(value3, context);
      context.flushUpdate();

      expect(render1Spy).toHaveBeenCalledOnce();
      expect(render1Spy).toHaveBeenCalledWith(data1, context);
      expect(render2Spy).toHaveBeenCalledOnce();
      expect(render2Spy).toHaveBeenCalledWith(data2, context);
      expect(render3Spy).toHaveBeenCalledOnce();
      expect(render3Spy).toHaveBeenCalledWith(data2, context);
      expect(connect1Spy).toHaveBeenCalledOnce();
      expect(connect1Spy).toHaveBeenCalledWith(context);
      expect(connect2Spy).toHaveBeenCalledOnce();
      expect(connect3Spy).toHaveBeenCalledOnce();
      expect(connect3Spy).toHaveBeenCalledWith(context);
      expect(unbind1Spy).toHaveBeenCalledOnce();
      expect(unbind1Spy).toHaveBeenCalledWith(context);
      expect(unbind2Spy).toHaveBeenCalledOnce();
      expect(unbind3Spy).not.toHaveBeenCalled();
      expect(mount1Spy).toHaveBeenCalledOnce();
      expect(mount1Spy).toHaveBeenCalledWith(part);
      expect(mount2Spy).toHaveBeenCalledOnce();
      expect(mount2Spy).toHaveBeenCalledWith(part);
      expect(mount3Spy).toHaveBeenCalledOnce();
      expect(mount3Spy).toHaveBeenCalledWith(part);
      expect(unmount1Spy).toHaveBeenCalledOnce();
      expect(unmount1Spy).toHaveBeenCalledWith(part);
      expect(unmount2Spy).toHaveBeenCalledOnce();
      expect(unmount3Spy).not.toHaveBeenCalled();
      expect(binding.startNode).toBe(fragment3.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should render the template when it is called without calling connect()', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const data1 = {};
      const data2 = {};
      const template = new MockTemplate();
      const fragment = new MockTemplateFragment(data1, [
        document.createComment(''),
      ]);
      const value1 = new Component(
        () => new TemplateResult(template, data1),
        {},
      );
      const value2 = new Component(
        () => new TemplateResult(template, data2),
        {},
      );
      const binding = new ComponentBinding(value1, part);

      const renderSpy = vi
        .spyOn(template, 'render')
        .mockReturnValueOnce(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const bindSpy = vi.spyOn(fragment, 'bind');
      const mountSpy = vi.spyOn(fragment, 'mount');

      binding.bind(value2, context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data2, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).not.toHaveBeenCalled();
      expect(mountSpy).toHaveBeenCalledOnce();
      expect(mountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(fragment.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should only mount the last rendered fragment if there is multiple renderings durling a transation', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const data1 = { name: 'foo' };
      const data2 = { name: 'bar' };
      const template1 = new MockTemplate();
      const template2 = new MockTemplate();
      const fragment1 = new MockTemplateFragment(data1, [
        document.createComment(''),
      ]);
      const fragment2 = new MockTemplateFragment(data2, [
        document.createComment(''),
      ]);
      const value1 = new Component(
        () => new TemplateResult(template1, data1),
        {},
      );
      const value2 = new Component(
        () => new TemplateResult(template2, data2),
        {},
      );
      const binding = new ComponentBinding(value1, part);

      const render1Spy = vi
        .spyOn(template1, 'render')
        .mockReturnValueOnce(fragment1);
      const render2Spy = vi
        .spyOn(template2, 'render')
        .mockReturnValueOnce(fragment2);
      const connect1Spy = vi.spyOn(fragment1, 'connect');
      const connect2Spy = vi.spyOn(fragment2, 'connect');
      const bind1Spy = vi.spyOn(fragment1, 'bind');
      const bind2Spy = vi.spyOn(fragment2, 'bind');
      const unbind1Spy = vi.spyOn(fragment1, 'unbind');
      const unbind2Spy = vi.spyOn(fragment2, 'unbind');
      const mount1Spy = vi.spyOn(fragment1, 'mount');
      const mount2Spy = vi.spyOn(fragment2, 'mount');
      const unmount1Spy = vi.spyOn(fragment1, 'unmount');
      const unmount2Spy = vi.spyOn(fragment2, 'unmount');

      binding.connect(context);
      binding.bind(value2, context);
      context.flushUpdate();

      expect(render1Spy).toHaveBeenCalledOnce();
      expect(render1Spy).toHaveBeenCalledWith(data1, context);
      expect(render2Spy).toHaveBeenCalledOnce();
      expect(render2Spy).toHaveBeenCalledWith(data2, context);
      expect(connect1Spy).toHaveBeenCalledOnce();
      expect(connect2Spy).toHaveBeenCalledOnce();
      expect(connect2Spy).toHaveBeenCalledWith(context);
      expect(bind1Spy).not.toHaveBeenCalled();
      expect(bind2Spy).not.toHaveBeenCalled();
      expect(unbind1Spy).toHaveBeenCalledOnce();
      expect(unbind1Spy).toHaveBeenCalledWith(context);
      expect(unbind2Spy).not.toHaveBeenCalled();
      expect(mount1Spy).not.toHaveBeenCalled();
      expect(mount2Spy).toHaveBeenCalledOnce();
      expect(mount2Spy).toHaveBeenCalledWith(part);
      expect(unmount1Spy).not.toHaveBeenCalled();
      expect(unmount2Spy).not.toHaveBeenCalled();
      expect(binding.startNode).toBe(fragment2.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should remount the fragment if it is unmounted', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const data = {};
      const template = new MockTemplate();
      const fragment = new MockTemplateFragment(data, [
        document.createComment(''),
      ]);
      const value = new Component(() => new TemplateResult(template, data), {});
      const binding = new ComponentBinding(value, part);

      const renderSpy = vi
        .spyOn(template, 'render')
        .mockReturnValueOnce(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const bindSpy = vi.spyOn(fragment, 'bind');
      const unbindSpy = vi.spyOn(fragment, 'unbind');
      const mountSpy = vi.spyOn(fragment, 'mount');
      const unmountSpy = vi.spyOn(fragment, 'unmount');

      binding.connect(context);
      context.flushUpdate();

      binding.unbind(context);
      context.flushUpdate();

      binding.bind(value, context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(data, context);
      expect(unbindSpy).toHaveBeenCalledOnce();
      expect(unbindSpy).toHaveBeenCalledWith(context);
      expect(mountSpy).toHaveBeenCalledTimes(2);
      expect(mountSpy).toHaveBeenCalledWith(part);
      expect(unmountSpy).toHaveBeenCalledOnce();
      expect(unmountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(fragment.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should reuse the fragment cached from previous renderings', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const template1 = new MockTemplate();
      const template2 = new MockTemplate();
      const data1 = {};
      const data2 = {};
      const fragment1 = new MockTemplateFragment(data1, [
        document.createComment(''),
      ]);
      const fragment2 = new MockTemplateFragment(data2, [
        document.createComment(''),
      ]);
      const value1 = new Component(
        () => new TemplateResult(template1, data1),
        {},
      );
      const value2 = new Component(
        () => new TemplateResult(template2, data2),
        {},
      );
      const binding = new ComponentBinding(value1, part);

      const render1Spy = vi
        .spyOn(template1, 'render')
        .mockReturnValue(fragment1);
      const render2Spy = vi
        .spyOn(template2, 'render')
        .mockReturnValue(fragment2);
      const connect1Spy = vi.spyOn(fragment1, 'connect');
      const connect2Spy = vi.spyOn(fragment2, 'connect');
      const unbind1Spy = vi.spyOn(fragment1, 'unbind');
      const unbind2Spy = vi.spyOn(fragment2, 'unbind');
      const mount1Spy = vi.spyOn(fragment1, 'mount');
      const mount2Spy = vi.spyOn(fragment2, 'mount');
      const unmount1Spy = vi.spyOn(fragment1, 'unmount');
      const unmount2Spy = vi.spyOn(fragment2, 'unmount');

      binding.connect(context);
      context.flushUpdate();

      binding.bind(value2, context);
      context.flushUpdate();

      binding.bind(value1, context);
      context.flushUpdate();

      expect(render1Spy).toHaveBeenCalledOnce();
      expect(render1Spy).toHaveBeenCalledWith(data1, context);
      expect(render2Spy).toHaveBeenCalledOnce();
      expect(render2Spy).toHaveBeenCalledWith(data2, context);
      expect(connect1Spy).toHaveBeenCalledOnce();
      expect(connect1Spy).toHaveBeenCalledWith(context);
      expect(connect2Spy).toHaveBeenCalled();
      expect(connect2Spy).toHaveBeenCalledWith(context);
      expect(unbind1Spy).toHaveBeenCalledOnce();
      expect(unbind1Spy).toHaveBeenCalledWith(context);
      expect(unbind2Spy).toHaveBeenCalled();
      expect(unbind2Spy).toHaveBeenCalledWith(context);
      expect(mount1Spy).toHaveBeenCalledTimes(2);
      expect(mount1Spy).toHaveBeenNthCalledWith(1, part);
      expect(mount1Spy).toHaveBeenNthCalledWith(2, part);
      expect(mount2Spy).toHaveBeenCalledOnce();
      expect(mount2Spy).toHaveBeenCalledWith(part);
      expect(unmount1Spy).toHaveBeenCalledOnce();
      expect(unmount1Spy).toHaveBeenCalledWith(part);
      expect(unmount2Spy).toHaveBeenCalledOnce();
      expect(unmount2Spy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(fragment1.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should clean hooks if the component has been changed', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext<RenderContext>(host, updater, block);

      const cleanup1Fn = vi.fn();
      const cleanup2Fn = vi.fn();
      const value1 = new Component<{}, unknown, RenderContext>(
        (_props, context) => {
          context.useEffect(() => cleanup1Fn);
          context.useLayoutEffect(() => cleanup2Fn);
          return new TemplateResult(new MockTemplate(), {});
        },
        {},
      );
      const value2 = new Component<{}, unknown, RenderContext>(
        (_props, context) => {
          context.useEffect(() => cleanup1Fn);
          context.useLayoutEffect(() => cleanup2Fn);
          return new TemplateResult(new MockTemplate(), {});
        },
        {},
      );
      const binding = new ComponentBinding(value1, part);

      binding.connect(context);
      context.flushUpdate();

      binding.bind(value2, context);
      context.flushUpdate();

      expect(cleanup1Fn).toHaveBeenCalledOnce();
      expect(cleanup2Fn).toHaveBeenCalledOnce();
    });
  });

  describe('.unbind()', () => {
    it('should unmount the memoized fragment', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const template = new MockTemplate();
      const data = {};
      const fragment = new MockTemplateFragment(data);
      const value = new Component(() => new TemplateResult(template, data), {});
      const binding = new ComponentBinding(value, part);

      const renderSpy = vi.spyOn(template, 'render').mockReturnValue(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const unbindSpy = vi.spyOn(fragment, 'unbind');
      const unmountSpy = vi.spyOn(fragment, 'unmount');

      binding.connect(context);
      context.flushUpdate();

      binding.unbind(context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(unbindSpy).toHaveBeenCalledOnce();
      expect(unbindSpy).toHaveBeenCalledWith(context);
      expect(unmountSpy).toHaveBeenCalledOnce();
      expect(unmountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
    });

    it('should clean hooks', () => {
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext<RenderContext>(host, updater, block);

      const cleanup1Fn = vi.fn();
      const cleanup2Fn = vi.fn();
      const directive = new Component<{}, unknown, RenderContext>(
        (_props, context) => {
          context.useEffect(() => cleanup1Fn);
          context.useLayoutEffect(() => cleanup2Fn);
          return new TemplateResult(new MockTemplate(), {});
        },
        {},
      );
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new ComponentBinding(directive, part);

      binding.connect(context);
      context.flushUpdate();

      binding.unbind(context);
      context.flushUpdate();

      expect(cleanup1Fn).toHaveBeenCalledOnce();
      expect(cleanup2Fn).toHaveBeenCalledOnce();
    });
  });

  describe('.disconnect()', () => {
    it('should disconnect the current fragment', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const template = new MockTemplate();
      const data = {};
      const fragment = new MockTemplateFragment(data);
      const value = new Component(() => new TemplateResult(template, data), {});
      const binding = new ComponentBinding(value, part);

      const renderSpy = vi.spyOn(template, 'render').mockReturnValue(fragment);
      const disconnectSpy = vi.spyOn(fragment, 'disconnect');

      binding.connect(context);
      context.flushUpdate();

      binding.disconnect();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data, context);
      expect(disconnectSpy).toHaveBeenCalledOnce();
    });

    it('should clean hooks', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext<RenderContext>(host, updater, block);

      const cleanup1Fn = vi.fn();
      const cleanup2Fn = vi.fn();
      const value = new Component<{}, unknown, RenderContext>(
        (_props, context) => {
          context.useEffect(() => cleanup1Fn);
          context.useLayoutEffect(() => cleanup2Fn);
          return new TemplateResult(new MockTemplate(), {});
        },
        {},
      );
      const binding = new ComponentBinding(value, part);

      binding.connect(context);
      context.flushUpdate();

      binding.disconnect();

      expect(cleanup1Fn).toHaveBeenCalledOnce();
      expect(cleanup2Fn).toHaveBeenCalledOnce();
    });

    it('should cancel mounting', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const template = new MockTemplate();
      const data = {};
      const fragment = new MockTemplateFragment(data);
      const value = new Component(() => new TemplateResult(template, data), {});
      const binding = new ComponentBinding(value, part);

      const renderSpy = vi
        .spyOn(template, 'render')
        .mockReturnValueOnce(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const bindSpy = vi.spyOn(fragment, 'bind');
      const mountSpy = vi.spyOn(fragment, 'mount');

      binding.connect(context);
      binding.disconnect();
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(mountSpy).not.toHaveBeenCalled();

      binding.bind(value, context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(data, context);
      expect(mountSpy).toHaveBeenCalledOnce();
      expect(mountSpy).toHaveBeenCalledWith(part);
    });
  });
});
