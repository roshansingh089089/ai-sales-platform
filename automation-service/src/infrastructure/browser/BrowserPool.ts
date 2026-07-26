export type BrowserLease = {
  browserSessionId: string;
  release(): Promise<void>;
};

type BrowserSlot = {
  browserSessionId: string;
  busy: boolean;
  launchedAt: number;
  lastUsedAt: number;
};

export class BrowserPool {
  private readonly slots: BrowserSlot[] = [];
  private launches = 0;
  private reuses = 0;

  constructor(
    private readonly maxInstances: number,
    private readonly idleTimeoutMs: number,
  ) {}

  async acquire(): Promise<BrowserLease> {
    this.pruneIdle();
    const idle = this.slots.find((slot) => !slot.busy);
    if (idle) {
      idle.busy = true;
      idle.lastUsedAt = Date.now();
      this.reuses += 1;
      return this.lease(idle);
    }
    if (this.slots.length >= this.maxInstances) throw new Error("Browser pool is exhausted");
    const slot: BrowserSlot = {
      browserSessionId: crypto.randomUUID(),
      busy: true,
      launchedAt: Date.now(),
      lastUsedAt: Date.now(),
    };
    this.slots.push(slot);
    this.launches += 1;
    return this.lease(slot);
  }

  async shutdown(): Promise<void> {
    this.slots.length = 0;
  }

  status() {
    return {
      maxInstances: this.maxInstances,
      activeInstances: this.slots.length,
      busyInstances: this.slots.filter((slot) => slot.busy).length,
      idleInstances: this.slots.filter((slot) => !slot.busy).length,
      launches: this.launches,
      reuses: this.reuses,
      reuseRatio: this.launches + this.reuses === 0 ? 0 : this.reuses / (this.launches + this.reuses),
    };
  }

  private lease(slot: BrowserSlot): BrowserLease {
    return {
      browserSessionId: slot.browserSessionId,
      release: async () => {
        slot.busy = false;
        slot.lastUsedAt = Date.now();
      },
    };
  }

  private pruneIdle(): void {
    const now = Date.now();
    for (let index = this.slots.length - 1; index >= 0; index--) {
      const slot = this.slots[index];
      if (!slot.busy && now - slot.lastUsedAt > this.idleTimeoutMs) this.slots.splice(index, 1);
    }
  }
}
