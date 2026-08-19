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
    tooltip: "Generates a native OpenCode JSON config and shared AGENTS.md. This mode stays plugin-free.",
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
    tooltip: "Adds the optional Oh My Openagent layer for background orchestration, concurrency caps, and circuit breakers.",
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
    tooltip: "Translates lanes into omp model roles such as default, smol, slow, plan, and advisor.",
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
    tooltip: "Emits Claude settings.json using the Anthropic-compatible OpenRouter endpoint, fallback models, and permission arrays.",
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
    tooltip: "Generates Codex TOML with provider transport, reasoning effort, subagent policy, and approval behavior.",
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
    notes: ["Uses the dedicated OpenRouter Cursor endpoint.", "Project rules and MCP are generated at repository scope."],
    logo: "/brand/cursor.svg",
    tooltip: "Creates scoped Cursor .mdc project rules, MCP config, and privacy-aware ignore patterns.",
    outputs: [
      { label: "Route", value: "routing rule" },
      { label: "Guardrail", value: ".cursorignore" },
      { label: "Context", value: "scoped MDC packs" },
    ],
  },
  aider: {
    name: "Aider",
    version: "0.86.0",
    files: [".aider.conf.yml"],
    installTarget: "Project root",
    notes: ["Supports main/editor model split and repo-map limits.", "Auto commits remain disabled by default."],
    logo: "/brand/aider.svg",
    tooltip: "Generates Aider's main/editor model split while keeping auto commits disabled.",
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
    tooltip: "Generates Goose's default/planner model split, turn cap, auto-compaction threshold, and tool flags.",
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
  openrouter: { logo: "/brand/openrouter.svg", tooltip: "One hosted marketplace key with broad model access. The default because it is broadly compatible and easy to validate." },
  cloudflare: { logo: "/brand/cloudflare.svg", tooltip: "Cloudflare edge control plane for caching, logging, DLP, retries, and rate limits. Requires an account-specific endpoint." },
  vercel: { logo: "/brand/vercel.svg", tooltip: "Vercel AI Gateway with provider/model strings, OIDC support, and spend visibility. Strongest for Vercel-hosted apps." },
  litellm: { logo: "/brand/litellm.svg", tooltip: "Self-hosted proxy with normalized model IDs, virtual keys, budgets, and ordered fallbacks. You operate the proxy." },
  portkey: { logo: "/brand/portkey.svg", tooltip: "Managed governance gateway with guardrails, audit, policy, and reusable failover config." },
};

export const laneTooltips: Record<RoutingLaneId, string> = {
  default: "The main coding lane for ordinary tool-driven work and orchestration.",
  background: "Cheap lane for titles, summaries, compaction, and bounded background work.",
  reasoning: "Deep planning lane for architecture, migrations, security-sensitive changes, and difficult debugging.",
  vision: "Multimodal lane for screenshots, diagrams, and image input.",
  analysis: "Toolless lane for long-form or sensitive-content analysis where edit and shell tools are disabled.",
};

export const performanceTooltips: Record<keyof WizardConfig["performance"], string> = {
  requestTimeoutSeconds: "Maximum time a full model request may take before failing over or retrying.",
  stalledStreamTimeoutSeconds: "How long a stream may remain silent before it is considered stalled.",
  retries: "Transport retry count. High values can amplify cost during provider outages.",
  mcpTimeoutSeconds: "Timeout for MCP server calls such as Context7.",
  concurrency: "Default parallel work budget across compatible agents and OMO.",
  compaction: "Automatically compact context when the window fills.",
  reasoningEffort: "Reasoning depth requested from models that expose reasoning controls.",
  toolOutputMaxLines: "Maximum lines of tool output retained in context.",
  toolOutputMaxBytes: "Maximum bytes of tool output retained in context.",
};

export const permissionTooltips: Record<keyof WizardConfig["permissions"], string> = {
  read: "Allow reading files. Read-only review lanes keep this enabled while edit and shell stay disabled.",
  edit: "Allow file edits. Disable for review, planning, or analysis-only workflows.",
  shell: "Allow shell command execution. This is the highest-risk coding tool.",
  browser: "Allow fetching web pages or browser-based tools.",
  webSearch: "Allow search queries.",
  confirmDestructiveCommands: "Require confirmation before destructive commands run. Keep enabled unless the environment is disposable.",
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
