import { describe, expect, it, vi } from 'vitest';
import {
  PartType,
  UpdateContext,
  directiveTag,
  nameTag,
} from '../../src/baseTypes.js';
import {
  EagerTemplate,
  LazyTemplate,
  TemplateBinding,
  eagerTemplate,
  lazyTemplate,
} from '../../src/directives/template.js';
import { SyncUpdater } from '../../src/updater/syncUpdater.js';
import {
  MockBlock,
  MockRenderHost,
  MockTemplate,
  MockTemplateView,
} from '../mocks.js';

describe('eagerTemplate()', () => {
  it('should construct a new EagerTemplate with template and data', () => {
    const template = new MockTemplate();
    const data = ['foo'];
    const value = eagerTemplate(template, ...data);

    expect(value.template).toBe(template);
    expect(value.data).toStrictEqual(data);
  });
});

describe('lazyTemplate()', () => {
  it('should construct a new LazyTemplate with template and data', () => {
    const template = new MockTemplate();
    const data = ['foo'];
    const value = lazyTemplate(template, ...data);

    expect(value.template).toBe(template);
    expect(value.data).toStrictEqual(data);
  });
});

describe('EagerTemplate', () => {
  describe('[nameTag]', () => {
    it('should return a string represented itself', () => {
      const value = new EagerTemplate(new MockTemplate(), []);

      expect(value[nameTag]).toBe('EagerTemplate(MockTemplate)');
    });
  });

  describe('[directiveTag]()', () => {
    it('should create a new TemplateBinding directive', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new EagerTemplate(new MockTemplate(), []);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = value[directiveTag](part, context);

      expect(binding.value).toBe(value);
      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
    });

    it('should throw an error if the part is not a ChildNodePart', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new EagerTemplate(new MockTemplate(), []);
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;

      expect(() => value[directiveTag](part, context)).toThrow(
        'Template directive must be used in a child node,',
      );
    });
  });
});

describe('LazyTemplate', () => {
  describe('[nameTag]', () => {
    it('should return a string represented itself', () => {
      const value = new LazyTemplate(new MockTemplate(), []);

      expect(value[nameTag]).toBe('LazyTemplate(MockTemplate)');
    });
  });

  describe('[directiveTag]()', () => {
    it('should create a new TemplateBinding directive', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new LazyTemplate(new MockTemplate(), []);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = value[directiveTag](part, context);

      expect(binding.value).toBe(value);
      expect(binding.part).toBe(part);
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
      expect(binding.binding).toBeInstanceOf(TemplateBinding);
    });

    it('should throw an error if the part is not a ChildNodePart', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const value = new LazyTemplate(new MockTemplate(), []);

      expect(() => value[directiveTag](part, context)).toThrow(
        'LazyTemplate directive must be used in a child node,',
      );
    });
  });
});

describe('TemplateBinding', () => {
  describe('.connect()', () => {
    it('should not render the template if it is already rendered', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new EagerTemplate(new MockTemplate(), []);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const view = new MockTemplateView(value.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const bindSpy = vi.spyOn(view, 'bind');
      const mountSpy = vi.spyOn(view, 'mount');

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
      expect(binding.startNode).toBe(view.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should remount the view if it is unmounted', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new EagerTemplate(new MockTemplate(), []);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const view = new MockTemplateView(value.data, [
        document.createComment(''),
      ]);
      const binding = new TemplateBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const bindSpy = vi.spyOn(view, 'bind');
      const unbindSpy = vi.spyOn(view, 'unbind');
      const mountSpy = vi.spyOn(view, 'mount');
      const unmountSpy = vi.spyOn(view, 'unmount');

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
      expect(binding.startNode).toBe(view.startNode);
      expect(binding.endNode).toBe(part.node);
    });
  });

  describe('.bind()', () => {
    it('should bind data to the current view if it is a renderd from the same template', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate();
      const value1 = new EagerTemplate(template, {});
      const value2 = new EagerTemplate(template, {});
      const view = new MockTemplateView(value1.data, [
        document.createComment(''),
      ]);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value1, part);

      const renderSpy = vi
        .spyOn(value1.template, 'render')
        .mockReturnValueOnce(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const bindSpy = vi.spyOn(view, 'bind');
      const mountSpy = vi.spyOn(view, 'mount');

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
      expect(binding.startNode).toBe(view.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should unbind data from the current view if it is a renderd from a different template', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value1 = new EagerTemplate(new MockTemplate(), []);
      const value2 = new EagerTemplate(new MockTemplate(), []);
      const view1 = new MockTemplateView(value1.data, [
        document.createComment(''),
      ]);
      const view2 = new MockTemplateView(value2.data, [
        document.createComment(''),
      ]);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value1, part);

      const render1Spy = vi
        .spyOn(value1.template, 'render')
        .mockReturnValue(view1);
      const render2Spy = vi
        .spyOn(value2.template, 'render')
        .mockReturnValue(view2);
      const connect1Spy = vi.spyOn(view1, 'connect');
      const connect2Spy = vi.spyOn(view2, 'connect');
      const unbind1Spy = vi.spyOn(view1, 'unbind');
      const unbind2Spy = vi.spyOn(view2, 'unbind');
      const mount1Spy = vi.spyOn(view1, 'mount');
      const mount2Spy = vi.spyOn(view2, 'mount');
      const unmount1Spy = vi.spyOn(view1, 'unmount');
      const unmount2Spy = vi.spyOn(view2, 'unmount');

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
      expect(binding.startNode).toBe(view2.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should render the template when it is called without calling connect()', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value1 = new EagerTemplate(new MockTemplate(), []);
      const value2 = new EagerTemplate(new MockTemplate(), []);
      const view = new MockTemplateView(value1.data, [
        document.createComment(''),
      ]);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value1, part);

      const renderSpy = vi
        .spyOn(value2.template, 'render')
        .mockReturnValueOnce(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const bindSpy = vi.spyOn(view, 'bind');
      const mountSpy = vi.spyOn(view, 'mount');

      binding.bind(value2, context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(value2.data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).not.toHaveBeenCalled();
      expect(mountSpy).toHaveBeenCalledOnce();
      expect(mountSpy).toHaveBeenCalledWith(part);
      expect(binding.startNode).toBe(view.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should only mount the last rendered view if there is multiple renderings durling a transation', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value1 = new EagerTemplate(new MockTemplate(), []);
      const value2 = new EagerTemplate(new MockTemplate(), []);
      const view1 = new MockTemplateView(value1.data, [
        document.createComment(''),
      ]);
      const view2 = new MockTemplateView(value2.data, [
        document.createComment(''),
      ]);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value1, part);

      const render1Spy = vi
        .spyOn(value1.template, 'render')
        .mockReturnValue(view1);
      const render2Spy = vi
        .spyOn(value2.template, 'render')
        .mockReturnValue(view2);
      const connect1Spy = vi.spyOn(view1, 'connect');
      const connect2Spy = vi.spyOn(view2, 'connect');
      const unbind1Spy = vi.spyOn(view1, 'unbind');
      const unbind2Spy = vi.spyOn(view2, 'unbind');
      const mount1Spy = vi.spyOn(view1, 'mount');
      const mount2Spy = vi.spyOn(view2, 'mount');
      const unmount1Spy = vi.spyOn(view1, 'unmount');
      const unmount2Spy = vi.spyOn(view2, 'unmount');

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
      expect(binding.startNode).toBe(view2.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should remount the view if it is unmounted', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new EagerTemplate(new MockTemplate(), []);
      const view = new MockTemplateView(value.data, [
        document.createComment(''),
      ]);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const bindSpy = vi.spyOn(view, 'bind');
      const unbindSpy = vi.spyOn(view, 'unbind');
      const mountSpy = vi.spyOn(view, 'mount');
      const unmountSpy = vi.spyOn(view, 'unmount');

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
      expect(binding.startNode).toBe(view.startNode);
      expect(binding.endNode).toBe(part.node);
    });

    it('should throw an error if the new value is not Template', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new EagerTemplate(new MockTemplate(), []);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value, part);

      expect(() => {
        binding.bind(null as any, context);
      }).toThrow(
        'A value must be a instance of EagerTemplate or LazyTemplate directive, but got "null".',
      );
    });
  });

  describe('.unbind()', () => {
    it('should unbind data from the current view', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new LazyTemplate(new MockTemplate(), []);
      const view = new MockTemplateView(value.data, [
        document.createComment(''),
      ]);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const unbindSpy = vi.spyOn(view, 'unbind');
      const unmountSpy = vi.spyOn(view, 'unmount');

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

    it('should not unmount the memoized view if it do not exist', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new LazyTemplate(new MockTemplate(), []);
      const view = new MockTemplateView(value.data, [
        document.createComment(''),
      ]);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const unbindSpy = vi.spyOn(view, 'unbind');
      const unmountSpy = vi.spyOn(view, 'unmount');

      binding.unbind(context);
      context.flushUpdate();

      expect(renderSpy).not.toHaveBeenCalled();
      expect(connectSpy).not.toHaveBeenCalled();
      expect(unbindSpy).not.toHaveBeenCalled();
      expect(unmountSpy).not.toHaveBeenCalled();
      expect(binding.startNode).toBe(part.node);
      expect(binding.endNode).toBe(part.node);
    });
  });

  describe('.disconnect()', () => {
    it('should disconnect the current view', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new LazyTemplate(new MockTemplate(), []);
      const view = new MockTemplateView(value.data);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value, part);

      const renderSpy = vi
        .spyOn(value.template, 'render')
        .mockReturnValue(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const disconnectSpy = vi.spyOn(view, 'disconnect');

      binding.connect(context);
      context.flushUpdate();
      binding.disconnect(context);

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(value.data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(disconnectSpy).toHaveBeenCalledOnce();
      expect(disconnectSpy).toHaveBeenCalledWith(context);
    });

    it('should cancel mounting', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new MockTemplate();
      const data = {};
      const value = new LazyTemplate(template, data);
      const view = new MockTemplateView(value.data);
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TemplateBinding(value, part);

      const renderSpy = vi.spyOn(template, 'render').mockReturnValue(view);
      const connectSpy = vi.spyOn(view, 'connect');
      const disconnectSpy = vi.spyOn(view, 'disconnect');
      const bindSpy = vi.spyOn(view, 'bind');
      const mountSpy = vi.spyOn(view, 'mount');

      binding.connect(context);
      binding.disconnect(context);
      context.flushUpdate();

      binding.bind(value, context);
      context.flushUpdate();

      expect(renderSpy).toHaveBeenCalledOnce();
      expect(renderSpy).toHaveBeenCalledWith(data, context);
      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(data, context);
      expect(disconnectSpy).toHaveBeenCalledOnce();
      expect(disconnectSpy).toHaveBeenCalledWith(context);
      expect(mountSpy).toHaveBeenCalledOnce();
      expect(mountSpy).toHaveBeenCalledWith(part);
    });
  });
});
