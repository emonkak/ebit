import { describe, expect, it } from 'vitest';

import { PartType, UpdateContext } from '../../src/baseTypes.js';
import {
  EmptyTemplate,
  EmptyTemplateView,
} from '../../src/templates/emptyTemplate.js';
import { SyncUpdater } from '../../src/updaters/syncUpdater.js';
import { MockBlock, MockRenderHost, MockTemplate } from '../mocks.js';

describe('EmptyTemplate', () => {
  describe('.constructor()', () => {
    it('should throw an error from being called directly', () => {
      expect(() => new (EmptyTemplate as any)()).toThrow(
        'EmptyTemplate constructor cannot be called directly.',
      );
    });
  });

  describe('.render()', () => {
    it('should create a new EmptyTemplateView', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = EmptyTemplate.instance.render([], context);

      expect(view).toBeInstanceOf(EmptyTemplateView);
      expect(view.startNode).toBe(null);
      expect(view.endNode).toBe(null);
    });
  });

  describe('.isSameTemplate()', () => {
    it('should return true if the instance is the same as this one', () => {
      const template = EmptyTemplate.instance;

      expect(template.isSameTemplate(template)).toBe(true);
      expect(template.isSameTemplate(new MockTemplate())).toBe(false);
    });
  });

  describe('.wrapInResult()', () => {
    it('should wrap this template in EagerTemplateResult', () => {
      const template = EmptyTemplate.instance;
      const values = [] as const;
      const result = template.wrapInResult(values);

      expect(result.template).toBe(template);
      expect(result.values).toBe(values);
    });
  });
});

describe('EmptyTemplateView', () => {
  describe('.connect()', () => {
    it('should do nothing', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = new EmptyTemplateView();

      view.connect(context);

      expect(context.isPending()).toBe(false);
    });
  });

  describe('.bind()', () => {
    it('should do nothing', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = new EmptyTemplateView();

      view.bind([], context);

      expect(context.isPending()).toBe(false);
    });
  });

  describe('.disconnect()', () => {
    it('should do nothing', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = new EmptyTemplateView();

      view.disconnect(context);

      expect(context.isPending()).toBe(false);
    });
  });

  describe('.unbind()', () => {
    it('should do nothing', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = new EmptyTemplateView();

      view.unbind(context);

      expect(context.isPending()).toBe(false);
    });
  });

  describe('.mount()', () => {
    it('should do nothing', () => {
      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const view = new EmptyTemplateView();

      container.appendChild(part.node);
      expect(container.innerHTML).toBe('<!---->');

      view.mount(part);
      expect(container.innerHTML).toBe('<!---->');

      view.unmount(part);
      expect(container.innerHTML).toBe('<!---->');
    });
  });
});
