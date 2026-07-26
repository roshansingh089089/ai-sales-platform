import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ProviderLauncherDryRunReport } from "../../application/ProviderLauncherDryRun.js";

export class FileProviderLauncherDryRunRepository {
  constructor(private readonly directory: string) {}

  pathFor(report: ProviderLauncherDryRunReport): string {
    return join(this.directory, `${report.provider}-launcher-dry-run-${report.reportId}.json`);
  }

  async save(report: ProviderLauncherDryRunReport): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const path = this.pathFor(report);
    await writeFile(path, JSON.stringify(report, null, 2), "utf8");
    return path;
  }
}
