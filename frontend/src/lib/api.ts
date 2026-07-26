import axios from "axios";
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});
export type Business = {
  id: string;
  name: string;
  industry?: string;
  city?: string;
  country?: string;
  status: string;
  description?: string;
  website?: string;
  state?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};
export type Page<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export type Task = {
  id: string;
  businessId: string;
  businessName: string;
  contactId?: string;
  contactName?: string;
  callActivityId?: string;
  originatingOutcome?: string;
  title: string;
  description?: string;
  dueAt: string;
  priority: string;
  status: string;
};
export type Contact = {
  id: string;
  businessId: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  designation?: string;
  phoneNumber?: string;
  email?: string;
  preferredContactMethod: "PHONE" | "EMAIL" | "UNKNOWN";
  doNotContact: boolean;
  notes?: string;
};
export type Opportunity = {
  id: string;
  businessId: string;
  title: string;
  problemStatement: string;
  proposedSolution: string;
  confidenceScore?: number;
  evidence?: string;
  status: string;
  createdAt: string;
};
export type CallBrief = {
  id: string;
  businessId: string;
  contactId: string;
  opportunityId?: string;
  objective: string;
  introduction: string;
  keyTalkingPoints: string;
  discoveryQuestions: string;
  likelyObjections: string;
  suggestedResponses: string;
  nextBestAction: string;
  status: string;
  createdAt: string;
};
export type CallActivity = {
  id: string;
  businessId: string;
  businessName: string;
  contactId: string;
  contactName: string;
  callBriefId?: string;
  startedAt?: string;
  completedAt?: string;
  outcome: string;
  summary?: string;
  customerInterest: string;
  followUpRequired: boolean;
  followUpDate?: string;
  createdAt: string;
};
export type ManualCall = {
  contactId: string;
  contactName: string;
  phoneNumber?: string;
  callUri?: string;
  allowed: boolean;
  blockedReason?: string;
};
export type DashboardSummary = {
  totalBusinesses: number;
  contactsReady: number;
  callBriefsReady: number;
  interestedLeads: number;
  openTasks: number;
  callsToMakeToday: Array<{
    callBriefId: string;
    businessId: string;
    businessName: string;
    contactId: string;
    contactName: string;
    phoneNumber: string;
    objective: string;
  }>;
  recentCallOutcomes: Array<{
    id: string;
    businessName: string;
    contactName: string;
    outcome: string;
    interest: string;
    occurredAt: string;
  }>;
  followUpTasks: Array<{
    id: string;
    title: string;
    businessName: string;
    contactName?: string;
    dueAt: string;
    status: string;
  }>;
  businessesRequiringAttention: Array<{
    id: string;
    name: string;
    reason: string;
  }>;
};

export type IntelligenceBusiness = {
  id: string;
  businessName: string;
  categories: string[];
  address?: string;
  phoneNumber?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  leadScore: number;
  qualification?: string;
  qualificationReasons: string[];
  status: string;
  sources: Array<{ source: string; sourcePlaceId: string }>;
  createdAt: string;
  updatedAt: string;
};

export type IntelligenceSearchResponse = {
  searchId: string;
  discoveredCount: number;
  persistedCount: number;
  queuedJobs: number;
  businessIds: string[];
};

export type EnrichmentStatus = {
  businessId: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
  steps: Array<{ stepName: string; status: string; message?: string }>;
  lastError?: string;
  updatedAt?: string;
};

export type SearchHistory = {
  id: string;
  category: string;
  location: string;
  radiusMeters: number;
  maximumResults: number;
  discoveredCount: number;
  persistedCount: number;
  businessIds: string[];
  createdAt: string;
};

export type LeadSearchStatus =
  | "QUEUED"
  | "BROWSER_STARTING"
  | "SEARCHING"
  | "EXPORTING"
  | "DOWNLOADING"
  | "IMPORTING"
  | "COMPLETED"
  | "FAILED";

export type LeadSearch = {
  id: string;
  query: string;
  location: string;
  maxResults: number;
  status: LeadSearchStatus;
  progressPercentage: number;
  resultCount: number;
  duplicateCount: number;
  failureMessage?: string;
  createdAt: string;
  completedAt?: string;
};

export type LeadSearchResult = {
  id: string;
  businessId: string;
  provider: string;
  sourceExternalId?: string;
  businessName: string;
  category?: string;
  city?: string;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
  createdAt: string;
};
