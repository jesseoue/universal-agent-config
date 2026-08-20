import catalogJson from "@/data/catalog.json";
import type { AgentId, Catalog, GatewayId, RoutingLaneId, RulePackId, WizardConfig } from "@/lib/types";

export const catalog = catalogJson as unknown as Catalog;

export const modelById = new Map(catalog.models.map((model) => [model.id, model]));

export const routingProfileById = new Map(
  catalog.routing.profiles.map((profile) => [profile.id, profile]),
);

export const gatewayById = new Map(catalog.gateways.map((gateway) => [gateway.id, gateway]));

export const agentMetadata: Record<
  AgentId,
  {
    name: string;
    version: string;
    files: string[];
    installTarget: string;
    notes: string[];
    logo: string;
    tooltip: string;
    outputs: Array<{ label: string; value: string }>;
  }
> = {
  opencode: {
    name: "OpenCode",
    version: "1.18.18",
    files: ["opencode.json", "AGENTS.md"],
    installTarget: "~/.config/opencode",
    notes: ["Native-first; no plugin dependency.", "Supports model, small model, agents, permissions, MCP, and compaction."],
    logo: "/brand/opencode.svg",
    tooltip: "Native JSON + AGENTS.md. Plugin-free.",
    outputs: [
      { label: "Route", value: "model + small_model" },
      { label: "Guardrail", value: "permission map" },
      { label: "Context", value: "auto compaction + pruning" },
    ],
  },
  "opencode-omo": {
    name: "OpenCode + OMO",
    version: "4.19.4",
    files: ["opencode.json", "AGENTS.md", "omo.jsonc"],
    installTarget: "~/.config/opencode + ~/.omo",
    notes: ["Optional Oh My Openagent orchestration layer.", "Adds concurrency, tool-call caps, and circuit breakers."],
    logo: "/brand/opencode.svg",
    tooltip: "Adds OMO orchestration and loop guards.",
    outputs: [
      { label: "Route", value: "model + small_model" },
      { label: "Guardrail", value: "OMO circuit breaker" },
      { label: "Context", value: "background task caps" },
    ],
  },
  omp: {
    name: "omp / Oh My Pi",
    version: "17.3.8",
    files: ["config.yml", "models.yml", "mcp.json"],
    installTarget: "~/.omp/agent",
    notes: ["Role-based model routing with fallback chains.", "Snapcompact and tool output limits are supported."],
    logo: "/brand/omp.svg",
    tooltip: "Maps lanes to omp model roles.",
    outputs: [
      { label: "Route", value: "modelRoles" },
      { label: "Guardrail", value: "approval mode" },
      { label: "Context", value: "snapcompact" },
    ],
  },
  "claude-code": {
    name: "Claude Code",
    version: "2.1.236",
    files: ["settings.json", "CLAUDE.md", ".mcp.json"],
    installTarget: "~/.claude",
    notes: ["Uses the Anthropic-compatible OpenRouter endpoint.", "Supports fallback and small-fast model roles."],
    logo: "/brand/claude-code.svg",
    tooltip: "Emits Claude settings, fallback, and permissions.",
    outputs: [
      { label: "Route", value: "model + fallbackModel" },
      { label: "Guardrail", value: "permissions allow/deny" },
      { label: "Context", value: "auto-compact window" },
    ],
  },
  codex: {
    name: "Codex",
    version: "0.148.0",
    files: ["config.toml", "AGENTS.md"],
    installTarget: "~/.codex",
    notes: ["Uses OpenRouter through the Responses-compatible provider.", "Reasoning effort, verbosity, and subagent policy are supported."],
    logo: "/brand/codex.svg",
    tooltip: "Emits Codex provider, reasoning, and approval policy.",
    outputs: [
      { label: "Route", value: "model_providers" },
      { label: "Guardrail", value: "approval_policy" },
      { label: "Context", value: "reasoning + verbosity" },
    ],
  },
  cursor: {
    name: "Cursor",
    version: "Current project rules / MCP",
    files: [".cursor/rules/*.mdc", ".cursor/mcp.json", ".cursorignore"],
    installTarget: "Project root",
    notes: [
      "Uses the dedicated OpenRouter Cursor endpoint for tool-call compatibility.",
      "Cursor Teams/Enterprise usage is $0.25 per million tokens, even with BYOK.",
      "Project rules and MCP are generated at repository scope.",
    ],
    logo: "/brand/cursor.svg",
    tooltip: "Creates Cursor rules, MCP, and ignore policy.",
    outputs: [
      { label: "Route", value: "routing rule" },
      { label: "Cursor usage", value: "$0.25 / 1M tokens" },
      { label: "Endpoint", value: "/api/v1/cursor" },
      { label: "Guardrail", value: ".cursorignore" },
    ],
  },
  aider: {
    name: "Aider",
    version: "0.86.0",
    files: [".aider.conf.yml"],
    installTarget: "Project root",
    notes: ["Supports main/editor model split and repo-map limits.", "Auto commits remain disabled by default."],
    logo: "/brand/aider.svg",
    tooltip: "Sets Aider model split. Commits stay off.",
    outputs: [
      { label: "Route", value: "model + editor-model" },
      { label: "Guardrail", value: "auto-commits off" },
      { label: "Context", value: "repo map limit" },
    ],
  },
  goose: {
    name: "Goose",
    version: "1.46.0",
    files: ["config.yaml"],
    installTarget: "~/.config/goose",
    notes: ["Supports default/planner model split, max turns, and auto-compaction.", "Telemetry remains disabled."],
    logo: "/brand/goose.svg",
    tooltip: "Sets Goose models, turn cap, and compaction.",
    outputs: [
      { label: "Route", value: "default + planner" },
      { label: "Guardrail", value: "GOOSE_MAX_TURNS" },
      { label: "Context", value: "auto-compact threshold" },
    ],
  },
};

export const presetMetadata: Record<string, { name: string; goal: string; costPosture: string; safetyPosture: string; recommendedAgents: AgentId[] }> = {
  balanced: {
    name: "Balanced",
    goal: "Cost-aware daily coding with deliberate escalation.",
    costPosture: "Low-to-medium by default",
    safetyPosture: "Conservative permissions and confirmed destructive commands",
    recommendedAgents: ["opencode", "codex", "claude-code"],
  },
  "open-weight": {
    name: "Open-weight",
    goal: "Prefer open-weight models with frontier fallback.",
    costPosture: "Medium",
    safetyPosture: "Standard tool permissions",
    recommendedAgents: ["opencode", "goose", "aider"],
  },
  "low-cost": {
    name: "Low-cost",
    goal: "High-volume coding with cheap lanes first.",
    costPosture: "Lowest",
    safetyPosture: "Standard tool permissions",
    recommendedAgents: ["aider", "goose", "omp"],
  },
  frontier: {
    name: "Frontier",
    goal: "Maximum quality when spend is explicitly accepted.",
    costPosture: "Highest",
    safetyPosture: "Requires explicit frontier escalation",
    recommendedAgents: ["claude-code", "codex", "cursor"],
  },
  "content-analysis": {
    name: "Content analysis",
    goal: "Toolless long-form and sensitive-content analysis.",
    costPosture: "Medium",
    safetyPosture: "No edit, shell, browser, or web-search tools",
    recommendedAgents: ["opencode", "omp"],
  },
};


export const gatewayMetadata: Record<GatewayId, { logo: string; tooltip: string }> = {
  openrouter: { logo: "/brand/openrouter.svg", tooltip: "One marketplace key. Broad model access." },
  cloudflare: { logo: "/brand/cloudflare.svg", tooltip: "Edge routing, caching, and DLP." },
  vercel: { logo: "/brand/vercel.svg", tooltip: "Vercel-native gateway and spend view." },
  litellm: { logo: "/brand/litellm.svg", tooltip: "Self-hosted proxy. You control keys." },
  portkey: { logo: "/brand/portkey.svg", tooltip: "Managed routing, guardrails, and audit." },
};

export const laneTooltips: Record<RoutingLaneId, string> = {
  default: "Main lane for tool-driven coding.",
  background: "Cheap lane for summaries and compaction.",
  reasoning: "Deep planning and hard debugging.",
  vision: "Screenshots and image input.",
  analysis: "Toolless long-form analysis.",
};

export const routingTooltips: Record<keyof WizardConfig["routing"], string> = {
  providerStrategy: "OpenRouter sorts matching providers by latency, throughput, or price.",
  allowProviderFallbacks: "Fall back to other qualified OpenRouter providers.",
  requireParameters: "Only use providers that support the requested parameters.",
  denyDataCollection: "Prevent providers from using requests for training.",
  preferZeroDataRetention: "Prefer providers with zero-data-retention guarantees.",
};

export const frontierTooltips: Record<keyof WizardConfig["frontier"], string> = {
  enabled: "Explicit opt-in before frontier-priced models can be selected.",
  triggerAfterFailedAttempts: "Cheap-lane attempts before escalation is considered.",
  highBlastRadiusOnly: "Restrict escalation to architecturally risky work.",
};

export const verificationTooltips: Record<keyof WizardConfig["verification"], string> = {
  mode: "Required means every change reports targeted verification.",
  readOnlyPlanning: "Plan without edits before implementation spend.",
  targetedCommands: "Run the narrowest useful checks first.",
  oneFocusedRetry: "Retry once with a corrected prompt before escalation.",
};

export const performanceTooltips: Record<keyof WizardConfig["performance"], string> = {
  requestTimeoutSeconds: "Maximum time per model request.",
  stalledStreamTimeoutSeconds: "Silence limit before a stream stalls.",
  retries: "Transport retry count.",
  mcpTimeoutSeconds: "Timeout for MCP calls.",
  concurrency: "Parallel work budget.",
  compaction: "Compact context automatically.",
  reasoningEffort: "Reasoning depth when supported.",
  toolOutputMaxLines: "Tool output line cap.",
  toolOutputMaxBytes: "Tool output byte cap.",
};

export const permissionTooltips: Record<keyof WizardConfig["permissions"], string> = {
  read: "Read files and code.",
  edit: "Edit files. Disable for review.",
  shell: "Run shell commands. Highest risk.",
  browser: "Fetch pages.",
  webSearch: "Run web searches.",
  confirmDestructiveCommands: "Confirm before destructive commands.",
};

export const modelFamilyLogos: Record<string, string> = {
  anthropic: "/brand/anthropic.svg",
  openai: "/brand/openai.svg",
  google: "/brand/google.svg",
  gemini: "/brand/gemini.svg",
  deepseek: "/brand/deepseek.svg",
  qwen: "/brand/qwen.svg",
  moonshot: "/brand/moonshot.svg",
  mistral: "/brand/mistral.svg",
  opencode: "/brand/opencode.svg",
  cursor: "/brand/cursor.svg",
  cloudflare: "/brand/cloudflare.svg",
  vercel: "/brand/vercel.svg",
  openrouter: "/brand/openrouter.svg",
  litellm: "/brand/litellm.svg",
  portkey: "/brand/portkey.svg",
};

export const rulePacks: Array<{ id: RulePackId; name: string; description: string; alwaysApply: boolean }> = [
  { id: "core", name: "Universal core", description: "Shared agent behavior and verification policy.", alwaysApply: true },
  { id: "model-routing", name: "Model routing", description: "Lane selection and escalation policy.", alwaysApply: true },
  { id: "planning", name: "Planning", description: "Read-first planning and bounded implementation.", alwaysApply: false },
  { id: "testing", name: "Testing", description: "Targeted verification before handoff.", alwaysApply: false },
  { id: "typescript", name: "TypeScript", description: "TypeScript and React quality rules.", alwaysApply: false },
  { id: "python", name: "Python", description: "Python testing and packaging rules.", alwaysApply: false },
  { id: "documentation", name: "Documentation", description: "Documentation-first changes.", alwaysApply: false },
  { id: "security-review", name: "Security review", description: "Security review and threat modeling.", alwaysApply: false },
];
