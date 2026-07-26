import { access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { BrowserRuntime } from "./BrowserRuntime.js";

export class BrowserHealthChecker {
  constructor(
    private readonly runtime: BrowserRuntime,
    private readonly downloadDirectory: string,
  ) {}

  async check() {
    await mkdir(this.downloadDirectory, { recursive: true });
    const runtimeStatus = await this.runtime.status();
    let downloadsWritable = true;
    try {
      await access(this.downloadDirectory, constants.W_OK);
    } catch {
      downloadsWritable = false;
    }
    return {
      browserRunning: runtimeStatus.running,
      extensionLoaded: runtimeStatus.extensions.loaded > 0 || runtimeStatus.extensions.total === 0,
      downloadsWritable,
      profileHealthy: runtimeStatus.profile.healthy,
      tabsHealthy: (runtimeStatus.tabs?.orphanTabs ?? 0) === 0,
      runtime: runtimeStatus,
    };
  }
}
