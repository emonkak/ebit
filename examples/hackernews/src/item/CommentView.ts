import type { RenderContext, TemplateResult } from '@emonkak/ebit';
import {
  classMap,
  component,
  keyedList,
  optional,
} from '@emonkak/ebit/directives.js';

import type { Comment } from '../store.js';

interface CommentProps {
  comment: Comment;
}

export function CommentView(
  { comment }: CommentProps,
  context: RenderContext,
): TemplateResult {
  const [isOpened, setIsOpened] = context.useState<boolean>(true);

  const handleToggleOpen = context.useCallback(() => {
    setIsOpened((isOpened) => !isOpened);
  }, []);

  return context.html`
    <li class="comment">
      <div class="by">
        <a href=${`#/users/${comment.user}`}>${comment.user}</a>
        ${' '}${comment.time_ago} ago
      </div>
      <div class="text" .innerHTML=${comment.content}></div>
      <${optional(
        comment.comments.length > 0
          ? context.html`
        <div class=${classMap({ toggle: true, open: isOpened })}>
          <a @click=${handleToggleOpen}>
            ${isOpened ? '[-]' : '[+] ' + pluralize(comment.comments.length) + ' collapsed'}
          </a>
        </div>
        <${optional(
          isOpened
            ? context.html`
                <ul class="comment-children">
                  <${keyedList(
                    comment.comments,
                    (comment) => comment.id,
                    (comment) => component(CommentView, { comment }),
                  )}>
                </ul>
              `
            : null,
        )}>
        `
          : null,
      )}>
    </li>
  `;
}

function pluralize(n: number): string {
  return n + (n === 1 ? ' reply' : ' replies');
}
