import { describe, expect, it, vi } from 'vitest';

import { PartType, UpdateContext } from '../../src/baseTypes.js';
import { ElementBinding } from '../../src/binding.js';
import { ElementTemplate } from '../../src/templates/elementTemplate.js';
import { SyncUpdater } from '../../src/updater/syncUpdater.js';
import {
  MockBlock,
  MockUpdateHost,
  TextBinding,
  TextDirective,
} from '../mocks.js';

describe('ElementTemplate', () => {
  describe('.render()', () => {
    it('should return ElementTemplateView initialized with NodeBinding', () => {
      const context = new UpdateContext(
        new MockUpdateHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const elementValue = { class: 'foo' };
      const childNodeValue = new TextDirective('bar');
      const view = new ElementTemplate('div').render(
        {
          elementValue,
          childNodeValue,
        },
        context,
      );

      expect(context.isPending()).toBe(false);
      expect(view.elementBinding).toBeInstanceOf(ElementBinding);
      expect(view.elementBinding.value).toBe(elementValue);
      expect(view.elementBinding.part).toMatchObject({
        type: PartType.Element,
        node: expect.any(Element),
      });
      expect(view.elementBinding.part.node.nodeName).toBe('DIV');
      expect(view.childNodeBinding).toBeInstanceOf(TextBinding);
      expect(view.childNodeBinding.value).toBe(childNodeValue);
      expect(view.childNodeBinding.part).toMatchObject({
        type: PartType.ChildNode,
        node: expect.any(Comment),
      });
      expect(view.startNode).toBe(view.elementBinding.startNode);
      expect(view.endNode).toBe(view.elementBinding.endNode);
    });
  });

  describe('.isSameTemplate()', () => {
    it('should return true if an instance is the same', () => {
      const template = new ElementTemplate('div');
      expect(template.isSameTemplate(template)).toBe(true);
    });

    it('should return true if a type is the same', () => {
      expect(
        new ElementTemplate('div').isSameTemplate(new ElementTemplate('div')),
      ).toBe(true);
    });

    it('should return false if a type is not the same', () => {
      expect(
        new ElementTemplate('div').isSameTemplate(new ElementTemplate('p')),
      ).toBe(false);
    });
  });
});

describe('ElementTemplateView', () => {
  describe('.connect()', () => {
    it('should connect the element and child bindings', () => {
      const context = new UpdateContext(
        new MockUpdateHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = new ElementTemplate('div').render(
        { elementValue: { class: 'foo' }, childNodeValue: 'bar' },
        context,
      );

      view.connect(context);
      context.flushUpdate();

      expect((view.elementBinding.part.node as Element).outerHTML).toBe(
        '<div class="foo"><!--bar--></div>',
      );

      view.bind(
        { elementValue: { class: 'bar' }, childNodeValue: 'baz' },
        context,
      );
      context.flushUpdate();

      expect((view.elementBinding.part.node as Element).outerHTML).toBe(
        '<div class="bar"><!--baz--></div>',
      );

      view.unbind(context);
      context.flushUpdate();

      expect((view.elementBinding.part.node as Element).outerHTML).toBe(
        '<div><!----></div>',
      );
    });
  });

  describe('.mount()', () => {
    it('should mount the element before the part node', () => {
      const context = new UpdateContext(
        new MockUpdateHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const view = new ElementTemplate('div').render(
        {
          elementValue: { class: 'foo' },
          childNodeValue: new TextDirective('bar'),
        },
        context,
      );

      container.appendChild(part.node);
      view.connect(context);
      context.flushUpdate();

      expect(container.innerHTML).toBe('<!---->');

      view.mount(part);

      expect(container.innerHTML).toBe(
        '<div class="foo">bar<!--TextDirective--></div><!---->',
      );

      view.unmount(part);

      expect(container.innerHTML).toBe('<!---->');
    });
  });

  describe('.unmount()', () => {
    it('should not remove the node if a different part is given', () => {
      const context = new UpdateContext(
        new MockUpdateHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const view = new ElementTemplate('div').render(
        {
          elementValue: { class: 'foo' },
          childNodeValue: new TextDirective('bar'),
        },
        context,
      );

      container.appendChild(part.node);
      view.connect(context);
      context.flushUpdate();

      expect(container.innerHTML).toBe('<!---->');

      view.mount(part);

      expect(container.innerHTML).toBe(
        '<div class="foo">bar<!--TextDirective--></div><!---->',
      );

      view.unmount({
        type: PartType.ChildNode,
        node: document.createComment(''),
      });

      expect(container.innerHTML).toBe(
        '<div class="foo">bar<!--TextDirective--></div><!---->',
      );
    });
  });

  describe('.disconnect()', () => {
    it('should disconnect the element and child bindings', () => {
      const context = new UpdateContext(
        new MockUpdateHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = new ElementTemplate('div').render(
        { elementValue: { class: 'foo' }, childNodeValue: 'bar' },
        context,
      );

      const elementBindingDisconnectSpy = vi.spyOn(
        view.elementBinding,
        'disconnect',
      );
      const childNodeBindingDisconnectSpy = vi.spyOn(
        view.childNodeBinding,
        'disconnect',
      );

      view.disconnect(context);

      expect(elementBindingDisconnectSpy).toHaveBeenCalledOnce();
      expect(childNodeBindingDisconnectSpy).toHaveBeenCalledOnce();
    });
  });
});
