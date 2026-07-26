export type AutomationWorkflowStep =
  | "CREATED"
  | "BROWSER_STARTING"
  | "SESSION_LOADING"
  | "PROVIDER_INITIALIZING"
  | "BING_MAPS_LAUNCHER_READY"
  | "BING_MAPS_READY"
  | "MAPSLEADS_SURFACE_READY"
  | "SEARCH_EXECUTING"
  | "EXPORTING"
  | "WAITING_FOR_DOWNLOAD"
  | "UPLOADING_RESULTS"
  | "COMPLETED"
  | "FAILED"
  | "MANUAL_ACTION_REQUIRED";

export type AutomationJobStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "WAITING_FOR_OPERATOR";

export type AutomationTransition = {
  id: string;
  automationJobId: string;
  fromStep: AutomationWorkflowStep;
  toStep: AutomationWorkflowStep;
  status: AutomationJobStatus;
  message?: string;
  createdAt: string;
  correlationId: string;
};

export type AutomationJobSnapshot = {
  automationJobId: string;
  searchJobId: string;
  provider: string;
  currentStep: AutomationWorkflowStep;
  currentStatus: AutomationJobStatus;
  retryCount: number;
  attemptNumber?: number;
  retryOfAutomationJobId?: string;
  retryRequestKey?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failureCode?: string;
  failureMessage?: string;
  version: number;
  correlationId: string;
  transitions: AutomationTransition[];
};

export class AutomationJob {
  private constructor(private readonly state: AutomationJobSnapshot) {}

  static create(input: {
    searchJobId: string;
    provider: string;
    correlationId: string;
    automationJobId?: string;
    attemptNumber?: number;
    retryOfAutomationJobId?: string;
    retryRequestKey?: string;
  }): AutomationJob {
    const now = new Date().toISOString();
    const automationJobId = input.automationJobId ?? crypto.randomUUID();
    return new AutomationJob({
      automationJobId,
      searchJobId: input.searchJobId,
      provider: input.provider,
      currentStep: "CREATED",
      currentStatus: "PENDING",
      retryCount: 0,
      attemptNumber: input.attemptNumber ?? 1,
      retryOfAutomationJobId: input.retryOfAutomationJobId,
      retryRequestKey: input.retryRequestKey,
      createdAt: now,
      version: 0,
      correlationId: input.correlationId,
      transitions: [
        {
          id: crypto.randomUUID(),
          automationJobId,
          fromStep: "CREATED",
          toStep: "CREATED",
          status: "PENDING",
          message: "Automation job created",
          createdAt: now,
          correlationId: input.correlationId,
        },
      ],
    });
  }

  static rehydrate(snapshot: AutomationJobSnapshot): AutomationJob {
    return new AutomationJob({ ...snapshot, transitions: [...snapshot.transitions] });
  }

  snapshot(): AutomationJobSnapshot {
    return { ...this.state, transitions: [...this.state.transitions] };
  }

  transitionTo(step: AutomationWorkflowStep, status: AutomationJobStatus, message?: string): void {
    if (!isLegalTransition(this.state.currentStep, step)) {
      throw new Error(`Illegal automation transition: ${this.state.currentStep} -> ${step}`);
    }
    const now = new Date().toISOString();
    const fromStep = this.state.currentStep;
    this.state.currentStep = step;
    this.state.currentStatus = status;
    this.state.version += 1;
    if (fromStep === "CREATED" && step !== "CREATED" && !this.state.startedAt) this.state.startedAt = now;
    if (step === "COMPLETED" || step === "FAILED" || step === "MAPSLEADS_SURFACE_READY") {
      this.state.completedAt = now;
    }
    this.state.transitions.push({
      id: crypto.randomUUID(),
      automationJobId: this.state.automationJobId,
      fromStep,
      toStep: step,
      status,
      message,
      createdAt: now,
      correlationId: this.state.correlationId,
    });
  }

  fail(code: string, message: string): void {
    this.state.failureCode = code;
    this.state.failureMessage = message;
    this.transitionTo("FAILED", "FAILED", message);
  }

  requireManualAction(message: string): void {
    this.transitionTo("MANUAL_ACTION_REQUIRED", "WAITING_FOR_OPERATOR", message);
  }

  incrementRetry(): void {
    this.state.retryCount += 1;
    this.state.version += 1;
  }
}

const forward: Record<AutomationWorkflowStep, AutomationWorkflowStep[]> = {
  CREATED: ["BROWSER_STARTING", "FAILED", "MANUAL_ACTION_REQUIRED"],
  BROWSER_STARTING: ["SESSION_LOADING", "FAILED", "MANUAL_ACTION_REQUIRED"],
  SESSION_LOADING: ["PROVIDER_INITIALIZING", "FAILED", "MANUAL_ACTION_REQUIRED"],
  PROVIDER_INITIALIZING: ["BING_MAPS_LAUNCHER_READY", "SEARCH_EXECUTING", "FAILED", "MANUAL_ACTION_REQUIRED"],
  BING_MAPS_LAUNCHER_READY: ["BING_MAPS_READY", "FAILED", "MANUAL_ACTION_REQUIRED"],
  BING_MAPS_READY: ["MAPSLEADS_SURFACE_READY", "FAILED", "MANUAL_ACTION_REQUIRED"],
  MAPSLEADS_SURFACE_READY: [],
  SEARCH_EXECUTING: ["EXPORTING", "FAILED", "MANUAL_ACTION_REQUIRED"],
  EXPORTING: ["WAITING_FOR_DOWNLOAD", "FAILED", "MANUAL_ACTION_REQUIRED"],
  WAITING_FOR_DOWNLOAD: ["UPLOADING_RESULTS", "FAILED", "MANUAL_ACTION_REQUIRED"],
  UPLOADING_RESULTS: ["COMPLETED", "FAILED", "MANUAL_ACTION_REQUIRED"],
  MANUAL_ACTION_REQUIRED: ["SESSION_LOADING", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export function isLegalTransition(from: AutomationWorkflowStep, to: AutomationWorkflowStep): boolean {
  return forward[from].includes(to);
}
