import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Global semaphore that limits the number of concurrent Playwright browser
 * sessions. Without this, each queued job would spin up its own browser
 * instance, quickly exhausting RAM on the worker pod.
 *
 * acquire() blocks until a slot is free or the timeout elapses.
 * If timed out, it throws so the Bull job can retry without holding the queue.
 */
@Injectable()
export class BrowserSemaphoreService {
  private readonly logger = new Logger(BrowserSemaphoreService.name);
  private readonly max: number;
  private readonly acquireTimeoutMs: number;
  private running = 0;
  private readonly waitQueue: Array<() => void> = [];

  constructor(config: ConfigService) {
    this.max = config.get<number>('BROWSER_POOL_SIZE', 3);
    // How long to wait for a free slot before giving up (default 5 min)
    this.acquireTimeoutMs = config.get<number>('BROWSER_ACQUIRE_TIMEOUT_MS', 300_000);
  }

  /** Acquire a browser slot. Resolves with a release function, or throws on timeout. */
  async acquire(): Promise<() => void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      const tryAcquire = () => {
        if (settled) return;
        if (this.running < this.max) {
          settled = true;
          if (timeoutHandle) clearTimeout(timeoutHandle);
          this.running++;
          this.logger.debug(`Browser slot acquired (${this.running}/${this.max})`);
          resolve(() => this.release());
        } else {
          this.waitQueue.push(tryAcquire);
        }
      };

      timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        // Remove from wait queue so it doesn't get called after timeout
        const idx = this.waitQueue.indexOf(tryAcquire);
        if (idx !== -1) this.waitQueue.splice(idx, 1);
        this.logger.warn(
          `Browser slot acquire timed out after ${this.acquireTimeoutMs}ms ` +
          `(pool: ${this.running}/${this.max}, queued: ${this.waitQueue.length})`,
        );
        reject(new Error(`Browser pool exhausted — no slot available after ${this.acquireTimeoutMs}ms. Try again later.`));
      }, this.acquireTimeoutMs);

      tryAcquire();
    });
  }

  private release() {
    this.running = Math.max(0, this.running - 1);
    this.logger.debug(`Browser slot released (${this.running}/${this.max})`);
    const next = this.waitQueue.shift();
    if (next) next();
  }

  get activeCount() { return this.running; }
  get queuedCount() { return this.waitQueue.length; }

  getStats() {
    return {
      active: this.running,
      queued: this.waitQueue.length,
      capacity: this.max,
      utilizationPct: Math.round((this.running / this.max) * 100),
    };
  }
}
