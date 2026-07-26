export type ExtensionLoadStatus = "CONFIGURED" | "LOADED" | "FAILED" | "NOT_CONFIGURED";

export type RegisteredExtension = {
  extensionId?: string;
  name: string;
  rawName?: string;
  defaultLocale?: string;
  version?: string;
  manifestVersion?: number;
  path: string;
  loadStatus: ExtensionLoadStatus;
  healthy: boolean;
  popupPath?: string;
  optionsPath?: string;
  backgroundPath?: string;
  serviceWorkerPath?: string;
  uiPath?: string;
  error?: string;
};

export class ExtensionRegistry {
  private readonly extensions = new Map<string, RegisteredExtension>();

  register(extension: RegisteredExtension): void {
    this.extensions.set(extension.path || "__not_configured__", extension);
  }

  list(): RegisteredExtension[] {
    return [...this.extensions.values()];
  }

  loaded(): RegisteredExtension[] {
    return this.list().filter((extension) => extension.loadStatus === "LOADED");
  }

  find(extensionId: string): RegisteredExtension | undefined {
    return this.list().find((extension) => extension.extensionId === extensionId);
  }

  health() {
    return {
      total: this.extensions.size,
      loaded: this.loaded().length,
      extensions: this.list(),
    };
  }
}
