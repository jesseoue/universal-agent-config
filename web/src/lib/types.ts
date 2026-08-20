export type AgentId =
  | "opencode"
  | "opencode-omo"
  | "omp"
  | "claude-code"
  | "codex"
  | "cursor"
  | "aider"
  | "goose";

export type GatewayId = "openrouter" | "cloudflare" | "vercel" | "litellm" | "portkey";
export type RoutingLaneId = "default" | "background" | "reasoning" | "vision" | "analysis";
export type ProviderStrategy = "auto" | "latency" | "throughput" | "price";
export type VerificationMode = "required" | "planning-only" | "off";
export type RulePackId =
  | "core"
  | "model-routing"
  | "planning"
  | "testing"
  | "typescript"
  | "python"
  | "documentation"
  | "security-review";

export interface WizardConfig {
  version: 1;
  preset: string;
  agents: AgentId[];
  gateway: GatewayId;
  lanes: Record<RoutingLaneId, { primary: string; fallbacks: string[]; custom?: boolean }>;
  permissions: {
    read: boolean;
    edit: boolean;
    shell: boolean;
    browser: boolean;
    webSearch: boolean;
    confirmDestructiveCommands: boolean;
  };
  tools: { context7: boolean };
  routing: {
    providerStrategy: ProviderStrategy;
    allowProviderFallbacks: boolean;
    requireParameters: boolean;
    denyDataCollection: boolean;
    preferZeroDataRetention: boolean;
  };
  frontier: {
    enabled: boolean;
    triggerAfterFailedAttempts: number;
    highBlastRadiusOnly: boolean;
  };
  verification: {
    mode: VerificationMode;
    readOnlyPlanning: boolean;
    targetedCommands: boolean;
    oneFocusedRetry: boolean;
  };
  performance: {
    requestTimeoutSeconds: number;
    stalledStreamTimeoutSeconds: number;
    retries: number;
    mcpTimeoutSeconds: number;
    concurrency: number;
    compaction: boolean;
    reasoningEffort: "minimal" | "low" | "medium" | "high" | "max";
    toolOutputMaxLines: number;
    toolOutputMaxBytes: number;
  };
  rulePacks: RulePackId[];
}

export interface ModelRecord {
  id: string;
  displayName: string;
  family: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsTools: boolean;
  supportsVision: boolean;
  reasoning: boolean;
  frontier: boolean;
  supportedParameters: string[];
  reasoningEfforts: string[];
  defaultReasoningEffort: string | null;
  catalogCreated: number | null;
  providers: string[];
  lane: string | null;
  liveVerified: string;
  pricing: { inputPerMillion: number; outputPerMillion: number } | null;
}

export interface Catalog {
  version: number;
  updated: string;
  models: ModelRecord[];
  routing: {
    defaultProfile: string;
    profiles: Array<{
      id: string;
      description: string;
      roles: Record<string, { primary: string; fallbacks: string[] }>;
    }>;
  };
  policy: Record<string, unknown>;
  gateways: Array<{
    id: GatewayId;
    name: string;
    category: string;
    protocol: string;
    model_format: string;
    api_key_env: string;
    best_for: string[];
    caveats: string[];
  }>;
  defaultGateway: GatewayId;
  tools: Record<string, unknown>;
  starters: Record<string, unknown>;
}

export interface GeneratedArtifact {
  path: string;
  contents: string;
  language: "json" | "yaml" | "toml" | "markdown" | "text";
  adapter: AgentId | "shared" | "gateway";
  description: string;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  affectedOption: string;
  suggestedFix?: string;
}
