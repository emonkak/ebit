import type { Part } from './part';
import type { Updater } from './updater';

export interface MountPoint {
  children: ChildNode[];
  parts: Part[];
}

export interface TemplateInterface {
  mount(values: unknown[], updater: Updater): MountPoint;
  patch(
    parts: Part[],
    oldValues: unknown[],
    newValues: unknown[],
    updater: Updater,
  ): void;
}
