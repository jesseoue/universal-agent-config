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

  it("estimates monthly cost deterministically", () => {
    expect(estimatedMonthlyCost(defaultConfig)).toBeGreaterThan(0);
  });
});
