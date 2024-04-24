import {
  AttributePart,
  Binding,
  Directive,
  Effect,
  Part,
  PartType,
  Updater,
  directiveTag,
} from '../types.js';

export type StyleMap = { [P in StyleProperty]?: CSSStyleValue | string };

type StyleProperty = ExtractStringProperty<CSSStyleDeclaration>;

type ExtractStringProperty<T> = {
  [P in keyof T]: P extends string ? (T[P] extends string ? P : never) : never;
}[keyof T];

export function style(styleDeclaration: StyleMap): StyleDirective {
  return new StyleDirective(styleDeclaration);
}

export class StyleDirective implements Directive {
  private readonly _styleMap: StyleMap;

  constructor(styleMap: StyleMap) {
    this._styleMap = styleMap;
  }

  get styleMap(): StyleMap {
    return this._styleMap;
  }

  [directiveTag](part: Part, updater: Updater): StyleBinding {
    if (part.type !== PartType.ATTRIBUTE || part.name !== 'style') {
      throw new Error('StyleDirective must be used in the "style" attribute.');
    }

    const binding = new StyleBinding(this, part);

    binding.bind(updater);

    return binding;
  }
}

export class StyleBinding implements Binding<StyleDirective>, Effect {
  private readonly _part: AttributePart;

  private _directive: StyleDirective;

  private _dirty = false;

  constructor(directive: StyleDirective, part: AttributePart) {
    this._directive = directive;
    this._part = part;
  }

  get part(): AttributePart {
    return this._part;
  }

  get startNode(): ChildNode {
    return this._part.node;
  }

  get endNode(): ChildNode {
    return this._part.node;
  }

  get value(): StyleDirective {
    return this._directive;
  }

  set value(newValue: StyleDirective) {
    this._directive = newValue;
  }

  bind(updater: Updater): void {
    if (!this._dirty) {
      updater.enqueueMutationEffect(this);
      this._dirty = true;
    }
  }

  unbind(updater: Updater): void {
    this._directive = new StyleDirective({});

    if (!this._dirty) {
      updater.enqueueMutationEffect(this);
      this._dirty = true;
    }
  }

  disconnect(): void {}

  commit(): void {
    const { attributeStyleMap } = this._part.node as
      | HTMLElement
      | MathMLElement
      | SVGElement;
    const { styleMap } = this._directive;

    for (const property in styleMap) {
      const value = styleMap[property as StyleProperty]!;
      attributeStyleMap.set(property, value);
    }

    for (const property of attributeStyleMap.keys()) {
      if (!(property in styleMap)) {
        attributeStyleMap.delete(property);
      }
    }
  }
}
