# Universal Agent Config

This repository is a canonical model-routing and agent-policy monorepo.

## Source of truth

- `core/models.yml`: canonical model metadata.
- `core/routing.yml`: role lanes and fallback chains.
- `core/policy.yml`: permissions, safety, timeout, and telemetry defaults.
- `core/providers.yml`: OpenRouter transport and attribution.
- `core/gateways.yml`: routing-technology matrix and gateway-specific semantics.
- `core/tools.yml`: canonical tool, MCP, plugin, provider-tool semantics, and logging contract.
- `core/starters.yml`: opinionated starter lanes and adapter-specific model-role translation.
- `core/prompts/core.md`: shared agent behavior policy.

## Rules

1. Edit the canonical core; do not manually edit files under `generated/`.
2. Run `python3 scripts/generate.py` after changing core files.
3. Run `python3 scripts/validate.py` and `pytest -q` before handoff.
4. Model availability and provider health are time-sensitive; verify before changing pins or documenting live claims.
5. Keep public defaults conservative: telemetry off, secrets local, destructive commands confirmed.
6. Adapter outputs must be native to each target agent and must not require this repository at runtime unless linked deliberately.
7. Never commit API keys or local absolute paths.
8. Keep adapter translation in `scripts/generators/` and shared serialization in `scripts/common.py`.
9. Add generated-artifact checks when introducing a new adapter or tool interface.
10. Frontier models are deliberate escalation lanes, not defaults. Keep cheap parallel work on the background model and deep planning on the explicit planning model.
11. Adapter config keys must be documented by the target agent. If a desired limit is unsupported, record it in the adapter rationale instead of inventing a key.

## Adapter workflow

1. Inspect the target agent’s current native config format.
2. Add or update the generator function.
3. Add generated-file expectations and cross-reference tests.
4. Add sandboxed install coverage.
5. Document supported install paths in `README.md`.
