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

  it("generates artifacts for selected adapters", () => {
    const artifacts = buildArtifacts(defaultConfig);
    expect(artifacts.some((artifact) => artifact.path === "opencode/opencode.json")).toBe(true);
    expect(artifacts.some((artifact) => artifact.path === "README-install.md")).toBe(true);
    expect(artifacts.some((artifact) => artifact.path === "uac.config.json")).toBe(true);
  });

  it("estimates monthly cost deterministically", () => {
    expect(estimatedMonthlyCost(defaultConfig)).toBeGreaterThan(0);
  });
});
