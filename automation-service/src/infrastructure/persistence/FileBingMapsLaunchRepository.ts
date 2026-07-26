import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { BingMapsLaunchReport } from "../../application/BingMapsLaunch.js";

export class FileBingMapsLaunchRepository {
  constructor(private readonly directory: string) {}

  pathFor(report: BingMapsLaunchReport): string {
    return join(this.directory, `mapsleads-bing-maps-launch-${report.reportId}.json`);
  }

  async save(report: BingMapsLaunchReport): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const path = this.pathFor(report);
    await writeFile(path, JSON.stringify(report, null, 2), "utf8");
    return path;
  }
}
