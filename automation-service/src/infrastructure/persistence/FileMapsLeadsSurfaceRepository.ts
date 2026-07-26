import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { MapsLeadsSurfaceReport } from "../../application/MapsLeadsSurfaceDiscovery.js";

export class FileMapsLeadsSurfaceRepository {
  constructor(private readonly directory: string) {}
  pathFor(report: MapsLeadsSurfaceReport): string {
    return join(this.directory, `mapsleads-surface-${report.reportId}.json`);
  }
  async save(report: MapsLeadsSurfaceReport): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const path = this.pathFor(report);
    await writeFile(path, JSON.stringify(report, null, 2), "utf8");
    return path;
  }
}
