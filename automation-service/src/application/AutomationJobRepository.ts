import { AutomationJob, AutomationJobSnapshot } from "../domain/AutomationJob.js";

export interface AutomationJobRepository {
  save(job: AutomationJob, expectedVersion?: number): Promise<void>;
  findById(automationJobId: string): Promise<AutomationJob | null>;
  findBySearchJobId(searchJobId: string): Promise<AutomationJob | null>;
  findAllBySearchJobId(searchJobId: string): Promise<AutomationJob[]>;
  findByRetryRequestKey(retryRequestKey: string): Promise<AutomationJob | null>;
  list(): Promise<AutomationJobSnapshot[]>;
}
