import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ProviderDiagnosticReport } from "../../application/ProviderDiagnostic.js";

export class FileProviderDiagnosticRepository {
  constructor(private readonly directory: string) {}

  pathFor(report: ProviderDiagnosticReport): string {
    return join(this.directory, `${report.provider}-${report.reportId}.json`);
  }

  async save(report: ProviderDiagnosticReport): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const path = this.pathFor(report);
    await writeFile(path, JSON.stringify(report, null, 2), "utf8");
    return path;
  }
}
