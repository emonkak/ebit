import { LinkedList } from '../linkedList.js';
import { Scheduler, createAdaptedScheduler } from '../scheduler.js';
import type { AbstractScope } from '../scope.js';
import { Effect, Renderable, Updater, shouldSkipRender } from '../updater.js';

export interface ConcurrentUpdaterOptions {
  scheduler?: Scheduler;
}

interface Pipeline<TContext> {
  pendingRenderables: Renderable<TContext>[];
  pendingLayoutEffects: Effect[];
  pendingMutationEffects: Effect[];
  pendingPassiveEffects: Effect[];
}

export class ConcurrentUpdater<TContext> implements Updater<TContext> {
  private readonly _scope: AbstractScope<TContext>;

  private readonly _scheduler: Scheduler;

  private _currentRenderble: Renderable | null = null;

  private _currentPipeline: Pipeline<TContext> = createPipeline();

  private _runningTasks = new LinkedList<Promise<void>>();

  constructor(
    scope: AbstractScope<TContext>,
    { scheduler = createAdaptedScheduler() }: ConcurrentUpdaterOptions = {},
  ) {
    this._scope = scope;
    this._scheduler = scheduler;
  }

  get currentRenderable(): Renderable<TContext> | null {
    return this._currentRenderble;
  }

  getCurrentPriority(): TaskPriority {
    if (window.event !== undefined) {
      return isContinuousEvent(window.event) ? 'user-visible' : 'user-blocking';
    } else {
      return 'user-visible';
    }
  }

  enqueueRenderable(renderable: Renderable<TContext>): void {
    this._currentPipeline.pendingRenderables.push(renderable);
  }

  enqueueLayoutEffect(effect: Effect): void {
    this._currentPipeline.pendingLayoutEffects.push(effect);
  }

  enqueueMutationEffect(effect: Effect): void {
    this._currentPipeline.pendingMutationEffects.push(effect);
  }

  enqueuePassiveEffect(effect: Effect): void {
    this._currentPipeline.pendingPassiveEffects.push(effect);
  }

  scheduleUpdate(): void {
    if (this._currentRenderble === null) {
      const pipeline = this._currentPipeline;
      this._scheduleRenderPipelines(pipeline);
      this._scheduleBlockingEffects(pipeline);
      this._schedulePassiveEffects(pipeline);
    }
  }

  isUpdating(): boolean {
    return !this._runningTasks.isEmpty();
  }

  async waitForUpdate(): Promise<void> {
    while (!this._runningTasks.isEmpty()) {
      await Promise.all(this._runningTasks);
    }
  }

  private async _beginRenderPipeline(
    rootRenderable: Renderable,
  ): Promise<void> {
    const pipeline = createPipeline();
    const previousPipeline = this._currentPipeline;

    let pendingRenderables = [rootRenderable];
    let startTime = this._scheduler.getCurrentTime();

    do {
      for (let i = 0, l = pendingRenderables.length; i < l; i++) {
        const renderable = pendingRenderables[i]!;
        if (shouldSkipRender(renderable)) {
          continue;
        }

        if (
          this._scheduler.shouldYieldToMain(
            this._scheduler.getCurrentTime() - startTime,
          )
        ) {
          await this._scheduler.yieldToMain({
            priority: renderable.priority,
          });
          startTime = this._scheduler.getCurrentTime();
        }

        this._currentRenderble = renderable;
        this._currentPipeline = pipeline;
        try {
          renderable.render(this, this._scope);
        } finally {
          this._currentRenderble = null;
          this._currentPipeline = previousPipeline;
        }
      }

      pendingRenderables = pipeline.pendingRenderables;
      pipeline.pendingRenderables = [];
    } while (pendingRenderables.length > 0);

    this._scheduleBlockingEffects(pipeline);
    this._schedulePassiveEffects(pipeline);
  }

  private _scheduleRenderPipelines(pipeline: Pipeline<TContext>): void {
    const { pendingRenderables } = pipeline;
    pipeline.pendingRenderables = [];

    for (let i = 0, l = pendingRenderables.length; i < l; i++) {
      const renderable = pendingRenderables[i]!;
      const task = this._scheduler.requestCallback(
        () => this._beginRenderPipeline(renderable),
        { priority: renderable.priority },
      );
      const taskNode = this._runningTasks.pushBack(task);
      task.then(() => {
        this._runningTasks.remove(taskNode);
      });
    }
  }

  private _scheduleBlockingEffects(pipeline: Pipeline<TContext>): void {
    const { pendingMutationEffects, pendingLayoutEffects } = pipeline;

    if (pendingMutationEffects.length > 0 || pendingLayoutEffects.length > 0) {
      pipeline.pendingMutationEffects = [];
      pipeline.pendingLayoutEffects = [];

      const task = this._scheduler.requestCallback(
        () => {
          flushEffects(pendingMutationEffects);
          flushEffects(pendingLayoutEffects);
        },
        { priority: 'user-blocking' },
      );
      const taskNode = this._runningTasks.pushBack(task);
      task.then(() => {
        this._runningTasks.remove(taskNode);
      });
    }
  }

  private _schedulePassiveEffects(pipeline: Pipeline<TContext>): void {
    const { pendingPassiveEffects } = pipeline;

    if (pendingPassiveEffects.length > 0) {
      pipeline.pendingPassiveEffects = [];

      const task = this._scheduler.requestCallback(
        () => {
          flushEffects(pendingPassiveEffects);
        },
        { priority: 'background' },
      );
      const taskNode = this._runningTasks.pushBack(task);
      task.then(() => {
        this._runningTasks.remove(taskNode);
      });
    }
  }
}

function createPipeline<TContext>(): Pipeline<TContext> {
  return {
    pendingRenderables: [],
    pendingLayoutEffects: [],
    pendingMutationEffects: [],
    pendingPassiveEffects: [],
  };
}

function flushEffects(effects: Effect[]): void {
  for (let i = 0, l = effects.length; i < l; i++) {
    effects[i]!.commit();
  }
}

function isContinuousEvent(event: Event): boolean {
  switch (event.type as keyof DocumentEventMap) {
    case 'drag':
    case 'dragenter':
    case 'dragleave':
    case 'dragover':
    case 'mouseenter':
    case 'mouseleave':
    case 'mousemove':
    case 'mouseout':
    case 'mouseover':
    case 'pointerenter':
    case 'pointerleave':
    case 'pointermove':
    case 'pointerout':
    case 'pointerover':
    case 'scroll':
    case 'touchmove':
    case 'wheel':
      return true;
    default:
      return false;
  }
}