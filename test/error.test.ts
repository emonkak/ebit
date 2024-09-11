import { describe, expect, it } from 'vitest';

import {
  type Binding,
  type Directive,
  PartType,
  directiveTag,
} from '../src/baseTypes.js';
import {
  ensureDirective,
  ensureNonDirective,
  reportPart,
} from '../src/error.js';
import { TextDirective } from './mocks.js';

describe('ensureDirective', () => {
  it('should throw an error if the value is not instance of the expected class', () => {
    const part = {
      type: PartType.ChildNode,
      node: document.createComment(''),
    } as const;

    expect(() => ensureDirective([TextDirective], null, part)).toThrow(
      'A value must be a instance of TextDirective directive, but got "null".',
    );
    expect(() => ensureDirective([Foo, Bar, Baz], null, part)).toThrow(
      'A value must be a instance of Foo, Bar, or Baz directive, but got "null".',
    );
  });

  it('should do nothing if the value is instance of the expected class', () => {
    const part = {
      type: PartType.ChildNode,
      node: document.createComment(''),
    } as const;

    ensureDirective([TextDirective], new TextDirective(), part);
  });
});

describe('ensureNonDirective', () => {
  it('should throw an error if the value is any directive', () => {
    const part = {
      type: PartType.ChildNode,
      node: document.createComment(''),
    } as const;

    expect(() => ensureNonDirective(new TextDirective(), part)).toThrow(
      'A value must not be a directive, but got "TextDirective".',
    );
  });

  it('should do nothing if the value is instance of the expected class', () => {
    const part = {
      type: PartType.ChildNode,
      node: document.createComment(''),
    } as const;

    ensureNonDirective(null, part);
    ensureNonDirective(undefined, part);
    ensureNonDirective('foo', part);
    ensureNonDirective(123, part);
    ensureNonDirective(true, part);
    ensureNonDirective({}, part);
    ensureNonDirective(() => {}, part);
  });
});

describe('reportPart()', () => {
  it('should report where an AttributePart is inserted', () => {
    const part = {
      type: PartType.Attribute,
      name: 'class',
      node: document.createElement('input'),
    } as const;
    const value = 'my value';

    expect(reportPart(part, value)).toBe(
      `<input class=[["my value" IS USED IN HERE!]]>`,
    );

    const container = document.createElement('div');
    container.appendChild(document.createTextNode('foo'));
    container.appendChild(part.node);
    container.appendChild(document.createComment('bar'));
    container.appendChild(document.createElement('span'));

    expect(reportPart(part, value)).toBe(
      `<div>foo<input class=[["my value" IS USED IN HERE!]]><!--bar--><span></span></div>`,
    );
  });

  it('should report where a ChildNodePart is inserted', () => {
    const part = {
      type: PartType.ChildNode,
      name: 'click',
      node: document.createComment(''),
    } as const;
    const value = 'my value';

    expect(reportPart(part, value)).toBe(
      `[["my value" IS USED IN HERE!]]<!---->`,
    );

    const container = document.createElement('div');
    container.appendChild(document.createTextNode('foo'));
    container.appendChild(part.node);
    container.appendChild(document.createComment('bar'));
    container.appendChild(document.createElement('span'));

    expect(reportPart(part, value)).toBe(
      `<div>foo[["my value" IS USED IN HERE!]]<!----><!--bar--><span></span></div>`,
    );
  });

  it('should report where an ElementPart is inserted', () => {
    const part = {
      type: PartType.Element,
      node: document.createElement('div'),
    } as const;
    const value = 'my value';

    expect(reportPart(part, value)).toBe(
      `<div [["my value" IS USED IN HERE!]]></div>`,
    );

    const container = document.createElement('div');
    container.appendChild(document.createTextNode('foo'));
    container.appendChild(part.node);
    container.appendChild(document.createComment('bar'));
    container.appendChild(document.createElement('span'));

    expect(reportPart(part, value)).toBe(
      `<div>foo<div [["my value" IS USED IN HERE!]]></div><!--bar--><span></span></div>`,
    );
  });

  it('should report where an EventPart is inserted', () => {
    const part = {
      type: PartType.Event,
      name: 'click',
      node: document.createElement('button'),
    } as const;
    const value = 'my value';

    expect(reportPart(part, value)).toBe(
      `<button @click=[["my value" IS USED IN HERE!]]></button>`,
    );

    const container = document.createElement('div');
    container.appendChild(document.createTextNode('foo'));
    container.appendChild(part.node);
    container.appendChild(document.createComment('bar'));
    container.appendChild(document.createElement('span'));

    expect(reportPart(part, value)).toBe(
      `<div>foo<button @click=[["my value" IS USED IN HERE!]]></button><!--bar--><span></span></div>`,
    );
  });

  it('should report where a NodePart is inserted', () => {
    const part = {
      type: PartType.Node,
      name: 'click',
      node: document.createTextNode('foo'),
    } as const;
    const value = 'my value';

    expect(reportPart(part, value)).toBe(`[["my value" IS USED IN HERE!]]`);

    const container = document.createElement('div');
    container.appendChild(document.createTextNode('foo'));
    container.appendChild(part.node);
    container.appendChild(document.createComment('bar'));
    container.appendChild(document.createElement('span'));

    expect(reportPart(part, value)).toBe(
      `<div>foo[["my value" IS USED IN HERE!]]<!--bar--><span></span></div>`,
    );
  });

  it('should report where a PropertyPart is inserted', () => {
    const part = {
      type: PartType.Property,
      name: 'value',
      node: document.createElement('input'),
    } as const;
    part.node.setAttribute('type', 'text');
    const value = 'my value';

    expect(reportPart(part, value)).toBe(
      `<input type="text" .value=[["my value" IS USED IN HERE!]]>`,
    );

    const container = document.createElement('div');
    container.appendChild(document.createTextNode('foo'));
    container.appendChild(part.node);
    container.appendChild(document.createComment('bar'));
    container.appendChild(document.createElement('span'));

    expect(reportPart(part, value)).toBe(
      `<div>foo<input type="text" .value=[["my value" IS USED IN HERE!]]><!--bar--><span></span></div>`,
    );
  });
});

class Foo implements Directive<Foo> {
  [directiveTag](): Binding<Foo, unknown> {
    throw new Error('Method is not implemented.');
  }
}

class Bar implements Directive<Bar> {
  [directiveTag](): Binding<Bar> {
    throw new Error('Method is not implemented.');
  }
}

class Baz implements Directive<Baz> {
  [directiveTag](): Binding<Baz> {
    throw new Error('Method is not implemented.');
  }
}
