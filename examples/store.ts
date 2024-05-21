import { AtomSignal, ComputedSignal, Signal } from '../src/signal.js';

enum Visibility {
  ALL,
  ACTIVE,
  DONE,
}

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

interface TodoState {
  todos: Todo[];
  visibility: Visibility;
}

class TodoStore {
  public readonly todos: AtomSignal<Todo[]>;

  public readonly visibility: AtomSignal<Visibility>;

  public readonly visibleTodos: ComputedSignal<
    Todo[],
    [AtomSignal<Todo[]>, AtomSignal<Visibility>]
  >;

  constructor({ todos, visibility }: TodoState) {
    this.todos = new AtomSignal(todos);

    this.visibility = new AtomSignal(visibility);

    this.visibleTodos = ComputedSignal.lift(
      (todos, visibility) => {
        switch (visibility) {
          case Visibility.ALL:
            return todos.slice();
          case Visibility.ACTIVE:
            return todos.filter((todo) => !todo.done);
          case Visibility.DONE:
            return todos.filter((todo) => todo.done);
        }
      },
      [this.todos, this.visibility],
    );
  }

  addTodo(todo: Todo): void {
    this.todos.value.push(todo);
    this.todos.forceUpdate();
  }

  getSnapshot(): TodoState {
    return {
      todos: this.todos.value,
      visibility: this.visibility.value,
    };
  }
}

const todoStore = new TodoStore({
  todos: [
    {
      id: 1,
      title: 'foo',
      done: false,
    },
    {
      id: 2,
      title: 'bar',
      done: true,
    },
    {
      id: 3,
      title: 'baz',
      done: false,
    },
  ],
  visibility: Visibility.ALL,
});

todoStore.addTodo({
  id: 4,
  title: 'qux',
  done: true,
});

console.log(todoStore.visibleTodos.value);

todoStore.visibility.value = Visibility.DONE;

console.log(todoStore.visibleTodos.value);
