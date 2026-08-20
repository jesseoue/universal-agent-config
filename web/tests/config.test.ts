import { describe, expect, it } from "vitest";
import { catalog } from "@/lib/catalog";
import { applyPreset, defaultConfig, estimatedMonthlyCost } from "@/lib/config";
import { buildArtifacts } from "@/lib/generate";
import { validateConfig } from "@/lib/validate";

describe("wizard configuration", () => {
  it("loads the committed catalog", () => {
    expect(catalog.models.length).toBeGreaterThan(10);
    expect(catalog.gateways).toHaveLength(5);
  });

  it("applies routing presets", () => {
    const config = applyPreset("low-cost", defaultConfig);
    expect(config.preset).toBe("low-cost");
    expect(config.lanes.default.primary).toBe("deepseek/deepseek-v4-flash-0731");
  });

  it("rejects toolless models in tool-driven lanes", () => {
    const config = structuredClone(defaultConfig);
    config.lanes.default.primary = "nousresearch/hermes-4-405b";
    const errors = validateConfig(config).filter((issue) => issue.severity === "error");
    expect(errors.some((issue) => issue.message.includes("does not support tool calls"))).toBe(true);
  });

  it("requires vision models in the vision lane", () => {
    const config = structuredClone(defaultConfig);
    config.lanes.vision.primary = "z-ai/glm-5.3";
    const errors = validateConfig(config).filter((issue) => issue.severity === "error");
    expect(errors.some((issue) => issue.message.includes("does not support vision"))).toBe(true);
  });

  it("blocks frontier models unless explicitly enabled", () => {
    const config = structuredClone(defaultConfig);
    config.lanes.reasoning.primary = "anthropic/claude-sonnet-5";
    const errors = validateConfig(config).filter((issue) => issue.severity === "error");
    expect(errors.some((issue) => issue.message.includes("frontier"))).toBe(true);
  });

  it("uses non-frontier default fallbacks", () => {
    expect(defaultConfig.frontier.enabled).toBe(false);
    expect(Object.values(defaultConfig.lanes).flatMap((lane) => [lane.primary, ...lane.fallbacks])).not.toContain("anthropic/claude-opus-5");
  });

  it("generates artifacts for selected adapters", () => {
    const artifacts = buildArtifacts(defaultConfig);
    expect(artifacts.some((artifact) => artifact.path === "opencode/opencode.json")).toBe(true);
    expect(artifacts.some((artifact) => artifact.path === "README-install.md")).toBe(true);
    expect(artifacts.some((artifact) => artifact.path === "uac.config.json")).toBe(true);
    const allAgents = structuredClone(defaultConfig);
    allAgents.agents = ["opencode", "opencode-omo", "omp", "claude-code", "codex", "cursor", "aider", "goose"];
    const allArtifacts = buildArtifacts(allAgents);
    expect(allArtifacts.some((artifact) => artifact.path === "opencode-omo/omo.jsonc")).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.path === "omp/models.yml")).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.path === "cursor/.cursor/mcp.json")).toBe(true);
    expect(allArtifacts.some((artifact) => artifact.contents.includes("data_collection: deny"))).toBe(true);
  });

  it("does not duplicate OpenCode files when OMO is selected", () => {
    const config = structuredClone(defaultConfig);
    config.agents = ["opencode", "opencode-omo"];
    const artifacts = buildArtifacts(config);
    expect(artifacts.filter((artifact) => artifact.path.endsWith("opencode.json"))).toHaveLength(1);
    expect(artifacts.some((artifact) => artifact.path === "opencode-omo/opencode.json")).toBe(true);
    expect(artifacts.some((artifact) => artifact.path === "opencode/opencode.json")).toBe(false);
  });

  it("uses lane-specific fallbacks in generated OpenRouter model policy", () => {
    const config = structuredClone(defaultConfig);
    config.agents = ["opencode"];
    const artifact = buildArtifacts(config).find((item) => item.path === "opencode/opencode.json");
    const parsed = JSON.parse(artifact?.contents ?? "{}");
    const models = parsed.provider.openrouter.models;
    expect(models[config.lanes.background.primary].models.map((item: { id: string }) => item.id))
      .toEqual(config.lanes.background.fallbacks);
    expect(models[config.lanes.reasoning.primary].models.map((item: { id: string }) => item.id))
      .toEqual(config.lanes.reasoning.fallbacks);
  });

  it("highlights Cursor usage pricing and the compatibility endpoint", () => {
    const config = structuredClone(defaultConfig);
    config.agents = ["cursor"];
    const artifacts = buildArtifacts(config);
    const routingRule = artifacts.find((artifact) => artifact.path === "cursor/.cursor/rules/01-model-routing.mdc");
    expect(routingRule?.contents).toContain("$0.25 per million tokens");
    expect(routingRule?.contents).toContain("https://openrouter.ai/api/v1/cursor");
    expect(routingRule?.contents).toContain("flat tool-call format");
  });

  it("generates Cursor project rules from selected rule packs", () => {
    const config = structuredClone(defaultConfig);
    config.agents = ["cursor"];
    config.rulePacks = ["core", "model-routing", "testing", "typescript"];
    const artifacts = buildArtifacts(config);
    const rulePaths = artifacts
      .filter((artifact) => artifact.path.startsWith("cursor/.cursor/rules/"))
      .map((artifact) => artifact.path);

    expect(rulePaths).toEqual([
      "cursor/.cursor/rules/00-universal-agent-core.mdc",
      "cursor/.cursor/rules/01-model-routing.mdc",
      "cursor/.cursor/rules/03-testing.mdc",
      "cursor/.cursor/rules/04-typescript.mdc",
    ]);

    const testingRule = artifacts.find((artifact) => artifact.path === "cursor/.cursor/rules/03-testing.mdc");
    expect(testingRule?.contents).toContain("alwaysApply: false");
    expect(testingRule?.contents).toContain("globs: **/test*");

    const coreRule = artifacts.find((artifact) => artifact.path === "cursor/.cursor/rules/00-universal-agent-core.mdc");
    expect(coreRule?.contents).toContain("alwaysApply: true");
  });

  it("keeps Cursor MCP and ignore output native and secret-safe", () => {
    const config = structuredClone(defaultConfig);
    config.agents = ["cursor"];
    const artifacts = buildArtifacts(config);
    const mcp = JSON.parse(artifacts.find((artifact) => artifact.path === "cursor/.cursor/mcp.json")?.contents ?? "{}");
    const ignore = artifacts.find((artifact) => artifact.path === "cursor/.cursorignore")?.contents ?? "";

    expect(mcp.mcpServers.context7).toEqual({
      url: "https://mcp.context7.com/mcp",
      headers: { CONTEXT7_API_KEY: "${env:CONTEXT7_API_KEY}" },
    });
    expect(ignore).toContain(".env*");
    expect(ignore).toContain("**/*.pem");
    expect(ignore).toContain("node_modules/");
    expect(ignore).toContain(".next/");
  });

  it("estimates monthly cost deterministically", () => {
    expect(estimatedMonthlyCost(defaultConfig)).toBeGreaterThan(0);
  });
});
