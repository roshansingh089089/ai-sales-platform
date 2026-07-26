import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type BrowserProfileStatus = {
  profileDirectory: string;
  healthy: boolean;
  preferencesPath: string;
};

export class BrowserProfile {
  constructor(private readonly profileDirectory: string) {}

  path(): string {
    return this.profileDirectory;
  }

  async prepare(): Promise<BrowserProfileStatus> {
    await mkdir(this.profileDirectory, { recursive: true });
    const preferencesPath = join(this.profileDirectory, "runtime-preferences.json");
    const existing = await this.readPreferences(preferencesPath);
    await writeFile(
      preferencesPath,
      JSON.stringify({ ...existing, updatedAt: new Date().toISOString(), runtimeManaged: true }, null, 2),
    );
    return { profileDirectory: this.profileDirectory, healthy: true, preferencesPath };
  }

  async status(): Promise<BrowserProfileStatus> {
    await this.prepare();
    return {
      profileDirectory: this.profileDirectory,
      healthy: true,
      preferencesPath: join(this.profileDirectory, "runtime-preferences.json"),
    };
  }

  private async readPreferences(path: string): Promise<Record<string, unknown>> {
    try {
      return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }
}
