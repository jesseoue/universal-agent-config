import { catalog, modelById, presetMetadata, routingProfileById } from "@/lib/catalog";
import type { AgentId, RoutingLaneId, WizardConfig } from "@/lib/types";

export const laneLabels: Record<RoutingLaneId, string> = {
  default: "Daily lead",
  background: "Background",
  reasoning: "Reasoning / planning",
  vision: "Vision",
  analysis: "Toolless analysis",
};

export const defaultConfig: WizardConfig = {
  version: 1,
  preset: "balanced",
  agents: ["opencode"],
  gateway: "openrouter",
  lanes: {
    default: { primary: "z-ai/glm-5.3", fallbacks: ["moonshotai/kimi-k2.7-code", "poolside/laguna-s-2.1"] },
    background: { primary: "poolside/laguna-s-2.1", fallbacks: ["deepseek/deepseek-v4-flash-0731", "google/gemini-3.7-flash"] },
    reasoning: { primary: "deepseek/deepseek-v4-pro-0813", fallbacks: ["z-ai/glm-5.3", "moonshotai/kimi-k2.7-code"] },
    vision: { primary: "google/gemini-3.7-flash", fallbacks: ["qwen/qwen3.8-max", "minimax/minimax-m3"] },
    analysis: { primary: "nousresearch/hermes-4-405b", fallbacks: ["cognitivecomputations/dolphin-mistral-24b-venice-edition"] },
  },
  permissions: {
    read: true,
    edit: true,
    shell: true,
    browser: true,
    webSearch: true,
    confirmDestructiveCommands: true,
  },
  tools: { context7: true },
  routing: {
    providerStrategy: "latency",
    allowProviderFallbacks: true,
    requireParameters: true,
    denyDataCollection: true,
    preferZeroDataRetention: true,
  },
  frontier: {
    enabled: false,
    triggerAfterFailedAttempts: 2,
    highBlastRadiusOnly: true,
  },
  verification: {
    mode: "required",
    readOnlyPlanning: true,
    targetedCommands: true,
    oneFocusedRetry: true,
  },
  performance: {
    requestTimeoutSeconds: 300,
    stalledStreamTimeoutSeconds: 60,
    retries: 5,
    mcpTimeoutSeconds: 30,
    concurrency: 10,
    compaction: true,
    reasoningEffort: "high",
    toolOutputMaxLines: 300,
    toolOutputMaxBytes: 12000,
  },
  rulePacks: ["core", "model-routing", "planning", "testing"],
};

export function applyPreset(presetId: string, config: WizardConfig = defaultConfig): WizardConfig {
  const profile = routingProfileById.get(presetId);
  if (!profile) throw new Error(`Unknown routing profile: ${presetId}`);

  return {
    ...config,
    preset: presetId,
    permissions: presetId === "content-analysis"
      ? { ...config.permissions, edit: false, shell: false, browser: false, webSearch: false }
      : { ...defaultConfig.permissions },
    lanes: {
      default: { ...profile.roles.default },
      background: { ...profile.roles.background },
      reasoning: { ...profile.roles.reasoning },
      vision: { ...profile.roles.vision },
      analysis: {
        primary: modelById.get("nousresearch/hermes-4-405b") ? "nousresearch/hermes-4-405b" : profile.roles.default.primary,
        fallbacks: ["cognitivecomputations/dolphin-mistral-24b-venice-edition"],
      },
    },
    routing: { ...defaultConfig.routing },
    frontier: {
      ...defaultConfig.frontier,
      enabled: presetId === "frontier",
    },
    verification: { ...defaultConfig.verification },
  };
}

export function estimatedMonthlyCost(config: WizardConfig): number {
  const inputTokens = 10_000_000;
  const outputTokens = 1_000_000;
  const laneWeights: Array<[RoutingLaneId, number]> = [
    ["default", 0.65],
    ["reasoning", 0.15],
    ["background", 0.1],
    ["vision", 0.05],
    ["analysis", 0.05],
  ];

  return laneWeights.reduce((total, [lane, weight]) => {
    const model = modelById.get(config.lanes[lane].primary);
    if (!model?.pricing) return total;
    return total + (inputTokens * weight * model.pricing.inputPerMillion + outputTokens * weight * model.pricing.outputPerMillion) / 1_000_000;
  }, 0);
}

export function recommendedAgentsForPreset(presetId: string): AgentId[] {
  return presetMetadata[presetId]?.recommendedAgents ?? ["opencode"];
}

export function compatibilityVersions(): Record<string, string> {
  return {
    catalogUpdated: catalog.updated,
  };
}
