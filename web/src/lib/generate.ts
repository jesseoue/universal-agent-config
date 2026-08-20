import { stringify } from "yaml";
import type { GeneratedArtifact, RulePackId, WizardConfig } from "@/lib/types";

const providerId = "openrouter";

const sharedPrompt = `# Universal Agent Config

## Operating policy

- Read the relevant code before editing.
- Prefer the smallest reversible change.
- Use model lanes deliberately; frontier spend is never the silent default.
- Plan read-only first, execute in bounded slices, then verify with targeted commands.
- Report exact command output and distinguish checked from unverified claims.
- Never expose API keys or local absolute paths.
`;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function yaml(value: unknown): string {
  return stringify(value, { lineWidth: 120, defaultStringType: "PLAIN" });
}

function modelId(config: WizardConfig, lane: keyof WizardConfig["lanes"]): string {
  return config.lanes[lane].primary;
}

function gatewayModel(config: WizardConfig, id: string): string {
  if (config.gateway === "openrouter") return `${providerId}/${id}`;
  if (config.gateway === "litellm") return `litellm-proxy/${id}`;
  if (config.gateway === "portkey") return `@${id}`;
  return id;
}

function openRouterProviderPolicy(config: WizardConfig) {
  if (config.gateway !== "openrouter") return null;
  return {
    sort: config.routing.providerStrategy === "auto" ? "latency" : config.routing.providerStrategy,
    allow_fallbacks: config.routing.allowProviderFallbacks,
    require_parameters: config.routing.requireParameters,
    ...(config.routing.denyDataCollection ? { data_collection: "deny" } : {}),
    ...(config.routing.preferZeroDataRetention ? { zdr: true } : {}),
  };
}

function fallbackModels(config: WizardConfig, lane: keyof WizardConfig["lanes"]) {
  return config.lanes[lane].fallbacks.map((id) => ({ id }));
}

function reasoningPayload(config: WizardConfig) {
  return { effort: config.performance.reasoningEffort, exclude: true };
}

function verificationPrompt(config: WizardConfig): string {
  if (config.verification.mode === "off") return "Verification is explicitly disabled by policy.";
  return [
    "Verification policy:",
    `- Mode: ${config.verification.mode}`,
    `- Read-only planning: ${config.verification.readOnlyPlanning ? "yes" : "no"}`,
    `- Targeted commands: ${config.verification.targetedCommands ? "yes" : "no"}`,
    `- One focused retry before escalation: ${config.verification.oneFocusedRetry ? "yes" : "no"}`,
    config.frontier.enabled
      ? `- Frontier escalation: after ${config.frontier.triggerAfterFailedAttempts} failed attempts${config.frontier.highBlastRadiusOnly ? " and only for high-blast-radius work" : ""}`
      : "- Frontier escalation: disabled",
  ].join("\n");
}

function addArtifact(
  artifacts: GeneratedArtifact[],
  path: string,
  contents: string,
  language: GeneratedArtifact["language"],
  adapter: GeneratedArtifact["adapter"],
  description: string,
) {
  artifacts.push({ path, contents, language, adapter, description });
}

function buildOpenCode(config: WizardConfig, root: string, adapter: GeneratedArtifact["adapter"], withOmo: boolean) {
  const providerPolicy = openRouterProviderPolicy(config);
  const openCode: Record<string, unknown> = {
    $schema: "https://opencode.ai/config.json",
    model: gatewayModel(config, modelId(config, "default")),
    small_model: gatewayModel(config, modelId(config, "background")),
    enabled_providers: [config.gateway === "openrouter" ? providerId : "custom"],
    disabled_providers: [],
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

  if (config.gateway === "openrouter") {
    openCode.provider = {
      openrouter: {
        npm: "@ai-sdk/openai-compatible",
        name: "OpenRouter",
        options: {
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: "{env:OPENROUTER_API_KEY}",
          headers: {
            "HTTP-Referer": "https://github.com/jesseoue/universal-agent-config",
            "X-Title": "Universal Agent Config",
          },
          timeout: config.performance.requestTimeoutSeconds * 1000,
          headerTimeout: config.performance.requestTimeoutSeconds * 1000,
          chunkTimeout: config.performance.stalledStreamTimeoutSeconds * 1000,
        },
        models: {
          [modelId(config, "default")]: {
            reasoning: reasoningPayload(config),
            provider: providerPolicy,
            models: fallbackModels(config, "default"),
          },
          [modelId(config, "background")]: {
            provider: providerPolicy,
            models: fallbackModels(config, "background"),
          },
          [modelId(config, "reasoning")]: {
            reasoning: { effort: "high", exclude: true },
            provider: providerPolicy,
            models: fallbackModels(config, "reasoning"),
          },
        },
      },
    };
  }

  if (withOmo) openCode.plugin = ["oh-my-openagent@4.19.4"];

  return [
    { path: `${root}/opencode.json`, contents: json(openCode), language: "json" as const, adapter, description: "Native OpenCode routing, permissions, and provider policy" },
    { path: `${root}/AGENTS.md`, contents: `${sharedPrompt}\n${verificationPrompt(config)}\n`, language: "markdown" as const, adapter, description: "Shared behavior and verification policy" },
  ];
}

function buildOmo(config: WizardConfig) {
  return {
    $schema: "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/omo.schema.json",
    models: {
      default: { model: gatewayModel(config, modelId(config, "default")) },
      fast: { model: gatewayModel(config, modelId(config, "background")) },
      reasoning: { model: gatewayModel(config, modelId(config, "reasoning")) },
    },
    telemetry: { enabled: false },
    "[opencode]": {
      agents: {
        sisyphus: { model: "default", reasoning: config.performance.reasoningEffort },
        hephaestus: { model: "default", reasoning: "high" },
        prometheus: { model: "reasoning", reasoning: "high" },
        verifier: { model: "reasoning", reasoning: "high" },
        librarian: { model: "fast" },
        explore: { model: "fast" },
      },
      background_task: {
        defaultConcurrency: config.performance.concurrency,
        staleTimeoutMs: config.performance.stalledStreamTimeoutSeconds * 1000,
        providerConcurrency: { openrouter: config.performance.concurrency },
        maxDepth: 2,
        maxToolCalls: 200,
        circuitBreaker: {
          enabled: true,
          maxToolCalls: 160,
          consecutiveThreshold: 8,
        },
      },
      mcp_env_allowlist: ["CONTEXT7_API_KEY"],
      tmux: { enabled: false },
    },
  };
}

function buildOmp(config: WizardConfig) {
  const modelRoles = {
    default: gatewayModel(config, modelId(config, "default")),
    smol: gatewayModel(config, modelId(config, "background")),
    slow: gatewayModel(config, modelId(config, "reasoning")),
    plan: gatewayModel(config, modelId(config, "reasoning")),
    vision: gatewayModel(config, modelId(config, "vision")),
    task: gatewayModel(config, modelId(config, "default")),
    advisor: gatewayModel(config, modelId(config, "reasoning")),
  };
  const laneForRole: Record<string, keyof WizardConfig["lanes"]> = {
    default: "default",
    smol: "background",
    slow: "reasoning",
    plan: "reasoning",
    vision: "vision",
    task: "default",
    advisor: "reasoning",
  };
  const configYaml = {
    modelRoles,
    retry: {
      maxRetries: config.performance.retries,
      modelFallback: true,
      fallbackRevertPolicy: "cooldown-expiry",
      fallbackChains: Object.fromEntries(
        Object.keys(modelRoles).map((role) => [role, config.lanes[laneForRole[role]].fallbacks]),
      ),
    },
    modelProviderOrder: [config.gateway === "openrouter" ? providerId : config.gateway],
    tools: {
      approvalMode: config.permissions.confirmDestructiveCommands ? "normal" : "yolo",
      read: config.permissions.read,
      edit: config.permissions.edit,
      bash: config.permissions.shell,
      browser: config.permissions.browser,
      web_search: config.permissions.webSearch,
    },
    thinkingBudgets: {
      defaultThinkingLevel: config.performance.reasoningEffort,
    },
    logging: { level: "error", telemetry: false },
  };
  const modelsYaml = {
    providers: {
      [config.gateway === "openrouter" ? providerId : config.gateway]: {
        baseUrl: config.gateway === "openrouter" ? "https://openrouter.ai/api/v1" : "replace-with-gateway-base-url",
        api: "openai-completions",
        apiKey: config.gateway === "openrouter" ? "OPENROUTER_API_KEY" : "GATEWAY_API_KEY",
        modelOverrides: Object.fromEntries(
          Object.values(config.lanes).map((lane) => [
            lane.primary,
            {
              openRouterRouting: openRouterProviderPolicy(config),
              openRouterModels: lane.fallbacks.map((id) => ({ id })),
            },
          ]),
        ),
      },
    },
  };
  return [
    { path: "omp/config.yml", contents: yaml(configYaml), language: "yaml" as const, adapter: "omp" as const, description: "omp roles, fallback chains, tools, and logging" },
    { path: "omp/models.yml", contents: yaml(modelsYaml), language: "yaml" as const, adapter: "omp" as const, description: "omp provider metadata and routing controls" },
    {
      path: "omp/mcp.json",
      contents: json({
        mcpServers: {
          context7: {
            type: "http",
            url: "https://mcp.context7.com/mcp",
            headers: { CONTEXT7_API_KEY: "${CONTEXT7_API_KEY:-}" },
          },
        },
      }),
      language: "json" as const,
      adapter: "omp" as const,
      description: "Context7 MCP server",
    },
  ];
}

function buildClaudeCode(config: WizardConfig) {
  return [
    { path: "claude-code/settings.json", contents: json({
      env: {
        ANTHROPIC_BASE_URL: "https://openrouter.ai/api",
        ANTHROPIC_API_KEY: "${OPENROUTER_API_KEY}",
        ANTHROPIC_MODEL: modelId(config, "default"),
        ANTHROPIC_SMALL_FAST_MODEL: modelId(config, "background"),
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      },
      permissions: {
        allow: ["Read", ...(config.permissions.edit ? ["Edit", "Bash", "WebFetch", "WebSearch"] : [])],
        deny: ["Bash(rm -rf *)", "Read(**/.env*)", "Read(**/.dev.vars*)", "Read(**/secrets/**)"],
      },
      model: modelId(config, "default"),
      fallbackModel: [modelId(config, "reasoning"), modelId(config, "background")],
      autoCompactEnabled: config.performance.compaction,
      autoCompactWindow: 500000,
      effortLevel: config.performance.reasoningEffort,
    }), language: "json" as const, adapter: "claude-code" as const, description: "Claude Code gateway, routing, and permissions" },
    { path: "claude-code/CLAUDE.md", contents: `${sharedPrompt}\n${verificationPrompt(config)}\n`, language: "markdown" as const, adapter: "claude-code" as const, description: "Claude behavior and verification policy" },
    {
      path: "claude-code/.mcp.json",
      contents: json({
        mcpServers: {
          context7: {
            command: "npx",
            args: ["-y", "@upstash/context7-mcp"],
            env: { CONTEXT7_API_KEY: "${CONTEXT7_API_KEY}" },
          },
        },
      }),
      language: "json" as const,
      adapter: "claude-code" as const,
      description: "Claude Code MCP servers",
    },
  ];
}

function buildCodex(config: WizardConfig) {
  const codex = {
    model: modelId(config, "default"),
    model_provider: "openrouter",
    model_reasoning_effort: config.performance.reasoningEffort,
    plan_mode_reasoning_effort: "high",
    model_reasoning_summary: "concise",
    model_verbosity: "low",
    model_providers: {
      openrouter: {
        name: "OpenRouter",
        base_url: "https://openrouter.ai/api/v1",
        env_key: "OPENROUTER_API_KEY",
        request_max_retries: config.performance.retries,
        stream_idle_timeout_ms: config.performance.stalledStreamTimeoutSeconds * 1000,
        stream_max_retries: config.performance.retries,
        wire_api: "responses",
        http_headers: {
          "HTTP-Referer": "https://github.com/jesseoue/universal-agent-config",
          "X-Title": "Universal Agent Config",
        },
      },
    },
    mcp_servers: {
      context7: {
        command: "npx",
        args: ["-y", "@upstash/context7-mcp"],
        env: { CONTEXT7_API_KEY: "${CONTEXT7_API_KEY}" },
        startup_timeout_sec: 10,
        tool_timeout_sec: config.performance.mcpTimeoutSeconds,
        required: false,
      },
    },
    approval_policy: config.permissions.confirmDestructiveCommands ? "on-request" : "never",
    sandbox_mode: config.permissions.shell ? "workspace-write" : "read-only",
    log_level: "error",
    agents: {
      enabled: true,
      max_concurrent_threads_per_session: Math.max(1, Math.floor(config.performance.concurrency / 2)),
      default_subagent_model: modelId(config, "default"),
      default_subagent_reasoning_effort: config.performance.reasoningEffort,
      interrupt_message: false,
    },
  };
  return [
    { path: "codex/config.toml", contents: stringify(codex), language: "toml" as const, adapter: "codex" as const, description: "Codex provider, reasoning, subagents, and approvals" },
    { path: "codex/AGENTS.md", contents: `${sharedPrompt}\n${verificationPrompt(config)}\n`, language: "markdown" as const, adapter: "codex" as const, description: "Codex behavior and verification policy" },
  ];
}

type CursorRule = {
  filename: string;
  pack: RulePackId;
  description: string;
  alwaysApply: boolean;
  globs?: string;
  body: string;
};

function cursorFrontmatter(rule: Pick<CursorRule, "description" | "alwaysApply" | "globs">): string {
  return [
    "---",
    `description: ${rule.description}`,
    ...(rule.globs ? [`globs: ${rule.globs}`] : []),
    `alwaysApply: ${rule.alwaysApply}`,
    "---",
    "",
  ].join("\n");
}

function cursorRules(config: WizardConfig): CursorRule[] {
  return [
    {
      filename: "00-universal-agent-core.mdc",
      pack: "core",
      description: "Universal Agent Config core behavior and safety policy",
      alwaysApply: true,
      body: `${sharedPrompt.trim()}\n`,
    },
    {
      filename: "01-model-routing.mdc",
      pack: "model-routing",
      description: "Cost-aware model lane selection and escalation policy",
      alwaysApply: true,
      body: `# Model routing

Lane defaults:

- Daily coding lead: \`${modelId(config, "default")}\`
- Background summaries and bounded subtasks: \`${modelId(config, "background")}\`
- Deep planning and difficult debugging: \`${modelId(config, "reasoning")}\`
- Screenshots and multimodal input: \`${modelId(config, "vision")}\`
- Toolless analysis: \`${modelId(config, "analysis")}\`

Routing policy:

- Start on the daily lead for tool-driven coding.
- Escalate to the deep lane for architecture, migrations, security-sensitive changes, or repeated failure.
- Use frontier models only when the user explicitly accepts that spend or the blast radius justifies it. Current frontier escalation: ${config.frontier.enabled ? "enabled" : "disabled"}.
- Keep generated titles, summaries, and compaction on the cheap background lane.
- When switching the OpenAI base URL or model family, start a fresh Cursor chat instead of reusing a stale thread.

Cursor + OpenRouter setup:

- Override the OpenAI Base URL with \`https://openrouter.ai/api/v1/cursor\`.
- Do not use \`https://openrouter.ai/api/v1\` in Cursor; the dedicated Cursor endpoint translates its flat tool-call format.
- Use exact OpenRouter model IDs from the model list. Router aliases require the \`~\` prefix.
- Set \`OPENROUTER_API_KEY\` in Cursor's API-key settings, never in repository files.
- Cursor Teams and Enterprise bill usage at $0.25 per million tokens, including BYOK requests through OpenRouter. Budget Cursor usage in addition to OpenRouter model pricing.
`,
    },
    {
      filename: "02-planning.mdc",
      pack: "planning",
      description: "Planning workflow for architecture, migrations, and high-blast-radius changes",
      alwaysApply: false,
      body: `# Planning

Before implementation:

- Identify current behavior, affected surfaces, rollback path, and verification commands.
- Check migration journals, API contracts, ownership boundaries, and dependent callers.
- Split work into reversible steps when possible.
- Define completion as both implementation and evidence, not prose.

For migrations, verify that the journal and deployed schema agree. For multi-file changes, map each consumer before editing shared interfaces.
`,
    },
    {
      filename: "03-testing.mdc",
      pack: "testing",
      description: "Reproduce-first testing, targeted checks, and honest verification policy",
      globs: "**/test*,**/tests/**,**/spec*,**/specs/**,**/e2e/**,**/*.test.*,**/*.spec.*",
      alwaysApply: false,
      body: `# Testing

- Reproduce a failure before changing code.
- Prefer the narrowest useful checks, then the project's full verification suite when risk justifies it.
- Do not delete, skip, weaken, or mark tests as expected to fail merely to make a run pass.
- Investigate flaky tests with evidence and scope before retrying.
- Report exact commands and outcomes, and distinguish unit checks from runtime or end-to-end verification.
`,
    },
    {
      filename: "04-typescript.mdc",
      pack: "typescript",
      description: "TypeScript and React implementation conventions",
      globs: "**/*.ts,**/*.tsx,**/*.mts,**/*.cts",
      alwaysApply: false,
      body: `# TypeScript

- Prefer precise types over broad casts or \`any\`.
- Keep public interfaces explicit and update consumers when contracts change.
- Use immutable updates for state and data transformations.
- Keep component logic small and colocated; extract reusable behavior only when it has a second consumer.
- Run the project formatter, typecheck, and relevant test command before handoff.
`,
    },
    {
      filename: "05-python.mdc",
      pack: "python",
      description: "Python implementation conventions",
      globs: "**/*.py",
      alwaysApply: false,
      body: `# Python

- Follow the project's packaging, import, and formatting conventions.
- Prefer explicit boundaries over global mutable state.
- Use \`pathlib\` for filesystem paths and safe temporary directories for generated artifacts.
- Keep dependencies pinned to the project manifest.
- Run targeted pytest tests, plus lint and typecheck when configured.
`,
    },
    {
      filename: "06-documentation.mdc",
      pack: "documentation",
      description: "Documentation, changelog, and README writing conventions",
      globs: "**/*.md,**/*.mdx",
      alwaysApply: false,
      body: `# Documentation

- Lead with the outcome, then the setup or decision rationale.
- Keep installation, configuration, and troubleshooting steps copyable.
- Mark time-sensitive model, pricing, and availability claims as such.
- Prefer one canonical explanation over duplicated statements that can drift.
- Do not describe untested behavior as verified or deployed.
`,
    },
    {
      filename: "07-security-review.mdc",
      pack: "security-review",
      description: "Security review checklist for authentication, secrets, dependencies, injection, and severity",
      alwaysApply: false,
      body: `# Security review

Check:

- Authentication, authorization, tenant isolation, and session boundaries.
- Secret storage, logging, shell interpolation, SSRF, path traversal, and injection sinks.
- Dependency reachability and exploitability, not just advisory presence.
- Rollback and blast radius for proposed remediation.

High or critical findings require a demonstrated exploit and meaningful impact. HTTP status, simulated output, or a suspicious sink alone is insufficient evidence.
`,
    },
  ];
}

const cursorIgnorePolicy = `# Secrets and credentials
.env*
**/.env*
**/.env.*
**/credentials.json
**/secrets.json
**/secrets/**
**/*.key
**/*.pem
**/id_rsa
**/id_ed25519

# Build output and dependencies
node_modules/
dist/
build/
out/
coverage/
.next/
.nuxt/
.venv/
__pycache__/

# Local caches and generated artifacts
.cache/
.pytest_cache/
.mypy_cache/
.ruff_cache/
.turbo/
.DS_Store
`;

function buildCursor(config: WizardConfig) {
  const selectedPacks = new Set(config.rulePacks);
  const rules = cursorRules(config)
    .filter((rule) => selectedPacks.has(rule.pack))
    .map((rule) => ({
      path: `cursor/.cursor/rules/${rule.filename}`,
      contents: `${cursorFrontmatter(rule)}${rule.body}`,
      language: "markdown" as const,
      adapter: "cursor" as const,
      description: "Cursor project rule",
    }));

  return [
    ...rules,
    {
      path: "cursor/.cursor/mcp.json",
      contents: json({
        mcpServers: {
          context7: {
            url: "https://mcp.context7.com/mcp",
            headers: { CONTEXT7_API_KEY: "${env:CONTEXT7_API_KEY}" },
          },
        },
      }),
      language: "json" as const,
      adapter: "cursor" as const,
      description: "Cursor MCP servers",
    },
    { path: "cursor/.cursorignore", contents: cursorIgnorePolicy, language: "text" as const, adapter: "cursor" as const, description: "Cursor secret and generated-output ignore policy" },
  ];
}

function buildAider(config: WizardConfig) {
  return [{ path: "aider/.aider.conf.yml", contents: yaml({
    model: gatewayModel(config, modelId(config, "default")),
    "editor-model": gatewayModel(config, modelId(config, "background")),
    "map-tokens": 4096,
    "auto-commits": false,
    "dirty-commits": false,
    "attribute-author": false,
    "attribute-committer": false,
  }), language: "yaml" as const, adapter: "aider" as const, description: "Aider main/editor model split" }];
}

function buildGoose(config: WizardConfig) {
  return [{ path: "goose/config.yaml", contents: yaml({
    default: {
      provider: config.gateway,
      model: modelId(config, "default"),
      temperature: 0.2,
    },
    GOOSE_PLANNER_PROVIDER: config.gateway,
    GOOSE_PLANNER_MODEL: modelId(config, "reasoning"),
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
  }), language: "yaml" as const, adapter: "goose" as const, description: "Goose default/planner models and tool policy" }];
}

export function buildArtifacts(config: WizardConfig): GeneratedArtifact[] {
  const artifacts: GeneratedArtifact[] = [];

  if (config.agents.includes("opencode-omo")) {
    artifacts.push(...buildOpenCode(config, "opencode-omo", "opencode-omo", true));
    addArtifact(artifacts, "opencode-omo/omo.jsonc", json(buildOmo(config)), "json", "opencode-omo", "OMO orchestration, concurrency, and circuit breakers");
  } else if (config.agents.includes("opencode")) {
    artifacts.push(...buildOpenCode(config, "opencode", "opencode", false));
  }
  if (config.agents.includes("omp")) artifacts.push(...buildOmp(config));
  if (config.agents.includes("claude-code")) artifacts.push(...buildClaudeCode(config));
  if (config.agents.includes("codex")) artifacts.push(...buildCodex(config));
  if (config.agents.includes("cursor")) artifacts.push(...buildCursor(config));
  if (config.agents.includes("aider")) artifacts.push(...buildAider(config));
  if (config.agents.includes("goose")) artifacts.push(...buildGoose(config));

  const envName = config.gateway === "openrouter" ? "OPENROUTER_API_KEY" : `${config.gateway.toUpperCase()}_API_KEY`;
  addArtifact(artifacts, "gateway/env.example", `${envName}=replace-me\nCONTEXT7_API_KEY=replace-me\n`, "text", "gateway", "Gateway credential placeholders; never commit real values");
  addArtifact(artifacts, "uac.config.json", json(config), "json", "shared", "Reimportable Universal Agent Config wizard state");
  addArtifact(artifacts, "README-install.md", `# Universal Agent Config install\n\nSelected agents: ${config.agents.join(", ")}\nGateway: ${config.gateway}\nProvider strategy: ${config.routing.providerStrategy}\nFrontier escalation: ${config.frontier.enabled ? "enabled" : "disabled"}\n\n${verificationPrompt(config)}\n\nMove each generated directory to its native install target. Keep secrets in your local secret store, never in this repository.\n`, "markdown", "shared", "Install instructions and runtime policy");

  return artifacts;
}

export async function createZip(config: WizardConfig): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const artifact of buildArtifacts(config)) zip.file(artifact.path, artifact.contents);
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
