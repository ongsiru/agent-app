import type { ModelAlias, ProviderStatus } from "../types.js";

type AliasHealth = {
  status: ProviderStatus;
  failCount: number;
  lastError?: string;
  disabledUntil?: number;
};

export class ProviderHealthRegistry {
  private readonly state = new Map<ModelAlias, AliasHealth>();

  constructor(aliases: ModelAlias[]) {
    for (const alias of aliases) {
      this.state.set(alias, { status: "healthy", failCount: 0 });
    }
  }

  getStatus(alias: ModelAlias): ProviderStatus {
    const current = this.state.get(alias);
    if (!current) return "down";
    if (current.disabledUntil && Date.now() > current.disabledUntil) {
      current.status = "healthy";
      current.failCount = 0;
      current.disabledUntil = undefined;
      current.lastError = undefined;
    }
    return current.status;
  }

  markSuccess(alias: ModelAlias): void {
    const current = this.state.get(alias);
    if (!current) return;
    current.status = "healthy";
    current.failCount = 0;
    current.disabledUntil = undefined;
    current.lastError = undefined;
  }

  markFailure(alias: ModelAlias, status: ProviderStatus, message: string): void {
    const current = this.state.get(alias);
    if (!current) return;

    current.failCount += 1;
    current.lastError = message;

    if (status === "limited" && current.failCount >= 2) {
      current.status = "down";
      current.disabledUntil = Date.now() + 10 * 60 * 1000;
      return;
    }

    current.status = status;
  }

  snapshot(): Record<string, AliasHealth> {
    return Object.fromEntries(this.state.entries());
  }
}
