import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ProviderDryRunReport } from "../../application/ProviderDryRun.js";

export class FileProviderDryRunRepository {
  constructor(private readonly directory: string) {}

  pathFor(report: ProviderDryRunReport): string {
    return join(this.directory, `${report.provider}-dry-run-${report.reportId}.json`);
  }

  async save(report: ProviderDryRunReport): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const path = this.pathFor(report);
    await writeFile(path, JSON.stringify(report, null, 2), "utf8");
    return path;
  }
}
