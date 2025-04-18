import { describe, expect, it } from 'vitest';

import { PartType } from '../src/baseTypes.js';
import {
  ensureDirective,
  ensureNonDirective,
  inspectBlock,
  inspectPart,
  markUsedValue,
  nameOf,
} from '../src/debug.js';
import { MockBlock, TextDirective } from './mocks.js';

describe('ensureDirective', () => {
  it('should throw an error if the value is not instance of the expected class', () => {
    const part = {
      type: PartType.ChildNode,
      node: document.createComment(''),
    } as const;

    expect(() => ensureDirective(TextDirective, null, part)).toThrow(
      'The value must be a instance of TextDirective directive, but got "null".',
    );
  });

  it('should do nothing if the value is instance of the expected class', () => {
    const part = {
      type: PartType.ChildNode,
      node: document.createComment(''),
    } as const;

    ensureDirective(TextDirective, new TextDirective(), part);
  });
});

describe('ensureNonDirective', () => {
  it('should throw an error if the value is any directive', () => {
    const part = {
      type: PartType.ChildNode,
      node: document.createComment(''),
    } as const;

    expect(() => ensureNonDirective(new TextDirective(), part)).toThrow(
      'The value must not be a directive, but got "TextDirective".',
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

describe('nameOf()', () => {
  it('should return the name of the value', () => {
    expect(nameOf(null)).toBe('null');
    expect(nameOf(undefined)).toBe('undefined');
    expect(nameOf('foo')).toBe('"foo"');
    expect(nameOf(123)).toBe('123');
    expect(nameOf(true)).toBe('true');
    expect(nameOf({})).toBe('{}');
    expect(nameOf([])).toBe('[]');
    expect(nameOf(new Date())).toBe('Date');
    expect(nameOf(() => {})).toBe('Function');
    expect(nameOf(function foo() {})).toBe('foo');
    expect(nameOf(new Map())).toBe('Map');
  });
});

describe('inspectBlock()', () => {
  it('should report no block', () => {
    expect(inspectBlock(null)).toBe('/');
  });

  it('should report the stack of blocks', () => {
    expect(inspectBlock(new MockBlock('foo'))).toBe('/"foo"');
    expect(inspectBlock(new MockBlock('foo', new MockBlock('bar')))).toBe(
      '/"bar"/"foo"',
    );
  });
});

describe('inspectPart()', () => {
  it('should report where an AttributePart is inserted', () => {
    const part = {
      type: PartType.Attribute,
      name: 'class',
      node: createElement('input', { type: 'text' }),
    } as const;
    const value = 'my value';

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<input type="text" class=[["my value" IS USED IN HERE!]]>`,
    );

    createElement('div', {}, [
      createElement('span', {}, [document.createTextNode('foo')]),
      createElement('p', {}, [
        document.createTextNode('bar'),
        part.node,
        document.createComment(''),
      ]),
      createElement('span', {}, [document.createTextNode('qux')]),
    ]);

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<div><span>foo</span><p>bar<input type="text" class=[["my value" IS USED IN HERE!]]><!----></p><span>qux</span></div>`,
    );
  });

  it('should report where an AttributePart is inserted in the document', () => {
    const part = {
      type: PartType.Attribute,
      name: 'class',
      node: createElement('input', { type: 'text' }),
    } as const;
    const value = 'my value';

    const myDocument = document.implementation.createHTMLDocument();
    myDocument.body.replaceChildren(
      createElement('div', {}, [
        createElement('span', {}, [document.createTextNode('foo')]),
        createElement('p', {}, [
          document.createTextNode('bar'),
          part.node,
          document.createComment(''),
        ]),
        createElement('span', {}, [document.createTextNode('qux')]),
      ]),
    );

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<!DOCTYPE html><html><head></head><body><div><span>foo</span><p>bar<input type="text" class=[["my value" IS USED IN HERE!]]><!----></p><span>qux</span></div></body></html>`,
    );

    myDocument.body.replaceChildren(
      createElement('div', { id: 'foo' }, [
        createElement('span', {}, [document.createTextNode('foo')]),
        createElement('p', {}, [
          document.createTextNode('bar'),
          part.node,
          document.createComment(''),
        ]),
        createElement('span', {}, [document.createTextNode('qux')]),
      ]),
    );

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<div id="foo"><span>foo</span><p>bar<input type="text" class=[["my value" IS USED IN HERE!]]><!----></p><span>qux</span></div>`,
    );
  });

  it('should report where a ChildNodePart is inserted', () => {
    const part = {
      type: PartType.ChildNode,
      name: 'click',
      node: document.createComment(''),
    } as const;
    const value = 'my value';

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `[["my value" IS USED IN HERE!]]<!---->`,
    );

    createElement('div', {}, [
      createElement('span', {}, [document.createTextNode('foo')]),
      createElement('p', {}, [
        document.createTextNode('bar'),
        part.node,
        document.createComment(''),
      ]),
      createElement('span', {}, [document.createTextNode('qux')]),
    ]);

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<div><span>foo</span><p>bar[["my value" IS USED IN HERE!]]<!----><!----></p><span>qux</span></div>`,
    );
  });

  it('should report where an ElementPart is inserted', () => {
    const part = {
      type: PartType.Element,
      node: document.createElement('div'),
    } as const;
    const value = 'my value';

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<div [["my value" IS USED IN HERE!]]></div>`,
    );

    createElement('div', {}, [
      createElement('span', {}, [document.createTextNode('foo')]),
      createElement('p', {}, [
        document.createTextNode('bar'),
        part.node,
        document.createComment(''),
      ]),
      createElement('span', {}, [document.createTextNode('qux')]),
    ]);

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<div><span>foo</span><p>bar<div [["my value" IS USED IN HERE!]]></div><!----></p><span>qux</span></div>`,
    );
  });

  it('should report where an EventPart is inserted', () => {
    const part = {
      type: PartType.Event,
      name: 'click',
      node: createElement('button', { type: 'button' }),
    } as const;
    const value = 'my value';

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<button type="button" @click=[["my value" IS USED IN HERE!]]></button>`,
    );

    createElement('div', {}, [
      createElement('span', {}, [document.createTextNode('foo')]),
      createElement('p', {}, [
        document.createTextNode('bar'),
        part.node,
        document.createComment(''),
      ]),
      createElement('span', {}, [document.createTextNode('qux')]),
    ]);

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<div><span>foo</span><p>bar<button type="button" @click=[["my value" IS USED IN HERE!]]></button><!----></p><span>qux</span></div>`,
    );
  });

  it('should report where a NodePart is inserted', () => {
    const part = {
      type: PartType.Node,
      name: 'click',
      node: document.createTextNode('foo'),
    } as const;
    const value = 'my value';

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `[["my value" IS USED IN HERE!]]`,
    );

    createElement('div', {}, [
      createElement('span', {}, [document.createTextNode('foo')]),
      createElement('p', {}, [
        document.createTextNode('bar'),
        part.node,
        document.createComment(''),
      ]),
      createElement('span', {}, [document.createTextNode('qux')]),
    ]);

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<div><span>foo</span><p>bar[["my value" IS USED IN HERE!]]<!----></p><span>qux</span></div>`,
    );
  });

  it('should report where a PropertyPart is inserted', () => {
    const part = {
      type: PartType.Property,
      name: 'value',
      node: createElement('input', { type: 'text' }),
    } as const;
    const value = 'my value';

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<input type="text" .value=[["my value" IS USED IN HERE!]]>`,
    );

    createElement('div', {}, [
      createElement('span', {}, [document.createTextNode('foo')]),
      createElement('p', {}, [
        document.createTextNode('bar'),
        part.node,
        document.createComment(''),
      ]),
      createElement('span', {}, [document.createTextNode('qux')]),
    ]);

    expect(inspectPart(part, markUsedValue(value))).toBe(
      `<div><span>foo</span><p>bar<input type="text" .value=[["my value" IS USED IN HERE!]]><!----></p><span>qux</span></div>`,
    );
  });
});

function createElement<const T extends keyof HTMLElementTagNameMap>(
  tagName: T,
  attribues: { [key: string]: string } = {},
  children: Node[] = [],
): HTMLElementTagNameMap[T] {
  const element = document.createElement(tagName);
  for (const key in attribues) {
    element.setAttribute(key, attribues[key]!);
  }
  for (const child of children) {
    element.appendChild(child);
  }
  return element;
}
