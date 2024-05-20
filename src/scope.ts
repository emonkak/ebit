import { Context, Hook } from './context.js';
import type { Template } from './template.js';
import { TaggedTemplate, getMarker } from './template/taggedTemplate.js';
import type { Component, Updater } from './updater.js';

export type Namespace = { [key: PropertyKey]: unknown };

export interface Scope<TContext = unknown> {
  getVariable(key: PropertyKey, component: Component<TContext>): unknown;

  setVariable(
    key: PropertyKey,
    value: unknown,
    component: Component<TContext>,
  ): void;

  createContext(
    component: Component<TContext>,
    hooks: Hook[],
    updater: Updater<TContext>,
  ): TContext;

  createHTMLTemplate(
    tokens: ReadonlyArray<string>,
    data: unknown[],
  ): Template<unknown[]>;

  createSVGTemplate(
    tokens: ReadonlyArray<string>,
    data: unknown[],
  ): Template<unknown[]>;
}

export class DefaultScope implements Scope<Context> {
  private readonly _globalNamespace: Namespace;

  private readonly _marker: string;

  private readonly _namespaces: WeakMap<Component<Context>, Namespace> =
    new WeakMap();

  private readonly _cachedTemplates: WeakMap<
    TemplateStringsArray,
    Template<unknown>
  > = new WeakMap();

  constructor(globalNamespace: Namespace = {}) {
    this._globalNamespace = globalNamespace;
    this._marker = getMarker();
  }

  getVariable(key: PropertyKey, component: Component<Context>): unknown {
    return this._namespaces.get(component)?.[key] ?? this._globalNamespace[key];
  }

  setVariable(
    key: PropertyKey,
    value: unknown,
    component: Component<Context>,
  ): void {
    const namespace = this._namespaces.get(component);
    if (namespace !== undefined) {
      namespace[key] = value;
    } else {
      this._namespaces.set(component, { [key]: value });
    }
  }

  createContext(
    component: Component<Context>,
    hooks: Hook[],
    updater: Updater<Context>,
  ): Context {
    return new Context(component, hooks, updater, this);
  }

  createHTMLTemplate(
    tokens: TemplateStringsArray,
    _data: unknown[],
  ): Template<unknown[]> {
    let template = this._cachedTemplates.get(tokens);

    if (template === undefined) {
      template = TaggedTemplate.parseHTML(tokens, this._marker);
      this._cachedTemplates.set(tokens, template);
    }

    return template;
  }

  createSVGTemplate(
    tokens: TemplateStringsArray,
    _data: unknown[],
  ): Template<unknown[]> {
    let template = this._cachedTemplates.get(tokens);

    if (template === undefined) {
      template = TaggedTemplate.parseSVG(tokens, this._marker);
      this._cachedTemplates.set(tokens, template);
    }

    return template;
  }
}
