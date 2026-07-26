export type BrowserPageSnapshot = { id: string; url: string };
export type BingMapsTransitionType = "NEW_TAB" | "EXISTING_TAB_REUSED" | "CURRENT_TAB_NAVIGATED";

export type BingMapsTransition = {
  pageId: string;
  type: BingMapsTransitionType;
  url: string;
};

export function isBingMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "bing.com" || url.hostname.endsWith(".bing.com")) &&
      (url.pathname === "/maps" || url.pathname.startsWith("/maps/"))
    );
  } catch {
    return false;
  }
}

export function detectBingMapsTransition(
  before: BrowserPageSnapshot[],
  popupPageId: string,
  after: BrowserPageSnapshot[],
): BingMapsTransition | undefined {
  const beforeById = new Map(before.map((page) => [page.id, page]));
  const candidates = after.filter((candidate) => isBingMapsUrl(candidate.url));
  if (candidates.length > 1) throw new Error("Multiple Bing Maps pages were detected after launcher activation");
  for (const page of candidates) {
    const previous = beforeById.get(page.id);
    if (!previous) return { pageId: page.id, type: "NEW_TAB", url: page.url };
    if (page.id === popupPageId && previous.url !== page.url) {
      return { pageId: page.id, type: "CURRENT_TAB_NAVIGATED", url: page.url };
    }
    if (previous.url !== page.url || isBingMapsUrl(previous.url)) {
      return { pageId: page.id, type: "EXISTING_TAB_REUSED", url: page.url };
    }
  }
  return undefined;
}
