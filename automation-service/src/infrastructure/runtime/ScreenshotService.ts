import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Page } from "playwright";

export type ScreenshotKind = "full-page" | "viewport" | "error";

export class ScreenshotService {
  constructor(private readonly screenshotDirectory: string) {}

  async fullPage(page: Page, label: string): Promise<string> {
    return this.capture(page, "full-page", label, true);
  }

  async viewport(page: Page, label: string): Promise<string> {
    return this.capture(page, "viewport", label, false);
  }

  async error(page: Page, label: string): Promise<string> {
    return this.capture(page, "error", label, true);
  }

  async capture(page: Page, kind: ScreenshotKind, label: string, fullPage: boolean): Promise<string> {
    await mkdir(this.screenshotDirectory, { recursive: true });
    const path = join(this.screenshotDirectory, `${timestamp()}-${kind}-${sanitize(label)}.png`);
    await page.screenshot({ path, fullPage });
    return path;
  }

  status() {
    return { screenshotDirectory: this.screenshotDirectory };
  }
}

function timestamp(): string {
  return new Date().toISOString().replaceAll(/[:.]/g, "-");
}

function sanitize(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
