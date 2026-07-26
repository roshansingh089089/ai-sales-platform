export type RecoveryDecision = {
  retry: boolean;
  delayMs: number;
  failureCode?: string;
  manualActionRequired?: boolean;
};

export class NonRetryableAutomationError extends Error {}

export class RecoveryManager {
  constructor(
    private readonly maxRetries: number,
    private readonly baseDelayMs: number,
  ) {}

  decide(error: unknown, retryCount: number): RecoveryDecision {
    if (error instanceof NonRetryableAutomationError) {
      return { retry: false, delayMs: 0, failureCode: "NON_RETRYABLE_BROWSER_INTERACTION" };
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/session expired|authentication|required/i.test(message)) {
      return { retry: false, delayMs: 0, failureCode: "SESSION_EXPIRED", manualActionRequired: true };
    }
    if (retryCount >= this.maxRetries) {
      return { retry: false, delayMs: 0, failureCode: classify(message) };
    }
    return { retry: true, delayMs: this.baseDelayMs * 2 ** retryCount, failureCode: classify(message) };
  }
}

function classify(message: string): string {
  if (/browser.*crash/i.test(message)) return "BROWSER_CRASH";
  if (/download.*timeout/i.test(message)) return "DOWNLOAD_TIMEOUT";
  if (/provider.*timeout/i.test(message)) return "PROVIDER_TIMEOUT";
  return "AUTOMATION_ERROR";
}
