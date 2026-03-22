import OpenAI from "openai";
import type { LlmProvider } from "./base.js";
import { ProviderFailure } from "./base.js";
import type { ProviderRequest, ProviderTextResponse } from "../types.js";

export class OpenAiProvider implements LlmProvider {
  public readonly providerName = "openai" as const;
  private readonly client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || undefined
    });
  }

  async generateText(request: ProviderRequest): Promise<ProviderTextResponse> {
    try {
      const response = await this.client.responses.create({
        model: request.model,
        input: [
          {
            role: "system",
            content: request.system
          },
          {
            role: "user",
            content: request.prompt
          }
        ],
        max_output_tokens: request.maxOutputTokens,
        temperature: request.temperature
      });

      return {
        text: response.output_text ?? "",
        provider: this.providerName,
        model: request.model
      };
    } catch (error: any) {
      const status = Number(error?.status ?? 0);
      const message = String(error?.message ?? "OpenAI request failed");
      if (status === 429 || /quota|rate limit/i.test(message)) {
        throw new ProviderFailure(message, "limited", true);
      }
      if (status >= 500) {
        throw new ProviderFailure(message, "down", true);
      }
      throw new ProviderFailure(message, "down", false);
    }
  }
}
