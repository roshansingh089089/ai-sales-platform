import { LeadAutomationProvider } from "./LeadAutomationProvider.js";
import { ProviderDiagnostic, supportsProviderDiagnostics } from "./ProviderDiagnostic.js";
import { ProviderDryRun, supportsProviderDryRun } from "./ProviderDryRun.js";
import { ProviderLauncherDryRun, supportsProviderLauncherDryRun } from "./ProviderLauncherDryRun.js";

export class ProviderManager {
  private readonly providers = new Map<string, LeadAutomationProvider>();

  register(provider: LeadAutomationProvider): void {
    this.providers.set(provider.name(), provider);
  }

  resolve(name: string): LeadAutomationProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Automation provider is not registered: ${name}`);
    return provider;
  }

  resolveDiagnostic(name: string): LeadAutomationProvider & ProviderDiagnostic {
    const provider = this.resolve(name);
    if (!supportsProviderDiagnostics(provider)) throw new Error(`Automation provider does not support diagnostics: ${name}`);
    return provider;
  }

  resolveDryRun(name: string): LeadAutomationProvider & ProviderDryRun {
    const provider = this.resolve(name);
    if (!supportsProviderDryRun(provider)) throw new Error(`Automation provider does not support dry runs: ${name}`);
    return provider;
  }

  resolveLauncherDryRun(name: string): LeadAutomationProvider & ProviderLauncherDryRun {
    const provider = this.resolve(name);
    if (!supportsProviderLauncherDryRun(provider)) {
      throw new Error(`Automation provider does not support launcher dry runs: ${name}`);
    }
    return provider;
  }

  health(): Array<{ provider: string; available: boolean }> {
    return [...this.providers.values()].map((provider) => ({ provider: provider.name(), available: true }));
  }
}
