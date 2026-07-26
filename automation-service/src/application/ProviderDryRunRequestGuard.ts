import { ProviderDryRunRequest } from "./ProviderDryRun.js";

export function normalizeProviderDryRunRequest(value: unknown): ProviderDryRunRequest {
  const candidate = value as { query?: unknown; location?: unknown; submit?: unknown };
  if (typeof candidate.query !== "string" || !candidate.query.trim()) throw new Error("query is required");
  if (typeof candidate.location !== "string" || !candidate.location.trim()) throw new Error("location is required");
  if (candidate.submit !== undefined && typeof candidate.submit !== "boolean") throw new Error("submit must be a boolean");
  return {
    query: candidate.query.trim(),
    location: candidate.location.trim(),
    submit: candidate.submit ?? false,
  };
}

export function dryRunSubmissionRejection(request: ProviderDryRunRequest):
  | { statusCode: 501; body: { code: "NOT_IMPLEMENTED"; error: string } }
  | undefined {
  return request.submit === true
    ? {
        statusCode: 501,
        body: { code: "NOT_IMPLEMENTED", error: "Search submission is not implemented" },
      }
    : undefined;
}
