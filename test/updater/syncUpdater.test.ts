import { describe, expect, it, vi } from 'vitest';

import { CommitPhase, createUpdateQueue } from '../../src/baseTypes.js';
import { SyncUpdater } from '../../src/updater/syncUpdater.js';
import { MockBlock, MockUpdateHost } from '../mocks.js';

describe('SyncUpdater', () => {
  describe('.waitForUpdate()', () => {
    it('should return a promise that will be fulfilled when the update is complete', async () => {
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();

      const queue = createUpdateQueue();

      expect(updater.isScheduled()).toBe(false);

      updater.scheduleUpdate(queue, host);
      expect(updater.isScheduled()).toBe(true);

      await updater.waitForUpdate();
      expect(updater.isScheduled()).toBe(false);
    });

    it('should return a fulfilled promise when the update is not scheduled', async () => {
      const updater = new SyncUpdater();

      const isFulfilled = await Promise.race([
        updater.waitForUpdate().then(
          () => true,
          () => false,
        ),
        Promise.resolve().then(
          () => false,
          () => false,
        ),
      ]);

      expect(isFulfilled).toBe(true);
    });
  });

  describe('.scheduleUpdate()', () => {
    it('should do nothing if already scheduled', async () => {
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();

      const queue = createUpdateQueue();

      const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

      updater.scheduleUpdate(queue, host);
      updater.scheduleUpdate(queue, host);

      expect(queueMicrotaskSpy).toHaveBeenCalledOnce();

      await updater.waitForUpdate();
    });

    it('should update the block on a microtask', async () => {
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();

      const queue = createUpdateQueue();
      const block = new MockBlock();
      const mutationEffect = { commit: vi.fn() };
      const layoutEffect = { commit: vi.fn() };
      const passiveEffect = { commit: vi.fn() };

      const updateSpy = vi
        .spyOn(block, 'update')
        .mockImplementation((context) => {
          context.enqueueMutationEffect(mutationEffect);
          context.enqueueLayoutEffect(layoutEffect);
          context.enqueuePassiveEffect(passiveEffect);
        });
      const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

      queue.blocks.push(block);
      updater.scheduleUpdate(queue, host);

      expect(queueMicrotaskSpy).toHaveBeenCalledOnce();

      await updater.waitForUpdate();

      expect(mutationEffect.commit).toHaveBeenCalledOnce();
      expect(mutationEffect.commit).toHaveBeenCalledWith(CommitPhase.Mutation);
      expect(layoutEffect.commit).toHaveBeenCalledOnce();
      expect(layoutEffect.commit).toHaveBeenCalledWith(CommitPhase.Layout);
      expect(passiveEffect.commit).toHaveBeenCalledOnce();
      expect(passiveEffect.commit).toHaveBeenCalledWith(CommitPhase.Passive);
      expect(updateSpy).toHaveBeenCalledOnce();
    });

    it('should cancel the update of the block if shouldUpdate() returns false ', async () => {
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();

      const queue = createUpdateQueue();
      const block = new MockBlock();

      const updateSpy = vi.spyOn(block, 'update');
      const shouldUpdateSpy = vi
        .spyOn(block, 'shouldUpdate')
        .mockReturnValue(false);
      const cancelUpdateSpy = vi.spyOn(block, 'cancelUpdate');
      const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

      queue.blocks.push(block);
      updater.scheduleUpdate(queue, host);

      expect(queueMicrotaskSpy).toHaveBeenCalledOnce();

      await updater.waitForUpdate();

      expect(updateSpy).not.toHaveBeenCalled();
      expect(shouldUpdateSpy).toHaveBeenCalledOnce();
      expect(cancelUpdateSpy).toHaveBeenCalledOnce();
    });

    it('should commit effects on a microtask', async () => {
      const host = new MockUpdateHost();
      const updater = new SyncUpdater();

      const queue = createUpdateQueue();
      const mutationEffect = { commit: vi.fn() };
      const layoutEffect = { commit: vi.fn() };
      const passiveEffect = { commit: vi.fn() };

      const queueMicrotaskSpy = vi.spyOn(globalThis, 'queueMicrotask');

      queue.mutationEffects.push(mutationEffect);
      queue.layoutEffects.push(layoutEffect);
      queue.passiveEffects.push(passiveEffect);
      updater.scheduleUpdate(queue, host);

      expect(queueMicrotaskSpy).toHaveBeenCalledOnce();

      await updater.waitForUpdate();

      expect(mutationEffect.commit).toHaveBeenCalledOnce();
      expect(mutationEffect.commit).toHaveBeenCalledWith(CommitPhase.Mutation);
      expect(layoutEffect.commit).toHaveBeenCalledOnce();
      expect(layoutEffect.commit).toHaveBeenCalledWith(CommitPhase.Layout);
      expect(passiveEffect.commit).toHaveBeenCalledOnce();
      expect(passiveEffect.commit).toHaveBeenCalledWith(CommitPhase.Passive);
    });
  });
});
