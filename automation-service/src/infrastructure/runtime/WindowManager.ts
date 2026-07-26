export type WindowMode = "headed" | "headless-prepared";

export class WindowManager {
  constructor(private readonly headless: boolean) {}

  mode(): WindowMode {
    return this.headless ? "headless-prepared" : "headed";
  }

  launchOptions() {
    return {
      headless: this.headless,
      viewport: { width: 1440, height: 1000 },
    };
  }

  status() {
    return {
      mode: this.mode(),
      headedDevelopmentSupported: true,
      headlessFutureSupported: true,
    };
  }
}
