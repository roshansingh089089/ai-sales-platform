import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type AutomationSession = {
  sessionId: string;
  provider: string;
  profilePath: string;
  healthy: boolean;
  restored: boolean;
};

export class SessionManager {
  constructor(private readonly sessionDirectory: string) {}

  async restore(provider: string): Promise<AutomationSession> {
    await mkdir(this.sessionDirectory, { recursive: true });
    const sessionId = `${provider}-default`;
    const profilePath = join(this.sessionDirectory, sessionId);
    await mkdir(profilePath, { recursive: true });
    const metadataPath = join(profilePath, "session.json");
    const existing = await this.readMetadata(metadataPath);
    const healthy = existing?.healthy ?? true;
    await writeFile(metadataPath, JSON.stringify({ provider, healthy, updatedAt: new Date().toISOString() }, null, 2));
    return { sessionId, provider, profilePath, healthy, restored: existing !== null };
  }

  async markUnhealthy(provider: string, reason: string): Promise<void> {
    const profilePath = join(this.sessionDirectory, `${provider}-default`);
    await mkdir(profilePath, { recursive: true });
    await writeFile(join(profilePath, "session.json"), JSON.stringify({ provider, healthy: false, reason }, null, 2));
  }

  async health() {
    await mkdir(this.sessionDirectory, { recursive: true });
    return { status: "UP", sessionDirectory: this.sessionDirectory };
  }

  private async readMetadata(path: string): Promise<{ healthy?: boolean } | null> {
    try {
      return JSON.parse(await readFile(path, "utf8")) as { healthy?: boolean };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}
