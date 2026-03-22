import type { ProviderRequest, ProviderTextResponse, ProviderStatus } from "../types.js";

export interface LlmProvider {
  readonly providerName: ProviderTextResponse["provider"];
  generateText(request: ProviderRequest): Promise<ProviderTextResponse>;
}

export class ProviderFailure extends Error {
  constructor(
    message: string,
    public readonly status: ProviderStatus,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "ProviderFailure";
  }
}
