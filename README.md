# Universal Agent Config

One canonical model-routing and agent-policy repository, generating native configuration for common open-source coding agents.

Model metadata in [`core/models.yml`](core/models.yml) is refreshed directly from the live [OpenRouter model catalog](https://openrouter.ai/api/v1/models). Run `python3 scripts/refresh_models.py` to update capabilities, context windows, and output limits from OpenRouter before changing routing lanes.

Supported adapters:

- OpenCode
- omp (Oh My Pi)
- Claude Code
- Codex
- Cursor
- Aider
- Goose

Install an adapter from a clone:

```bash
./scripts/install.sh --agent opencode
```

Generate all native configs:

```bash
python3 scripts/generate.py
```

Validate everything offline:

```bash
python3 scripts/validate.py
```

## Requirements

- Python 3.11+
- PyYAML
- `tomli-w` for Codex config generation
- pytest for tests

Install locally:

```bash
python3 -m pip install pyyaml tomli-w pytest
```

## Strategy

Humans edit `core/`; CI generates every adapter under `generated/`. This keeps model routing, fallback policy, permissions, and prompts consistent across agents while allowing each adapter to preserve the native configuration format and installation path expected by that tool.

## Safety

- Public defaults preserve user confirmation for destructive commands.
- Shell, editing, and browser tools are enabled, but the policy is auditable.
- Telemetry is disabled by default.
- API keys stay in local environment files and are never committed.
- Installation is user-local and non-destructive.

## Status

This repository is an initial public framework. OpenRouter model metadata was seeded from the current omp and OpenCode configurations on 2026-08-19. Live provider health should be revalidated before releases.
