# Universal Agent Config — One Config for Every Coding Agent

**Universal Agent Config** is the open-source model-routing and agent-policy framework for people who use more than one AI coding agent. Define your model lanes once, generate native configuration for every major agent, and keep provider drift out of your dotfiles.

```bash
git clone https://github.com/jesseoue/universal-agent-config.git
cd universal-agent-config
./scripts/install.sh --agent opencode
```

## Why this exists

Every coding agent wants a different file in a different directory. Every model changes monthly. Every routing gateway has different auth, model naming, and failover semantics. The result is config sprawl: OpenCode JSON, omp YAML, Claude Code settings, Codex TOML, Cursor rules, Aider YAML, and Goose YAML, all drifting independently.

Universal Agent Config fixes that with one canonical source of truth:

- Model routing and fallback lanes
- Provider and gateway routing strategy
- Tool permissions and safety defaults
- Shared agent behavior policy
- Generated native configuration for every supported agent

## Supported coding agents

| Agent | Generated config | Install target |
| --- | --- | --- |
| OpenCode | `opencode.json` + `AGENTS.md` | `~/.config/opencode` |
| omp / Oh My Pi | `config.yml`, `models.yml`, `mcp.json` | `~/.omp/agent` |
| Claude Code | `settings.json` + `CLAUDE.md` | `~/.claude` |
| Codex | `config.toml` + `AGENTS.md` | `~/.codex` |
| Cursor | `.cursor/rules/universal-agent-config.mdc` | Project `.cursor/rules/` |
| Aider | `.aider.conf.yml` | Project root |
| Goose | `config.yaml` | `~/.config/goose` |

## Supported routing technologies

Universal Agent Config treats routing technology as a deliberate deployment decision.

| Gateway | Type | Best for | Main tradeoff |
| --- | --- | --- | --- |
| OpenRouter | Hosted model marketplace | Broad model access with one key and fast setup | Hosted control plane and account-level credits |
| Cloudflare AI Gateway | Edge control plane | Cloudflare teams needing caching, logging, DLP, and security at the edge | Account-specific endpoints and Cloudflare policy management |
| Vercel AI Gateway | Developer gateway | Vercel-native apps, OIDC auth, provider failover, and spend visibility | Strongest when your runtime also lives on Vercel |
| LiteLLM Proxy | Self-hosted proxy | Direct provider contracts, Azure/Bedrock/Vertex, virtual keys, budgets | You operate the proxy and its state |
| Portkey AI Gateway | Managed governance gateway | Guardrails, audit, policy, and managed failover | External account and routing policy state |

Generated gateway starter configs are committed under `generated/gateways/`.

## Quick start

```bash
python3 -m pip install pyyaml tomli-w pytest
python3 scripts/generate.py
python3 scripts/validate.py
./scripts/install.sh --agent opencode
```

Set your routing key:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

Install another agent without duplicating policy:

```bash
./scripts/install.sh --agent claude-code
./scripts/install.sh --agent codex
./scripts/install.sh --agent goose
```

## How routing works

Model metadata comes directly from the live [OpenRouter model catalog](https://openrouter.ai/api/v1/models). The canonical registry records context windows, output limits, tool support, vision support, and reasoning support.

Routing profiles then define four reusable lanes:

- `default` — general coding
- `background` — titles, summaries, and cheap background work
- `reasoning` — architecture and difficult debugging
- `vision` — screenshots, diagrams, and multimodal work

Available profiles:

| Profile | Strategy |
| --- | --- |
| `balanced` | Frontier default with open-weight fallbacks |
| `open-weight` | Open-weight-first routing |
| `low-cost` | Cheap high-volume routing |
| `frontier` | Maximum-quality frontier routing |

## Maintenance workflow

```bash
# Refresh model metadata from OpenRouter
python3 scripts/refresh_models.py

# Generate all native agent configs
python3 scripts/generate.py

# Validate model references, capabilities, adapters, and gateways
python3 scripts/validate.py

# Run deterministic generation and installer tests
pytest -q
bash tests/test_installer.sh
```

## CI/CD

Every pull request runs:

- OpenRouter catalog refresh
- Deterministic generation
- Structural and cross-reference validation
- Pytest generation tests
- Sandboxed installer tests
- ShellCheck
- Gitleaks secret scan
- Stale generated-artifact detection

Daily jobs detect OpenRouter model drift and fail when canonical metadata changes.

Tagged releases run the full verification suite before creating a GitHub Release.

## Security and safety defaults

- Telemetry disabled by default
- No API keys committed
- User-local installation only
- Installer refuses root
- Existing files are backed up, never silently overwritten
- Destructive commands require confirmation by default
- Shared policy requires reading code before editing and verifying changes

## Project structure

```text
core/               Canonical models, routing, gateways, policy, prompts
generated/          Native configs for every supported agent and gateway
scripts/            Generation, validation, refresh, and installer
tests/              Deterministic generation and sandbox installer tests
.github/workflows/  CI, model drift detection, and release automation
```

## Contributing

Read [AGENTS.md](AGENTS.md), edit the canonical files under `core/`, regenerate, validate, and submit a PR. Do not manually edit `generated/`.

## License

MIT © Jesse Ouellette
