import { describe, expect, it } from 'vitest';

import { PartType, UpdateContext } from '../../src/baseTypes.js';
import {
  UnsafeContentTemplateView,
  UnsafeHTMLTemplate,
  UnsafeSVGTemplate,
} from '../../src/templates/unsafeContentTemplate.js';
import { SyncUpdater } from '../../src/updater/syncUpdater.js';
import { MockBlock, MockRenderHost } from '../mocks.js';

describe('UnsafeHTMLTemplate', () => {
  describe('.constructor()', () => {
    it('should constuct a new UnsafeHTMLTemplate', () => {
      const content = '<em>foo</em>bar<strong>baz</strong>';
      const template = new UnsafeHTMLTemplate(content);
      expect(template.content).toBe(content);
    });
  });

  describe('.render()', () => {
    it('should render a new tempalte view', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new UnsafeHTMLTemplate(
        '<em>foo</em>bar<strong>baz</strong>',
      );
      const view = template.render([], context);

      expect(view.startNode).toBe(view.childNodes[0]);
      expect(view.endNode).toBe(view.childNodes.at(-1));
      expect(view.childNodes.map(toHTML)).toStrictEqual([
        '<em>foo</em>',
        'bar',
        '<strong>baz</strong>',
      ]);
    });

    it('should render a new tempalte view with no child', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new UnsafeHTMLTemplate('');
      const view = template.render([], context);

      expect(view.startNode).toBe(null);
      expect(view.endNode).toBe(null);
      expect(view.childNodes.map(toHTML)).toStrictEqual([]);
    });
  });
});

describe('UnsafeSVGTemplate', () => {
  describe('.constructor()', () => {
    it('should constuct a new UnsafeHTMLTemplate', () => {
      const content =
        '<circle r="10" /><text>foo</text><rect witdh="10" height="10" />';
      const template = new UnsafeSVGTemplate(content);
      expect(template.content).toBe(content);
    });
  });

  describe('.render()', () => {
    it('should create a new UnsafeHTMLTemplateView', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new UnsafeSVGTemplate(
        '<circle r="10" /><text>foo</text><rect witdh="10" height="10" />',
      );
      const view = template.render([], context);

      expect(view.startNode).toBe(view.childNodes[0]);
      expect(view.endNode).toBe(view.childNodes.at(-1));
      expect(view.childNodes.map(toHTML)).toStrictEqual([
        '<circle r="10"></circle>',
        '<text>foo</text>',
        '<rect witdh="10" height="10"></rect>',
      ]);
    });

    it('should render a new tempalte view with no child', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const template = new UnsafeSVGTemplate('');
      const view = template.render([], context);

      expect(view.startNode).toBe(null);
      expect(view.endNode).toBe(null);
      expect(view.childNodes.map(toHTML)).toStrictEqual([]);
    });
  });
});

describe('UnsafeContentTemplateView', () => {
  describe('.bind()', () => {
    it('should do no nothing', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = new UnsafeContentTemplateView([]);

      view.connect(context);
      view.bind([], context);

      expect(context.isPending()).toBe(false);
    });
  });

  describe('.unbind()', () => {
    it('should do no nothing', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const view = new UnsafeContentTemplateView([]);

      view.connect(context);
      view.unbind(context);

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

      const view = new UnsafeContentTemplateView([]);

      view.disconnect(context);

      expect(context.isPending()).toBe(false);
    });
  });

  describe('.mount()', () => {
    it('should mount child nodes', () => {
      const context = new UpdateContext(
        new MockRenderHost(),
        new SyncUpdater(),
        new MockBlock(),
      );

      const container = document.createElement('div');
      const part = {
        type: PartType.ChildNode,
        node: document.createComment(''),
      } as const;
      const template = new UnsafeHTMLTemplate(
        '<em>foo</em>bar<strong>baz</strong>',
      );
      const view = template.render([], context);

      container.appendChild(part.node);
      view.mount(part);
      expect(container.innerHTML).toStrictEqual(template.content + '<!---->');

      view.unmount(part);
      expect(container.innerHTML).toStrictEqual('<!---->');
    });
  });
});

function toHTML(node: Node): string {
  const wrapper = document.createElement('div');
  wrapper.appendChild(node.cloneNode(true));
  return wrapper.innerHTML;
}