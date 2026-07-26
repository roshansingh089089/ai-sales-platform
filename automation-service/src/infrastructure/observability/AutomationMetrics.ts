export class AutomationMetrics {
  private started = 0;
  private completed = 0;
  private failed = 0;
  private totalExecutionMs = 0;
  private providerExecutionMs = new Map<string, number[]>();

  jobStarted(): void {
    this.started += 1;
  }

  jobCompleted(durationMs: number): void {
    this.completed += 1;
    this.totalExecutionMs += durationMs;
  }

  jobFailed(durationMs: number): void {
    this.failed += 1;
    this.totalExecutionMs += durationMs;
  }

  providerExecuted(provider: string, durationMs: number): void {
    this.providerExecutionMs.set(provider, [...(this.providerExecutionMs.get(provider) ?? []), durationMs]);
  }

  snapshot() {
    return {
      automationJobsStarted: this.started,
      automationJobsCompleted: this.completed,
      automationJobsFailed: this.failed,
      averageExecutionTimeMs: this.completed + this.failed === 0 ? 0 : this.totalExecutionMs / (this.completed + this.failed),
      providerExecutionTimeMs: Object.fromEntries(
        [...this.providerExecutionMs.entries()].map(([provider, values]) => [
          provider,
          values.reduce((sum, value) => sum + value, 0) / values.length,
        ]),
      ),
    };
  }
}
