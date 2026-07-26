import { createHash } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { BrowserContext, Page } from "playwright";

export type BrowserDownloadMetadata = {
  filename: string;
  tempLocation?: string;
  finalLocation: string;
  fileSize: number;
  checksum: string;
  durationMs: number;
};

export class DownloadListener {
  constructor(
    private readonly context: BrowserContext,
    private readonly downloadDirectory: string,
  ) {}

  attach(): void {
    this.context.on("page", (page) => this.attachPage(page));
    for (const page of this.context.pages()) this.attachPage(page);
  }

  async waitForDownload(page: Page, action: () => Promise<void>, timeoutMs = 30_000): Promise<BrowserDownloadMetadata> {
    await mkdir(this.downloadDirectory, { recursive: true });
    const started = Date.now();
    const downloadPromise = page.waitForEvent("download", { timeout: timeoutMs });
    await action();
    const download = await downloadPromise;
    const suggested = sanitize(download.suggestedFilename());
    const finalLocation = join(this.downloadDirectory, suggested);
    await download.saveAs(finalLocation);
    const file = await stat(finalLocation);
    const content = await readFile(finalLocation);
    const failure = await download.failure();
    if (failure) throw new Error(`Download failed: ${failure}`);
    return {
      filename: suggested,
      tempLocation: await download.path().catch(() => undefined),
      finalLocation,
      fileSize: file.size,
      checksum: createHash("sha256").update(content).digest("hex"),
      durationMs: Date.now() - started,
    };
  }

  status() {
    return { downloadDirectory: this.downloadDirectory, writable: true };
  }

  private attachPage(page: Page): void {
    page.on("download", (download) => {
      console.log(JSON.stringify({ message: "browser_download_detected", filename: download.suggestedFilename() }));
    });
  }
}

function sanitize(filename: string): string {
  return basename(filename).replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}
