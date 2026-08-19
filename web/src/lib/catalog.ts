import catalogJson from "@/data/catalog.json";
import type { AgentId, Catalog, RulePackId } from "@/lib/types";

export const catalog = catalogJson as unknown as Catalog;

export const modelById = new Map(catalog.models.map((model) => [model.id, model]));

export const routingProfileById = new Map(
  catalog.routing.profiles.map((profile) => [profile.id, profile]),
);

export const gatewayById = new Map(catalog.gateways.map((gateway) => [gateway.id, gateway]));

export const agentMetadata: Record<
  AgentId,
  { name: string; version: string; files: string[]; installTarget: string; notes: string[]; logo: string }
> = {
  opencode: {
    name: "OpenCode",
    version: "1.18.18",
    files: ["opencode.json", "AGENTS.md"],
    installTarget: "~/.config/opencode",
    notes: ["Native-first; no plugin dependency.", "Supports model, small model, agents, permissions, MCP, and compaction."],
    logo: "/brand/opencode.svg",
  },
  "opencode-omo": {
    name: "OpenCode + OMO",
    version: "4.19.4",
    files: ["opencode.json", "AGENTS.md", "omo.jsonc"],
    installTarget: "~/.config/opencode + ~/.omo",
    notes: ["Optional Oh My Openagent orchestration layer.", "Adds concurrency, tool-call caps, and circuit breakers."],
    logo: "/brand/opencode.svg",
  },
  omp: {
    name: "omp / Oh My Pi",
    version: "17.3.8",
    files: ["config.yml", "models.yml", "mcp.json"],
    installTarget: "~/.omp/agent",
    notes: ["Role-based model routing with fallback chains.", "Snapcompact and tool output limits are supported."],
    logo: "/brand/omp.svg",
  },
  "claude-code": {
    name: "Claude Code",
    version: "2.1.236",
    files: ["settings.json", "CLAUDE.md", ".mcp.json"],
    installTarget: "~/.claude",
    notes: ["Uses the Anthropic-compatible OpenRouter endpoint.", "Supports fallback and small-fast model roles."],
    logo: "/brand/claude-code.svg",
  },
  codex: {
    name: "Codex",
    version: "0.148.0",
    files: ["config.toml", "AGENTS.md"],
    installTarget: "~/.codex",
    notes: ["Uses OpenRouter through the Responses-compatible provider.", "Reasoning effort, verbosity, and subagent policy are supported."],
    logo: "/brand/codex.svg",
  },
  cursor: {
    name: "Cursor",
    version: "Current project rules / MCP",
    files: [".cursor/rules/*.mdc", ".cursor/mcp.json", ".cursorignore"],
    installTarget: "Project root",
    notes: ["Uses the dedicated OpenRouter Cursor endpoint.", "Project rules and MCP are generated at repository scope."],
    logo: "/brand/cursor.svg",
  },
  aider: {
    name: "Aider",
    version: "0.86.0",
    files: [".aider.conf.yml"],
    installTarget: "Project root",
    notes: ["Supports main/editor model split and repo-map limits.", "Auto commits remain disabled by default."],
    logo: "/brand/aider.svg",
  },
  goose: {
    name: "Goose",
    version: "1.46.0",
    files: ["config.yaml"],
    installTarget: "~/.config/goose",
    notes: ["Supports default/planner model split, max turns, and auto-compaction.", "Telemetry remains disabled."],
    logo: "/brand/goose.svg",
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
