import { catalog, modelById } from "@/lib/catalog";
import type { RoutingLaneId, ValidationIssue, WizardConfig } from "@/lib/types";

export function validateConfig(config: WizardConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const frontierIds = new Set(catalog.models.filter((model) => model.frontier).map((model) => model.id));

  if (config.agents.length === 0) {
    issues.push({
      severity: "error",
      message: "Select at least one coding agent.",
      affectedOption: "agents",
      suggestedFix: "Add OpenCode, Claude Code, Codex, or another supported agent.",
    });
  }

  const lanes: RoutingLaneId[] = ["default", "background", "reasoning", "vision", "analysis"];
  for (const lane of lanes) {
    const selection = config.lanes[lane];
    const primary = modelById.get(selection.primary);

    if (!primary) {
      issues.push({
        severity: "warning",
        message: `${selection.primary} is not in the verified catalog.`,
        affectedOption: `lanes.${lane}.primary`,
        suggestedFix: "Verify the model ID and capability before using it.",
      });
    } else {
      if (lane !== "analysis" && !primary.supportsTools) {
        issues.push({
          severity: "error",
          message: `${primary.displayName} does not support tool calls and cannot lead the ${lane} lane.`,
          affectedOption: `lanes.${lane}.primary`,
          suggestedFix: "Choose a tool-capable model or use the analysis lane.",
        });
      }
      if (lane === "vision" && !primary.supportsVision) {
        issues.push({
          severity: "error",
          message: `${primary.displayName} does not support vision input.`,
          affectedOption: "lanes.vision.primary",
          suggestedFix: "Choose a vision-capable model such as Gemini 3.7 Flash.",
        });
      }
    }

    const uniqueFallbacks = new Set(selection.fallbacks);
    if (uniqueFallbacks.size !== selection.fallbacks.length) {
      issues.push({
        severity: "warning",
        message: "Duplicate fallback models were removed.",
        affectedOption: `lanes.${lane}.fallbacks`,
        suggestedFix: "Keep each fallback model only once.",
      });
    }

    for (const fallbackId of selection.fallbacks) {
      const fallback = modelById.get(fallbackId);
      if (!fallback) {
        issues.push({
          severity: "warning",
          message: `${fallbackId} is not in the verified catalog.`,
          affectedOption: `lanes.${lane}.fallbacks`,
          suggestedFix: "Verify the model ID and capability before using it.",
        });
      } else if (lane !== "analysis" && !fallback.supportsTools) {
        issues.push({
          severity: "error",
          message: `${fallback.displayName} cannot be a ${lane}-lane fallback because it does not support tool calls.`,
          affectedOption: `lanes.${lane}.fallbacks`,
          suggestedFix: "Remove it or move it to the analysis lane.",
        });
      }

      if (!config.frontier.enabled && frontierIds.has(fallbackId)) {
        issues.push({
          severity: "error",
          message: `${fallbackId} is a frontier model, but frontier escalation is not enabled.`,
          affectedOption: `lanes.${lane}.fallbacks`,
          suggestedFix: "Enable frontier escalation or choose a non-frontier fallback.",
        });
      }
    }

    if (!config.frontier.enabled && frontierIds.has(selection.primary)) {
      issues.push({
        severity: "error",
        message: `${selection.primary} is a frontier model, but frontier escalation is not enabled.`,
        affectedOption: `lanes.${lane}.primary`,
        suggestedFix: "Enable frontier escalation or choose a non-frontier model.",
      });
    }

    if (lane === "reasoning" && primary?.reasoning && primary.reasoningEfforts.length > 0) {
      const effort = config.performance.reasoningEffort;
      const aliases: Record<string, string> = { minimal: "low" };
      const normalized = aliases[effort] ?? effort;
      if (!primary.reasoningEfforts.includes(normalized)) {
        issues.push({
          severity: "error",
          message: `${primary.displayName} does not support ${effort} reasoning effort.`,
          affectedOption: "performance.reasoningEffort",
          suggestedFix: `Choose one of: ${primary.reasoningEfforts.join(", ")}.`,
        });
      }
    }
  }

  if (config.gateway === "openrouter" && config.routing.denyDataCollection === false) {
    issues.push({
      severity: "warning",
      message: "Provider data collection is not denied.",
      affectedOption: "routing.denyDataCollection",
      suggestedFix: "Deny data collection unless the workflow explicitly permits it.",
    });
  }

  if (config.gateway !== "openrouter") {
    issues.push({
      severity: "warning",
      message: "Alternative gateway support is starter-oriented until runtime tests expand.",
      affectedOption: "gateway",
      suggestedFix: "Review gateway configuration before production use.",
    });
  }

  if (config.performance.retries > 8) {
    issues.push({
      severity: "warning",
      message: "High retry counts can amplify cost during provider outages.",
      affectedOption: "performance.retries",
      suggestedFix: "Use 3-5 retries unless you have a specific reliability requirement.",
    });
  }

  if (config.performance.concurrency > 20) {
    issues.push({
      severity: "warning",
      message: "High concurrency can exhaust provider and gateway limits.",
      affectedOption: "performance.concurrency",
      suggestedFix: "Keep concurrency at or below provider quotas.",
    });
  }

  if (!config.permissions.confirmDestructiveCommands) {
    issues.push({
      severity: "warning",
      message: "Destructive commands will run without confirmation.",
      affectedOption: "permissions.confirmDestructiveCommands",
      suggestedFix: "Enable confirmation unless the target environment is disposable.",
    });
  }

  return issues;
}
