import { ProviderLauncherDryRunRequest } from "./ProviderLauncherDryRun.js";

export function normalizeProviderLauncherDryRunRequest(value: unknown): ProviderLauncherDryRunRequest {
  const candidate = value as { activate?: unknown };
  if (candidate.activate !== undefined && typeof candidate.activate !== "boolean") {
    throw new Error("activate must be a boolean");
  }
  return { activate: candidate.activate ?? false };
}

export function launcherActivationRejection(request: ProviderLauncherDryRunRequest):
  | { statusCode: 501; body: { code: "NOT_IMPLEMENTED"; error: string } }
  | undefined {
  return request.activate === true
    ? {
        statusCode: 501,
        body: { code: "NOT_IMPLEMENTED", error: "Bing Maps launcher activation is not implemented" },
      }
    : undefined;
}
