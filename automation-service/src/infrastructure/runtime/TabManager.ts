import { BrowserContext, Page } from "playwright";

export class TabManager {
  private readonly tracked = new Set<Page>();

  constructor(private readonly context: BrowserContext) {
    for (const page of context.pages()) this.tracked.add(page);
    context.on("page", (page) => this.tracked.add(page));
  }

  async createTab(url = "about:blank"): Promise<Page> {
    const page = await this.context.newPage();
    this.tracked.add(page);
    await page.goto(url);
    return page;
  }

  async reuseOrCreate(url = "about:blank"): Promise<Page> {
    const open = [...this.tracked].find((page) => !page.isClosed());
    if (!open) return this.createTab(url);
    if (open.url() !== url) await open.goto(url);
    return open;
  }

  async reuseOrCreateExact(url: string): Promise<Page> {
    const matching = [...this.tracked].find((page) => !page.isClosed() && page.url() === url);
    return matching ?? this.createTab(url);
  }

  async closeTab(page: Page): Promise<void> {
    this.tracked.delete(page);
    if (!page.isClosed()) await page.close();
  }

  status() {
    const pages = this.context.pages();
    return {
      activeTabs: pages.filter((page) => !page.isClosed()).length,
      trackedTabs: [...this.tracked].filter((page) => !page.isClosed()).length,
      orphanTabs: pages.filter((page) => !this.tracked.has(page) && !page.isClosed()).length,
    };
  }
}
