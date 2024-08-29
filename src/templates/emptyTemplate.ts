import type {
  ChildNodePart,
  DirectiveContext,
  Template,
  TemplateView,
  UpdateContext,
} from '../baseTypes.js';

export class EmptyTemplate implements Template<readonly []> {
  static readonly instance = new EmptyTemplate();

  private constructor() {
    if (EmptyTemplate.instance !== undefined) {
      throw new Error('EmptyTemplate constructor cannot be called directly.');
    }
  }

  render(_data: readonly [], _context: DirectiveContext): EmptyTemplateView {
    return new EmptyTemplateView();
  }

  isSameTemplate(other: Template<readonly []>): boolean {
    return other === this;
  }
}

export class EmptyTemplateView implements TemplateView<readonly []> {
  get startNode(): null {
    return null;
  }

  get endNode(): null {
    return null;
  }

  connect(_context: UpdateContext): void {}

  bind(_data: readonly [], _context: UpdateContext): void {}

  unbind(_context: UpdateContext): void {}

  mount(_part: ChildNodePart): void {}

  unmount(_part: ChildNodePart): void {}

  disconnect(_context: UpdateContext): void {}
}
