import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./base.js";
import { ProviderFailure } from "./base.js";
import type { ProviderRequest, ProviderTextResponse } from "../types.js";

export class AnthropicProvider implements LlmProvider {
  public readonly providerName = "anthropic" as const;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateText(request: ProviderRequest): Promise<ProviderTextResponse> {
    try {
      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxOutputTokens ?? 4000,
        system: request.system,
        messages: [
          {
            role: "user",
            content: request.prompt
          }
        ]
      });

      const text = response.content
        .map((part: any) => (part.type === "text" ? part.text : ""))
        .join("\n")
        .trim();

      return {
        text,
        provider: this.providerName,
        model: request.model
      };
    } catch (error: any) {
      const status = Number(error?.status ?? 0);
      const message = String(error?.message ?? "Anthropic request failed");
      if (status === 429 || /rate limit|quota|spend limit/i.test(message)) {
        throw new ProviderFailure(message, "limited", true);
      }
      if (status >= 500) {
        throw new ProviderFailure(message, "down", true);
      }
      throw new ProviderFailure(message, "down", false);
    }
  }
}
