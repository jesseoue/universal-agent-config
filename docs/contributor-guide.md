# Contributor guide

This guide is the repo-managed replacement for a separate Git-backed wiki. It is versioned, reviewed, and tested with the code.

## Ways to help

| Area | Good first contribution | Skills |
| --- | --- | --- |
| Adapter support | Add a missing config key or improve validation | Python, target-agent config format |
| Gateway support | Add a gateway artifact or clarify routing semantics | LiteLLM, Cloudflare, Vercel, Portkey |
| Model catalog | Refresh metadata and document drift | YAML, OpenRouter API |
| Docs | Clarify compatibility, installation, or architecture | Technical writing |
| Safety | Strengthen permissions, redaction, or sandboxing | Security review |
| Tests | Add deterministic generation or installer coverage | Python, shell |

## Development loop

For the web generator:

```bash
cd web
pnpm install
pnpm run sync:catalog
pnpm run verify
```

```bash
git clone https://github.com/jesseoue/universal-agent-config.git
cd universal-agent-config
python3 -m pip install pyyaml tomli-w pytest
python3 scripts/generate.py
python3 scripts/validate.py
pytest -q
bash tests/test_installer.sh
```

Start from the relevant canonical file, not the generated artifact. If you need different adapter behavior, update `core/`, regenerate, and let the native output follow.

## Adding an adapter

1. Verify the target agent's current official config schema and install path.
2. Add a generator in `scripts/generators/`.
3. Register it in `scripts/generate.py` and `scripts/generators/__init__.py`.
4. Add generated-artifact expectations to `scripts/validate.py`.
5. Add deterministic tests and sandboxed installer coverage.
6. Add an install branch to `scripts/install.sh`.
7. Update the README compatibility matrix, manifest, and doctor destinations.

## Adding a gateway

1. Add semantics to `core/gateways.yml`.
2. Generate a starter artifact or environment template under `generated/gateways/`.
3. Document auth, base URL, model naming, tool behavior, fallbacks, and operational tradeoffs.
4. Add validation for required artifacts.
5. Keep OpenRouter as the public default until runtime tests cover the alternative.

## Maintaining models

```bash
python3 scripts/refresh_models.py
python3 scripts/generate.py
python3 scripts/validate.py
```

Review every model diff. A model change can affect context limits, tool support, vision support, pricing, and lane safety. Never silently promote a toolless model into a tool-driven coding lane.

## Review expectations

Maintainers look for:

- canonical policy remains the source of truth
- generated output is native and deterministic
- adapter keys are documented by the target tool
- permissions and telemetry remain conservative
- tests and validation cover the new behavior
- compatibility claims include checked versions or dates

## Branching and releases

- Work in forks or short-lived branches.
- PRs must pass CI.
- `main` is always releasable.
- Semantic tags run the full verification workflow and create a GitHub release.
