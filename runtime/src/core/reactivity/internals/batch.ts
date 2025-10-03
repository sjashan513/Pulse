// batch.ts
import { SignalObserver } from "./types";

export class Batcher {
  private isBatching = false;
  private batchQueue = new Set<SignalObserver>();
  private flushScheduled = false;
  private inFlush = false;

  private flushBatch() {
    if (this.inFlush) return;
    this.inFlush = true;
    this.flushScheduled = false;
    const toNotify = Array.from(this.batchQueue);
    this.batchQueue.clear();
    toNotify.sort((a, b) => a.level < b.level ? -1 : 1);
    for (const observer of toNotify) {
      observer.run();
    }
    this.inFlush = false;
  }

  public scheduleObserver(observer: SignalObserver) {
    this.batchQueue.add(observer);
    if (!this.isBatching && !this.flushScheduled) {
      this.flushScheduled = true;
      queueMicrotask(() => {
        if (this.flushScheduled) {
          this.flushBatch();
        }
      });
    }
  }

  public batch(fn: () => void) {
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
}
