import {
  CommitPhase,
  type RenderHost,
  UpdateContext,
  type UpdateQueue,
  type Updater,
} from '../baseTypes.js';

export class SyncUpdater<TContext> implements Updater<TContext> {
  private readonly _pendingQueues: UpdateQueue<TContext>[] = [];

  flushUpdate(queue: UpdateQueue<TContext>, host: RenderHost<TContext>): void {
    const { blocks, mutationEffects, layoutEffects, passiveEffects } = queue;

    try {
      // block.length may be grow.
      for (let i = 0, l = blocks.length; i < l; l = blocks.length) {
        do {
          const block = blocks[i]!;
          if (!block.shouldUpdate()) {
            block.cancelUpdate();
            continue;
          }
          const context = new UpdateContext(host, this, block, queue);
          block.update(context);
        } while (++i < l);
      }
    } finally {
      queue.blocks.length = 0;
    }

    if (mutationEffects.length > 0) {
      host.flushEffects(mutationEffects, CommitPhase.Mutation);
      queue.mutationEffects.length = 0;
    }

    if (layoutEffects.length > 0) {
      host.flushEffects(layoutEffects, CommitPhase.Layout);
      queue.layoutEffects.length = 0;
    }

    if (passiveEffects.length > 0) {
      host.flushEffects(passiveEffects, CommitPhase.Passive);
      queue.passiveEffects.length = 0;
    }
  }

  isScheduled(): boolean {
    return this._pendingQueues.length > 0;
  }

  scheduleUpdate(
    queue: UpdateQueue<TContext>,
    host: RenderHost<TContext>,
  ): void {
    if (this._pendingQueues.length === 0) {
      queueMicrotask(() => {
        for (let i = 0, l = this._pendingQueues.length; i < l; i++) {
          this.flushUpdate(this._pendingQueues[i]!, host);
        }
        this._pendingQueues.length = 0;
      });
    }
    this._pendingQueues.push(queue);
  }

  waitForUpdate(): Promise<void> {
    return this._pendingQueues.length > 0
      ? new Promise(queueMicrotask)
      : Promise.resolve();
  }
}