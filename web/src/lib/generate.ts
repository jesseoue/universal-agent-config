import type { GeneratedArtifact, WizardConfig } from "@/lib/types";

const sharedPrompt = `# Universal Agent Config

## Operating policy

- Read the relevant code before editing.
- Prefer the smallest reversible change.
- Use the model-routing lanes deliberately.
- Run targeted verification and report exact command output.
- Never expose API keys or local absolute paths.
`;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function yaml(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function modelRecord(config: WizardConfig, lane: keyof WizardConfig["lanes"]): string {
  return config.lanes[lane].primary;
}

function gatewayModel(config: WizardConfig, modelId: string): string {
  if (config.gateway === "openrouter") return `openrouter/${modelId}`;
  if (config.gateway === "litellm") return `litellm-proxy/${modelId}`;
  if (config.gateway === "portkey") return `@${modelId}`;
  return modelId;
}

export function buildArtifacts(config: WizardConfig): GeneratedArtifact[] {
  const artifacts: GeneratedArtifact[] = [];

  if (config.agents.includes("opencode") || config.agents.includes("opencode-omo")) {
    const openCode: Record<string, unknown> = {
      $schema: "https://opencode.ai/config.json",
      model: gatewayModel(config, modelRecord(config, "default")),
      small_model: gatewayModel(config, modelRecord(config, "background")),
      enabled_providers: [config.gateway === "openrouter" ? "openrouter" : "custom"],
      instructions: "AGENTS.md",
      share: false,
      logLevel: "ERROR",
      tool_output: {
        max_lines: config.performance.toolOutputMaxLines,
        max_bytes: config.performance.toolOutputMaxBytes,
      },
      compaction: { auto: config.performance.compaction, prune: true, reserved: 16384 },
      permission: {
        read: config.permissions.read ? "allow" : "deny",
        glob: "allow",
        grep: "allow",
        list: "allow",
        edit: config.permissions.edit ? "allow" : "deny",
        bash: config.permissions.shell ? "allow" : "deny",
        task: "allow",
        webfetch: config.permissions.browser ? "allow" : "deny",
        websearch: config.permissions.webSearch ? "allow" : "deny",
      },
      subagent_depth: 1,
      default_agent: "sisyphus",
      autoupdate: false,
      snapshot: false,
    };
    if (config.agents.includes("opencode-omo")) {
      openCode.plugin = ["oh-my-openagent@4.19.4"];
    }
    artifacts.push({
      path: `${config.agents.includes("opencode-omo") ? "opencode-omo" : "opencode"}/opencode.json`,
      contents: json(openCode),
      language: "json",
      adapter: config.agents.includes("opencode-omo") ? "opencode-omo" : "opencode",
      description: "Native OpenCode routing and permission policy",
    });
    artifacts.push({
      path: `${config.agents.includes("opencode-omo") ? "opencode-omo" : "opencode"}/AGENTS.md`,
      contents: sharedPrompt,
      language: "markdown",
      adapter: config.agents.includes("opencode-omo") ? "opencode-omo" : "opencode",
      description: "Shared behavior policy",
    });
  }

  if (config.agents.includes("omp")) {
    artifacts.push({
      path: "omp/config.yml",
      contents: yaml({
        modelRoles: {
          default: gatewayModel(config, modelRecord(config, "default")),
          smol: gatewayModel(config, modelRecord(config, "background")),
          slow: gatewayModel(config, modelRecord(config, "reasoning")),
          plan: gatewayModel(config, modelRecord(config, "reasoning")),
          vision: gatewayModel(config, modelRecord(config, "vision")),
          task: gatewayModel(config, modelRecord(config, "default")),
          advisor: gatewayModel(config, modelRecord(config, "reasoning")),
        },
        retry: {
          maxRetries: config.performance.retries,
          modelFallback: true,
          fallbackRevertPolicy: "cooldown-expiry",
        },
        tools: {
          read: config.permissions.read,
          edit: config.permissions.edit,
          bash: config.permissions.shell,
          browser: config.permissions.browser,
          web_search: config.permissions.webSearch,
          approvalMode: config.permissions.confirmDestructiveCommands ? "normal" : "yolo",
        },
        logging: { level: "error", telemetry: false },
      }),
      language: "yaml",
      adapter: "omp",
      description: "omp model roles, retries, permissions, and logging",
    });
  }

  if (config.agents.includes("claude-code")) {
    artifacts.push({
      path: "claude-code/settings.json",
      contents: json({
        env: {
          ANTHROPIC_BASE_URL: "https://openrouter.ai/api",
          ANTHROPIC_API_KEY: "${OPENROUTER_API_KEY}",
          ANTHROPIC_MODEL: modelRecord(config, "default"),
          ANTHROPIC_SMALL_FAST_MODEL: modelRecord(config, "background"),
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
        },
        permissions: {
          allow: ["Read", ...(config.permissions.edit ? ["Edit", "Bash", "WebFetch", "WebSearch"] : [])],
          deny: ["Bash(rm -rf *)", "Read(**/.env*)", "Read(**/.dev.vars*)", "Read(**/secrets/**)"],
        },
        model: modelRecord(config, "default"),
        fallbackModel: [config.lanes.reasoning.primary, config.lanes.background.primary],
        autoCompactEnabled: config.performance.compaction,
        effortLevel: config.performance.reasoningEffort,
      }),
      language: "json",
      adapter: "claude-code",
      description: "Claude Code gateway, model, fallback, and permission settings",
    });
  }

  if (config.agents.includes("codex")) {
    const codex = [
      `model = "${modelRecord(config, "default")}"`,
      "model_provider = \"openrouter\"",
      `model_reasoning_effort = "${config.performance.reasoningEffort}"`,
      "model_reasoning_summary = \"concise\"",
      "model_verbosity = \"low\"",
      `approval_policy = "${config.permissions.confirmDestructiveCommands ? "on-request" : "never"}"`,
      "sandbox_mode = \"workspace-write\"",
      "log_level = \"error\"\n",
      "[model_providers.openrouter]",
      "name = \"OpenRouter\"",
      "base_url = \"https://openrouter.ai/api/v1\"",
      "env_key = \"OPENROUTER_API_KEY\"",
      `request_max_retries = ${config.performance.retries}`,
      `stream_idle_timeout_ms = ${config.performance.stalledStreamTimeoutSeconds * 1000}`,
      "wire_api = \"responses\"\n",
      "[agents]",
      "enabled = true",
      `max_concurrent_threads_per_session = ${Math.max(1, Math.floor(config.performance.concurrency / 2))}`,
      `default_subagent_model = "${modelRecord(config, "default")}"`,
      "interrupt_message = false\n",
    ].join("\n");
    artifacts.push({
      path: "codex/config.toml",
      contents: codex,
      language: "toml",
      adapter: "codex",
      description: "Codex provider, reasoning, subagent, and approval policy",
    });
    artifacts.push({
      path: "codex/AGENTS.md",
      contents: sharedPrompt,
      language: "markdown",
      adapter: "codex",
      description: "Shared behavior policy",
    });
  }

  if (config.agents.includes("aider")) {
    artifacts.push({
      path: "aider/.aider.conf.yml",
      contents: yaml({
        model: gatewayModel(config, modelRecord(config, "default")),
        "editor-model": gatewayModel(config, modelRecord(config, "background")),
        "map-tokens": 4096,
        "auto-commits": false,
        "dirty-commits": false,
        "attribute-author": false,
        "attribute-committer": false,
      }),
      language: "yaml",
      adapter: "aider",
      description: "Aider main/editor model split",
    });
  }

  if (config.agents.includes("goose")) {
    artifacts.push({
      path: "goose/config.yaml",
      contents: yaml({
        default: {
          provider: config.gateway,
          model: modelRecord(config, "default"),
          temperature: 0.2,
        },
        GOOSE_PLANNER_PROVIDER: config.gateway,
        GOOSE_PLANNER_MODEL: modelRecord(config, "reasoning"),
        GOOSE_MAX_TURNS: 100,
        GOOSE_AUTO_COMPACT_THRESHOLD: 0.8,
        GOOSE_TELEMETRY_ENABLED: false,
        tools: {
          read: config.permissions.read,
          edit: config.permissions.edit,
          shell: config.permissions.shell,
          browser: config.permissions.browser,
          web_search: config.permissions.webSearch,
        },
        logging: { level: "error" },
        otel: { enabled: false },
      }),
      language: "yaml",
      adapter: "goose",
      description: "Goose default/planner models and tool policy",
    });
  }

  if (config.agents.includes("cursor")) {
    artifacts.push({
      path: "cursor/.cursor/rules/00-universal-agent-core.mdc",
      contents: `---\ndescription: Universal Agent Config core policy\nalwaysApply: ${config.rulePacks.includes("core")}\n---\n${sharedPrompt}`,
      language: "markdown",
      adapter: "cursor",
      description: "Cursor project rule for the universal core policy",
    });
    artifacts.push({
      path: "cursor/.cursor/rules/01-model-routing.mdc",
      contents: `---\ndescription: Cost-aware model lane selection\nalwaysApply: ${config.rulePacks.includes("model-routing")}\n---\n# Model routing\n\n- Daily lead: \`${modelRecord(config, "default")}\`\n- Background: \`${modelRecord(config, "background")}\`\n- Reasoning: \`${modelRecord(config, "reasoning")}\`\n- Vision: \`${modelRecord(config, "vision")}\`\n\nUse OpenRouter's dedicated Cursor endpoint: \`https://openrouter.ai/api/v1/cursor\`.\n`,
      language: "markdown",
      adapter: "cursor",
      description: "Cursor model routing rule",
    });
  }

  artifacts.push({
    path: "gateway/env.example",
    contents: `${config.gateway.toUpperCase().replace(/-/g, "_")}_API_KEY=replace-me\n`,
    language: "text",
    adapter: "gateway",
    description: "Gateway credential placeholder; never commit real values",
  });
  artifacts.push({
    path: "uac.config.json",
    contents: json(config),
    language: "json",
    adapter: "shared",
    description: "Reimportable Universal Agent Config wizard state",
  });
  artifacts.push({
    path: "README-install.md",
    contents: `# Universal Agent Config install\n\nSelected agents: ${config.agents.join(", ")}\nGateway: ${config.gateway}\n\nMove each generated directory to its native install target. Place \`.env.example\` values in your local secret store, never in the repository.\n\nGenerated on ${new Date().toISOString()}.\n`,
    language: "markdown",
    adapter: "shared",
    description: "Install instructions for the generated ZIP",
  });

  return artifacts;
}

export async function createZip(config: WizardConfig): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const artifact of buildArtifacts(config)) {
    zip.file(artifact.path, artifact.contents);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
