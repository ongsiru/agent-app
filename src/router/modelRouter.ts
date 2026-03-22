import { modelCatalog, roleAssignments } from "../config/models.js";
import type {
  AgentRole,
  ModelAlias,
  ProviderName
} from "../types.js";
import { ProviderFailure, type LlmProvider } from "../providers/base.js";
import { ProviderHealthRegistry } from "../runtime/providerHealth.js";

export type RoutedGenerationResult = {
  text: string;
  alias: ModelAlias;
  provider: ProviderName;
  model: string;
};

export class ModelRouter {
  constructor(
    private readonly providers: Record<ProviderName, LlmProvider | null>,
    private readonly health: ProviderHealthRegistry
  ) {}

  private orderedAliases(role: AgentRole, round: number): ModelAlias[] {
    const assignment = roleAssignments[role];
    const rotated = round % 2 === 1 ? assignment.primary : assignment.secondary;
    const alternate = round % 2 === 1 ? assignment.secondary : assignment.primary;
    return Array.from(new Set([rotated, alternate, assignment.emergency]));
  }

  async generateForRole(args: {
    role: AgentRole;
    round: number;
    system: string;
    prompt: string;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<RoutedGenerationResult> {
    const candidates = this.orderedAliases(args.role, args.round);

    const errors: string[] = [];

    for (const alias of candidates) {
      const binding = modelCatalog[alias];
      if (!binding.enabled) {
        errors.push(`${alias}: not configured`);
        continue;
      }

      const status = this.health.getStatus(alias);
      if (status === "down") {
        errors.push(`${alias}: temporarily disabled`);
        continue;
      }

      const provider = this.providers[binding.provider];
      if (!provider) {
        errors.push(`${alias}: provider unavailable`);
        continue;
      }

      try {
        const response = await provider.generateText({
          model: binding.model,
          system: args.system,
          prompt: args.prompt,
          maxOutputTokens: args.maxOutputTokens,
          temperature: args.temperature
        });
        this.health.markSuccess(alias);
        return {
          text: response.text,
          alias,
          provider: response.provider,
          model: response.model
        };
      } catch (error) {
        if (error instanceof ProviderFailure) {
          this.health.markFailure(alias, error.status, error.message);
          errors.push(`${alias}: ${error.message}`);
          continue;
        }
        errors.push(`${alias}: ${String(error)}`);
      }
    }

    throw new Error(
      `No available model could serve role "${args.role}". Candidates tried: ${errors.join(" | ")}`
    );
  }
}
