# Universal Agent Config

[![CI](https://github.com/jesseoue/universal-agent-config/actions/workflows/ci.yml/badge.svg)](https://github.com/jesseoue/universal-agent-config/actions/workflows/ci.yml)
[![Model drift](https://github.com/jesseoue/universal-agent-config/actions/workflows/model-drift.yml/badge.svg)](https://github.com/jesseoue/universal-agent-config/actions/workflows/model-drift.yml)
[![GitHub release](https://img.shields.io/github/v/release/jesseoue/universal-agent-config?display_name=tag&sort=semver)](https://github.com/jesseoue/universal-agent-config/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Open issues](https://img.shields.io/github/issues/jesseoue/universal-agent-config)](https://github.com/jesseoue/universal-agent-config/issues)
[![Good first issues](https://img.shields.io/github/issues/jesseoue/universal-agent-config/good%20first%20issue?label=good%20first%20issues)](https://github.com/jesseoue/universal-agent-config/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
[![Stars](https://img.shields.io/github/stars/jesseoue/universal-agent-config?style=social)](https://github.com/jesseoue/universal-agent-config/stargazers)

**One config. Seven coding agents. Five routing technologies.**

Universal Agent Config keeps model routing, fallbacks, permissions, and prompts in one canonical repo, then generates native configs for OpenCode, omp, Claude Code, Codex, Cursor, Aider, and Goose.

| | |
| --- | --- |
| **Agents** | OpenCode · omp · Claude Code · Codex · Cursor · Aider · Goose |
| **Routing** | OpenRouter · Cloudflare · Vercel · LiteLLM · Portkey |
| **Taxonomy** | Model gateways · model providers · media providers · inference runtimes |
| **Trust** | CI · daily model drift detection · sandboxed install tests · secret scan |
| **Install** | User-local · dry-run · backups · uninstall · doctor |
| **Tools** | Native tools · MCP · plugins · provider-aware semantics |

## 30-second start

```bash
git clone https://github.com/jesseoue/universal-agent-config.git
cd universal-agent-config
./scripts/install.sh --agent opencode
./scripts/install.sh doctor
```

Then set your OpenRouter key:

```bash
export OPENROUTER_API_KEY=sk-or-...
```

Add another agent without duplicating policy:

```bash
./scripts/install.sh --agent claude-code
./scripts/install.sh --agent codex
./scripts/install.sh --agent goose
```

Preview everything before touching your machine:

```bash
./scripts/install.sh --agent opencode --dry-run
```

Remove the symlinks later:

```bash
./scripts/install.sh uninstall
```

## Why developers star this

- Stop maintaining seven copies of the same AI model routing policy.
- Change one canonical model lane and regenerate every native agent config.
- Model metadata is refreshed from the live OpenRouter catalog, not guessed.
- Daily drift detection catches model changes before your coding agent does.
- Clean user-local install: no root, backups, dry-run, doctor, and uninstall.
- Gateway choice is explicit: hosted marketplace, edge control plane, developer gateway, self-hosted proxy, or managed governance gateway.

## Compatibility matrix

| Agent | Generated config | Install target | Status |
| --- | --- | --- | --- |
| OpenCode | `opencode.json` + `AGENTS.md` | `~/.config/opencode` | Generated |
| omp / Oh My Pi | `config.yml`, `models.yml`, `mcp.json` | `~/.omp/agent` | Generated |
| Claude Code | `settings.json` + `CLAUDE.md` | `~/.claude` | Generated |
| Codex | `config.toml` + `AGENTS.md` | `~/.codex` | Generated |
| Cursor | `.cursor/rules/universal-agent-config.mdc` | Project `.cursor/rules/` | Generated |
| Aider | `.aider.conf.yml` | Project root | Generated |
| Goose | `config.yaml` | `~/.config/goose` | Generated |

Generated means the native config is produced and structurally validated. It does not yet mean live end-to-end runtime tests are implemented for every agent CLI; those are tracked in [Issues](https://github.com/jesseoue/universal-agent-config/issues).

## Routing technology decision matrix

| Gateway | Type | Best for | Main tradeoff |
| --- | --- | --- | --- |
| OpenRouter | Hosted model marketplace | Broad model access with one key and fast setup | Hosted control plane and account-level credits |
| Cloudflare AI Gateway | Edge control plane | Cloudflare teams needing caching, logging, DLP, and security at the edge | Account-specific endpoints and Cloudflare policy management |
| Vercel AI Gateway | Developer gateway | Vercel-native apps, OIDC auth, provider failover, and spend visibility | Strongest when your runtime also lives on Vercel |
| LiteLLM Proxy | Self-hosted proxy | Direct provider contracts, Azure/Bedrock/Vertex, virtual keys, budgets | You operate the proxy and its state |
| Portkey AI Gateway | Managed governance gateway | Guardrails, audit, policy, and managed failover | External account and routing policy state |

## Tool, plugin, and MCP contract

All adapters translate one canonical tool contract:

- Native tools: `read`, `edit`, `shell`, `browser`, `web_search`
- Interfaces: native tools, MCP, and plugins
- Profiles mirror routing profiles and policy permissions
- Context7 is the default MCP documentation server
- Tool output is capped at 300 lines / 12,000 bytes
- Logging is `error` level, telemetry-free, and redacts every supported provider key

Provider semantics are explicit:

| Provider | Tool handling | Transport |
| --- | --- | --- |
| OpenRouter | Model capability | OpenAI tools |
| Cloudflare | Passthrough | OpenAI tools |
| Vercel | Provider options | AI SDK provider options |
| LiteLLM | Normalized | OpenAI tools |
| Portkey | Passthrough | OpenAI tools |

Fal and Replicate are intentionally unsupported for agent tool calling because they use media queue/prediction APIs rather than chat tool-call transports.

Adapter-specific output:

| Adapter | Tool/MCP output |
| --- | --- |
| OpenCode | Permission rules, remote MCP, error logging, tool output caps |
| omp | Tool flags, approval mode, HTTP MCP, logging redaction |
| Claude Code | Permission arrays, `.mcp.json`, nonessential traffic disabled |
| Codex | `model_providers`, MCP servers, sandbox/approval policy, logging |
| Goose | Extensions, permission mode, tool flags, OTel disabled |

## Provider and media taxonomy

Universal Agent Config separates four commonly confused layers:

| Layer | Examples | Purpose |
| --- | --- | --- |
| Model gateway | OpenRouter, Cloudflare, Vercel, LiteLLM, Portkey | Route requests across model providers |
| Model provider | Anthropic, OpenAI, Google, DeepSeek, Z.ai, Qwen, Mistral, Moonshot, Nous Research | Serve the model endpoint |
| Media provider | Fal, Replicate | Generate image, video, audio, speech, or 3D assets |
| Inference runtime | vLLM, Ollama, llama.cpp, SGLang | Serve open models on your own infrastructure |

These layers are not interchangeable. Coding agents generally need an OpenAI-compatible chat endpoint with tool calling. Media providers use queue or prediction APIs with model-specific schemas and are not drop-in replacements for chat model providers.

### Hermes policy

Hermes 4 405B is supported as a dedicated `content-analysis` lane, not as a coding-agent default:

- Text reasoning and sensitive-content analysis
- No tool calling
- No shell, edit, or browser permission
- Falls back only to Dolphin Mistral Venice Edition
- Never silently falls back to a tool-capable frontier model

This keeps the lane semantically honest: Hermes is useful for long-form analysis, but it is not the right model for tool-driven coding workflows.

### Media providers

| Provider | Protocol | Best for | Main nuance |
| --- | --- | --- | --- |
| Fal | Queue API | Fast image, video, audio, speech, and 3D generation | Model-specific endpoint schemas; async queue operations |
| Replicate | Predictions API | Community models and reproducible media generation | Prediction lifecycle uses create/poll/cancel; not chat-compatible |

Media generation is represented in the provider taxonomy and generated environment template, but is not wired as a chat-model adapter.

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
| `content-analysis` | Toolless Hermes analysis with isolated permissions |

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

## Doctor, health, and installation help

```bash
./scripts/install.sh doctor
./scripts/install.sh health
./scripts/install.sh --agent opencode --dry-run
./scripts/install.sh --agent claude-code
./scripts/install.sh uninstall
```

Doctor verifies:

- not running as root
- Python availability
- generated manifest presence
- installed OpenCode, omp, Claude Code, Codex, and Goose symlinks
- install commands and supported agents

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

## Community

- ⭐ Star the repo if this saves you time
- 🐛 [Report an issue](https://github.com/jesseoue/universal-agent-config/issues/new?template=bug_report.md)
- 🚀 [Request an agent adapter](https://github.com/jesseoue/universal-agent-config/issues/new?template=feature_request.md)
- 💬 [Start a discussion](https://github.com/jesseoue/universal-agent-config/discussions)
- 🛡️ [Report a security issue](https://github.com/jesseoue/universal-agent-config/security/advisories/new)
- 🤝 Read [CONTRIBUTING.md](CONTRIBUTING.md)

## What’s next

- Runtime smoke tests for every agent CLI
- Homebrew and npm distribution
- Provider health dashboard
- Gateway-aware install commands
- Automatic drift pull requests

## License

MIT © Jesse Ouellette
