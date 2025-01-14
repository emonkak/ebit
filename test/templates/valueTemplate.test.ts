import { describe, expect, it, vi } from 'vitest';

import { PartType, UpdateContext } from '../../src/baseTypes.js';
import { NodeBinding } from '../../src/bindings/node.js';
import { EagerTemplateResult } from '../../src/directives/templateResult.js';
import {
  ChildTemplate,
  TextTemplate,
  ValueTemplateView,
} from '../../src/templates/valueTemplate.js';
import { SyncUpdater } from '../../src/updaters/syncUpdater.js';
import {
  MockBlock,
  MockRenderHost,
  MockTemplate,
  TextBinding,
  TextDirective,
} from '../mocks.js';

describe('ChildTemplate', () => {
  describe('.render()', () => {
    it('should create a new ValueTemplateView', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const values = [new TextDirective('foo')] as const;
      const view = new ChildTemplate().render(values, context);

      context.flushUpdate();

      expect(view.binding).toBeInstanceOf(TextBinding);
      expect(view.binding.value).toBe(values[0]);
      expect(view.binding.part).toMatchObject({
        type: PartType.ChildNode,
        node: expect.any(Comment),
      });
      expect(view.binding.part.node.nodeValue).toBe('TextDirective');
      expect(view.startNode).toBe(view.binding.startNode);
      expect(view.endNode).toBe(view.binding.endNode);
    });
  });

  describe('.isSameTemplate()', () => {
    it('should return true if the instance is the same as this one', () => {
      const template = new ChildTemplate();

      expect(template.isSameTemplate(template)).toBe(true);
      expect(template.isSameTemplate(new MockTemplate())).toBe(false);
    });
  });

  describe('.wrapInResult()', () => {
    it('should wrap this template in EagerTemplateResult', () => {
      const template = new ChildTemplate();
      const values = [new TextDirective('foo')] as const;
      const result = template.wrapInResult(values);

      expect(result).toBeInstanceOf(EagerTemplateResult);
      expect(result.template).toBe(template);
      expect(result.values).toBe(values);
    });
  });
});

describe('TextTemplate', () => {
  describe('.render()', () => {
    it('should return ValueTemplateView', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new TextTemplate();
      const values = ['foo'] as const;
      const view = template.render(values, context);

      expect(view).toBeInstanceOf(ValueTemplateView);
      expect(view.binding).toBeInstanceOf(NodeBinding);
      expect(view.binding.value).toBe(values[0]);
      expect(view.binding.part).toMatchObject({
        type: PartType.Node,
        node: expect.any(Text),
      });
      expect(view.startNode).toBe(view.binding.startNode);
      expect(view.endNode).toBe(view.binding.endNode);
    });
  });

  describe('.isSameTemplate()', () => {
    it('should return true if the instance is the same as this one', () => {
      const template = new TextTemplate();
      expect(template.isSameTemplate(template)).toBe(true);
      expect(template.isSameTemplate(new MockTemplate())).toBe(false);
    });
  });

  describe('.wrapInResult()', () => {
    it('should wrap this template in EagerTemplateResult', () => {
      const template = new TextTemplate();
      const values = ['foo'] as const;
      const result = template.wrapInResult(values);

      expect(result).toBeInstanceOf(EagerTemplateResult);
      expect(result.template).toBe(template);
      expect(result.values).toBe(values);
    });
  });
});

describe('ValueTemplateView', () => {
  describe('.connect()', () => {
    it('should connect the binding', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = 'foo';
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const binding = new NodeBinding(value, part);
      const view = new ValueTemplateView(binding);

      const connectSpy = vi.spyOn(binding, 'connect');

      view.connect(context);
      context.flushUpdate();

      expect(connectSpy).toHaveBeenCalledOnce();
      expect(connectSpy).toHaveBeenCalledWith(context);
    });
  });

  describe('.bind()', () => {
    it('should bind a new string to NodeBinding', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const values1 = ['foo'] as [string];
      const values2 = ['bar'] as [string];
      const part = {
        type: PartType.Node,
        node: document.createTextNode(''),
      } as const;
      const binding = new NodeBinding(values1[0], part);
      const view = new ValueTemplateView(binding);

      const bindSpy = vi.spyOn(binding, 'bind');

      view.bind(values2, context);

      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(values2[0], context);
    });

    it('should bind a new TextDirective to TextBinding', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const values1 = [new TextDirective('foo')] as const;
      const values2 = [new TextDirective('bar')] as const;
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TextBinding(values1[0], part);
      const view = new ValueTemplateView(binding);

      const bindSpy = vi.spyOn(binding, 'bind');

      view.bind(values2, context);

      expect(bindSpy).toHaveBeenCalledOnce();
      expect(bindSpy).toHaveBeenCalledWith(values2[0], context);
    });
  });

  describe('.unbind()', () => {
    it('should unbind a value from the binding', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new TextDirective('foo');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TextBinding(value, part);
      const view = new ValueTemplateView(binding);

      const unbindSpy = vi.spyOn(binding, 'unbind');

      view.unbind(context);

      expect(unbindSpy).toHaveBeenCalledOnce();
      expect(unbindSpy).toHaveBeenCalledWith(context);
    });
  });

  describe('.disconnect()', () => {
    it('should disconnect the binding', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const value = new TextDirective('foo');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TextBinding(value, part);
      const view = new ValueTemplateView(binding);

      const disconnectSpy = vi.spyOn(view.binding, 'disconnect');

      view.disconnect(context);

      expect(disconnectSpy).toHaveBeenCalledOnce();
      expect(disconnectSpy).toHaveBeenCalledWith(context);
    });
  });

  describe('.mount()', () => {
    it('should mount the node before the part node', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const container = document.createElement('div');
      const containerPart = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const value = new TextDirective('foo');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const binding = new TextBinding(value, part);
      const view = new ValueTemplateView(binding);

      container.appendChild(containerPart.node);
      view.mount(containerPart);
      view.connect(context);
      context.flushUpdate();

      expect(container.innerHTML).toBe('foo<!----><!---->');

      view.unbind(context);
      context.flushUpdate();
      view.unmount(containerPart);

      expect(container.innerHTML).toBe('<!---->');
    });
  });
});
