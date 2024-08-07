import { describe, expect, it, vi } from 'vitest';
import {
  PartType,
  UpdateContext,
  directiveTag,
  nameTag,
} from '../../src/baseTypes.js';
import {
  LazyTemplateResult,
  TemplateResult,
  TemplateResultBinding,
} from '../../src/directives/templateResult.js';
import { SyncUpdater } from '../../src/updater/syncUpdater.js';
import {
  MockBlock,
  MockTemplate,
  MockTemplateFragment,
  MockUpdateHost,
} from '../mocks.js';

describe('TemplateResult', () => {
  describe('[nameTag]', () => {
    it('should return a string represented itself', () => {
      const value = new TemplateResult(new MockTemplate(), {});

      expect(value[nameTag]).toBe('TemplateResult(MockTemplate)');
    });
  });

  describe('[directiveTag]()', () => {
    it('should return a new TemplateBinding directive', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const value = new TemplateResult(new MockTemplate(), {});
      const binding = value[directiveTag](part, context);

      expect(binding.value).toBe(value);
      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
    });

    it('should throw an error if the part is not a ChildNodePart', () => {
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new TemplateResult(new MockTemplate(), {});

      expect(() => value[directiveTag](part, context)).toThrow(
        'TemplateResult directive must be used in a child node,',
      );
    });
  });
});

describe('LazyTemplateResult', () => {
  describe('[nameTag]', () => {
    it('should return a string represented itself', () => {
      const value = new LazyTemplateResult(new MockTemplate(), {});

      expect(value[nameTag]).toBe('LazyTemplateResult(MockTemplate)');
    });
  });

  describe('[directiveTag]()', () => {
    it('should return a new TemplateBinding directive', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const block = new MockBlock();
      const context = new UpdateContext(host, updater, block);

      const value = new LazyTemplateResult(new MockTemplate(), {});
      const binding = value[directiveTag](part, context);

      expect(binding.value).toBe(value);
      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
      expect(binding.binding).toBeInstanceOf(TemplateResultBinding);
    });

    it('should throw an error if the part is not a ChildNodePart', () => {
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new LazyTemplateResult(new MockTemplate(), {});

      expect(() => value[directiveTag](part, context)).toThrow(
        'LazyTemplateResult directive must be used in a child node,',
      );
    });
  });
});

describe('TemplateResultBinding', () => {
  describe('.connect()', () => {
    it('should not render the template if it is already rendered', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new TemplateResult(new MockTemplate(), {});
      const fragment = new MockTemplateFragment(value.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateResultBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const bindSpy = vi.spyOn(fragment, 'bind');
      const mountSpy = vi.spyOn(fragment, 'mount');

      binding.connect(context);
      context.flushUpdate();

      binding.connect(context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(value.data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(value.data, context);
      expect(mountSpy).toHaveBeenCalledOnce();
      expect(mountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(fragment.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should remount the fragment if it is unmounted', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new TemplateResult(new MockTemplate(), {});
      const fragment = new MockTemplateFragment(value.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateResultBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(fragment);
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
      expect(renderSpy).toHaveBeenCalledWith(value.data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(value.data, context);
      expect(unbindSpy).toHaveBeenCalledOnce();
      expect(unbindSpy).toHaveBeenCalledWith(context);
      expect(mountSpy).toHaveBeenCalledTimes(2);
      expect(mountSpy).toHaveBeenNthCalledWith(1, part);
      expect(mountSpy).toHaveBeenNthCalledWith(2, part);
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
      const context = new UpdateContext(host, updater, new MockBlock());

      const template = new MockTemplate();
      const value1 = new TemplateResult(template, {});
      const value2 = new TemplateResult(template, {});
      const fragment = new MockTemplateFragment(value1.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateResultBinding(value1, part);

      const renderSpy = vi
        .spyOn(value1.template, 'render')
        .mockReturnValueOnce(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const bindSpy = vi.spyOn(fragment, 'bind');
      const mountSpy = vi.spyOn(fragment, 'mount');

      binding.connect(context);
      context.flushUpdate();

      binding.bind(value2, context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(value1.data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(value2.data, context);
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
      const context = new UpdateContext(host, updater, new MockBlock());

      const value1 = new TemplateResult(new MockTemplate(), {});
      const value2 = new TemplateResult(new MockTemplate(), {});
      const fragment1 = new MockTemplateFragment(value1.data, [
        document.createComment(''),
      ]);
      const fragment2 = new MockTemplateFragment(value2.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateResultBinding(value1, part);

      const render1Spy = vi
        .spyOn(value1.template, 'render')
        .mockReturnValue(fragment1);
      const render2Spy = vi
        .spyOn(value2.template, 'render')
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

      expect(render1Spy).toHaveBeenCalledOnce();
      expect(render1Spy).toHaveBeenCalledWith(value1.data, context);
      expect(render2Spy).toHaveBeenCalledOnce();
      expect(render2Spy).toHaveBeenCalledWith(value2.data, context);
      expect(connect1Spy).toHaveBeenCalledOnce();
      expect(connect1Spy).toHaveBeenCalledWith(context);
      expect(connect2Spy).toHaveBeenCalled();
      expect(connect2Spy).toHaveBeenCalledWith(context);
      expect(unbind1Spy).toHaveBeenCalledOnce();
      expect(unbind1Spy).toHaveBeenCalledWith(context);
      expect(unbind2Spy).not.toHaveBeenCalled();
      expect(mount1Spy).toHaveBeenCalledOnce();
      expect(mount1Spy).toHaveBeenCalledWith(part);
      expect(mount2Spy).toHaveBeenCalledOnce();
      expect(mount2Spy).toHaveBeenCalledWith(part);
      expect(unmount1Spy).toHaveBeenCalledOnce();
      expect(unmount1Spy).toHaveBeenCalledWith(part);
      expect(unmount2Spy).not.toHaveBeenCalled();
      expect(binding.startNode).toBe(fragment2.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should render the template when it is called without calling connect()', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value1 = new TemplateResult(new MockTemplate(), {});
      const value2 = new TemplateResult(new MockTemplate(), {});
      const fragment = new MockTemplateFragment(value1.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateResultBinding(value1, part);

      const renderSpy = vi
        .spyOn(value2.template, 'render')
        .mockReturnValueOnce(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const bindSpy = vi.spyOn(fragment, 'bind');
      const mountSpy = vi.spyOn(fragment, 'mount');

      binding.bind(value2, context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(value2.data, context);
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
      const context = new UpdateContext(host, updater, new MockBlock());

      const value1 = new TemplateResult(new MockTemplate(), {});
      const value2 = new TemplateResult(new MockTemplate(), {});
      const fragment1 = new MockTemplateFragment(value1.data, [
        document.createComment(''),
      ]);
      const fragment2 = new MockTemplateFragment(value2.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateResultBinding(value1, part);

      const render1Spy = vi
        .spyOn(value1.template, 'render')
        .mockReturnValue(fragment1);
      const render2Spy = vi
        .spyOn(value2.template, 'render')
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
      binding.bind(value2, context);
      context.flushUpdate();

      expect(render1Spy).toHaveBeenCalledOnce();
      expect(render1Spy).toHaveBeenCalledWith(value1.data, context);
      expect(render2Spy).toHaveBeenCalledOnce();
      expect(render2Spy).toHaveBeenCalledWith(value2.data, context);
      expect(connect1Spy).toHaveBeenCalledOnce();
      expect(connect1Spy).toHaveBeenCalledWith(context);
      expect(connect2Spy).toHaveBeenCalled();
      expect(connect2Spy).toHaveBeenCalledWith(context);
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
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new TemplateResult(new MockTemplate(), {});
      const fragment = new MockTemplateFragment(value.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateResultBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(fragment);
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
      expect(renderSpy).toHaveBeenCalledWith(value.data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(value.data, context);
      expect(unbindSpy).toHaveBeenCalledOnce();
      expect(unbindSpy).toHaveBeenCalledWith(context);
      expect(mountSpy).toHaveBeenCalledTimes(2);
      expect(mountSpy).toHaveBeenNthCalledWith(1, part);
      expect(mountSpy).toHaveBeenNthCalledWith(2, part);
      expect(unmountSpy).toHaveBeenCalledOnce();
      expect(unmountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(fragment.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should throw an error if the new value is not AbstractTemplateResult', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new TemplateResult(new MockTemplate(), {});
      const binding = new TemplateResultBinding(value, part);

      expect(() => {
        binding.bind(null as any, context);
      }).toThrow(
        'A value must be a instance of AbstractTemplateResult directive, but got "null".',
      );
    });
  });

  describe('.unbind()', () => {
    it('should unbind data from the current fragment', () => {
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new LazyTemplateResult(new MockTemplate(), {});
      const fragment = new MockTemplateFragment(value.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateResultBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const unbindSpy = vi.spyOn(fragment, 'unbind');
      const unmountSpy = vi.spyOn(fragment, 'unmount');

      binding.connect(context);
      context.flushUpdate();

      binding.unbind(context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(value.data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(unbindSpy).toHaveBeenCalledOnce();
      expect(unbindSpy).toHaveBeenCalledWith(context);
      expect(unmountSpy).toHaveBeenCalledOnce();
      expect(unmountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
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
      const context = new UpdateContext(host, updater, new MockBlock());

      const value = new LazyTemplateResult(new MockTemplate(), {});
      const fragment = new MockTemplateFragment(value.data);
      const binding = new TemplateResultBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(fragment);
      const connectSpy = vi.spyOn(fragment, 'connect');
      const disconnectSpy = vi.spyOn(fragment, 'disconnect');

      binding.connect(context);
      context.flushUpdate();
      binding.disconnect();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(value.data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(disconnectSpy).toHaveBeenCalledOnce();
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
      const value = new LazyTemplateResult(template, data);
      const fragment = new MockTemplateFragment(value.data);
      const binding = new TemplateResultBinding(value, part);

      const renderSpy = vi.spyOn(template, 'render').mockReturnValue(fragment);
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
