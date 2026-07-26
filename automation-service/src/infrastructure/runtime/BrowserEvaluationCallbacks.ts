export const browserEvaluationCallbacks = {
  tagName: (element: Element): string => element.tagName.toLowerCase(),
  extensionName: (): string | undefined => {
    const runtime = (globalThis as typeof globalThis & {
      chrome?: { runtime?: { getManifest?: () => { name?: string } } };
    }).chrome?.runtime;
    return runtime?.getManifest?.().name;
  },
  navigatorUserAgent: (): string => navigator.userAgent,
};
