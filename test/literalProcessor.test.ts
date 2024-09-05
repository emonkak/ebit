import { describe, expect, it } from 'vitest';

import { type Literal, literal } from '../src/baseTypes.js';
import { LiteralProcessor } from '../src/literalProcessor.js';

describe('LiteralProcessor', () => {
  const createTag = (type: string | Literal, children: string | Literal) =>
    tmpl`<${type}>${children}</${type}>`;

  const createDate = (
    year: string | Literal,
    month: string | Literal,
    day: string | Literal,
  ) => tmpl`${year}-${month}-${day}`;

  it('should return the same strings as the argument if there are no literals', () => {
    const literalProcessor = new LiteralProcessor();
    const template = createTag('div', 'foo');
    const processedTemplate = literalProcessor.process(
      template.strings,
      template.values,
    );

    expect(processedTemplate.strings).toStrictEqual(['<', '>', '</', '>']);
    expect(processedTemplate.strings).toBe(template.strings);
    expect(processedTemplate.values).toStrictEqual(['div', 'foo', 'div']);
  });

  it('should return the same strings as previous one if static strings is the same', () => {
    const literalProcessor = new LiteralProcessor();
    const template1 = createTag(literal('div'), 'foo');
    const template2 = createTag(literal('div'), 'bar');
    const processedTemplate1 = literalProcessor.process(
      template1.strings,
      template1.values,
    );
    const processedTemplate2 = literalProcessor.process(
      template2.strings,
      template2.values,
    );

    expect(processedTemplate1.strings).toStrictEqual(['<div>', '</div>']);
    expect(processedTemplate1.strings).toBe(processedTemplate2.strings);
    expect(processedTemplate1.values).toStrictEqual(['foo']);
    expect(processedTemplate2.values).toStrictEqual(['bar']);
  });

  it('should return a new strings if the literal changes', () => {
    const literalProcessor = new LiteralProcessor();
    const template1 = createTag(literal('div'), 'foo');
    const template2 = createTag(literal('span'), 'foo');
    const processedTemplate1 = literalProcessor.process(
      template1.strings,
      template1.values,
    );
    const processedTemplate2 = literalProcessor.process(
      template2.strings,
      template2.values,
    );

    expect(processedTemplate1.strings).toStrictEqual(['<div>', '</div>']);
    expect(processedTemplate2.strings).toStrictEqual(['<span>', '</span>']);
    expect(processedTemplate1.values).toStrictEqual(['foo']);
    expect(processedTemplate2.values).toStrictEqual(['foo']);
  });

  it('should return a new strings if the literal position changes', () => {
    const literalProcessor = new LiteralProcessor();
    const template1 = createDate(literal('1990'), literal('01'), '01');
    const template2 = createDate(literal('1990'), '01', literal('01'));
    const processedTemplate1 = literalProcessor.process(
      template1.strings,
      template1.values,
    );
    const processedTemplate2 = literalProcessor.process(
      template2.strings,
      template2.values,
    );

    expect(processedTemplate1.strings).toStrictEqual(['1990-01-', '']);
    expect(processedTemplate2.strings).toStrictEqual(['1990-', '-01']);
    expect(processedTemplate1.values).toStrictEqual(['01']);
    expect(processedTemplate2.values).toStrictEqual(['01']);
  });

  it('should return a new strings if the template changes', () => {
    const literalProcessor = new LiteralProcessor();
    const template1 = tmpl`<div>Hello, ${'World'}!</div>`;
    const template2 = tmpl`<div>Hello, ${'World'}!</div>`;
    const processedTemplate1 = literalProcessor.process(
      template1.strings,
      template1.values,
    );
    const processedTemplate2 = literalProcessor.process(
      template2.strings,
      template2.values,
    );

    expect(processedTemplate1.strings).toStrictEqual([
      '<div>Hello, ',
      '!</div>',
    ]);
    expect(processedTemplate2.strings).toStrictEqual([
      '<div>Hello, ',
      '!</div>',
    ]);
    expect(processedTemplate1.strings).not.toBe(processedTemplate2.strings);
    expect(processedTemplate1.values).toStrictEqual(['World']);
    expect(processedTemplate2.values).toStrictEqual(['World']);
  });
});

function tmpl(
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
): { strings: TemplateStringsArray; values: readonly unknown[] } {
  return { strings, values };
}
