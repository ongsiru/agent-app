import { GoogleGenAI } from "@google/genai";
import type { LlmProvider } from "./base.js";
import { ProviderFailure } from "./base.js";
import type { ProviderRequest, ProviderTextResponse } from "../types.js";

export class GoogleProvider implements LlmProvider {
  public readonly providerName = "google" as const;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateText(request: ProviderRequest): Promise<ProviderTextResponse> {
    try {
      const response = await this.client.models.generateContent({
        model: request.model,
        contents: `SYSTEM:\n${request.system}\n\nUSER:\n${request.prompt}`
      });

      return {
        text: response.text ?? "",
        provider: this.providerName,
        model: request.model
      };
    } catch (error: any) {
      const message = String(error?.message ?? "Google Gemini request failed");
      if (/rate limit|quota|resource exhausted|429/i.test(message)) {
        throw new ProviderFailure(message, "limited", true);
      }
      throw new ProviderFailure(message, "down", false);
    }
  }
}
