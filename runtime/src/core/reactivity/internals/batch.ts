// syntra/packages/core/src/reactivity/internals/batch.ts
import { SignalObserver } from "./types";

export class Batcher {
  private bucketQueue: Array<Set<SignalObserver>> = [];
  private maxLevel: number = 0;
  private currentLevel: number = 0;

  private isBatching: boolean = false;
  private flushScheduled: boolean = false;
  private inFlush: boolean = false;

  public scheduleObserver(observer: SignalObserver): void {
    const level = observer.level;

    if (this.bucketQueue[level] === undefined) {
      this.bucketQueue[level] = new Set();
    }

    this.bucketQueue[level].add(observer);

    if (level > this.maxLevel) {
      this.maxLevel = level;
    }

    if (!this.isBatching && !this.flushScheduled) {
      this.flushScheduled = true;
      queueMicrotask(() => {
        if (this.flushScheduled) {
          this.flushBatch();
        }
      });
    }
  }

  public updateNodeLevel(observer: SignalObserver, oldLevel: number, newLevel: number): void {
    const oldBucket = this.bucketQueue[oldLevel];

    // Solo reubicamos si el nodo ESTABA esperando pasivamente en la cola.
    if (oldBucket !== undefined && oldBucket.has(observer)) {
      oldBucket.delete(observer);

      if (this.bucketQueue[newLevel] === undefined) {
        this.bucketQueue[newLevel] = new Set();
      }

      this.bucketQueue[newLevel].add(observer);

      if (newLevel > this.maxLevel) {
        this.maxLevel = newLevel;
      }
    }
  }

  public batch(fn: () => void): void {
    const wasBatching = this.isBatching;
    this.isBatching = true;
    try {
      fn();
    } finally {
      this.isBatching = wasBatching;
    }
    if (!wasBatching) {
      this.flushScheduled = false;
      this.flushBatch();
    }
  }

  private flushBatch(): void {
    if (this.inFlush) return;
    this.inFlush = true;
    this.flushScheduled = false;

    this.currentLevel = 0;

    while (this.currentLevel <= this.maxLevel) {
      const currentBucket = this.bucketQueue[this.currentLevel];

      if (currentBucket === undefined || currentBucket.size === 0) {
        this.currentLevel++;
        continue;
      }

      const observersToRun = Array.from(currentBucket);
      currentBucket.clear();

      for (const observer of observersToRun) {
        observer.run();
      }

      if (currentBucket.size === 0) {
        this.currentLevel++;
      }
    }

    this.maxLevel = 0;
    this.currentLevel = 0;
    this.inFlush = false;
  }
}