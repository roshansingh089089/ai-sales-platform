import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

export type DownloadArtifact = {
  filename: string;
  content: string;
  checksum: string;
  rowCount: number;
};

export type DownloadMetadata = {
  downloadId: string;
  automationJobId: string;
  provider: string;
  filename: string;
  checksum: string;
  archivedPath: string;
  rowCount: number;
  createdAt: string;
};

export class DownloadManager {
  private completed = 0;
  private failed = 0;

  constructor(
    private readonly downloadDirectory: string,
    private readonly archiveDirectory: string,
  ) {}

  async archive(automationJobId: string, provider: string, artifact: DownloadArtifact): Promise<DownloadMetadata> {
    try {
      await mkdir(this.downloadDirectory, { recursive: true });
      await mkdir(this.archiveDirectory, { recursive: true });
      const filename = sanitize(artifact.filename);
      const checksum = createHash("sha256").update(artifact.content).digest("hex");
      const tempPath = join(this.downloadDirectory, filename);
      const archivedPath = join(this.archiveDirectory, `${automationJobId}-${filename}`);
      await writeFile(tempPath, artifact.content);
      await rename(tempPath, archivedPath);
      this.completed += 1;
      return {
        downloadId: crypto.randomUUID(),
        automationJobId,
        provider,
        filename,
        checksum,
        archivedPath,
        rowCount: artifact.rowCount,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      this.failed += 1;
      throw error;
    }
  }

  status() {
    return {
      downloadDirectory: this.downloadDirectory,
      archiveDirectory: this.archiveDirectory,
      completed: this.completed,
      failed: this.failed,
    };
  }
}

function sanitize(filename: string): string {
  return basename(filename).replaceAll(/[^a-zA-Z0-9._-]/g, "_");
}
