# Contributing

Thanks for helping improve Universal Agent Config.

This project wants contributions from people who use different coding agents, gateways, and model providers. You do not need to be an AI expert to contribute; clear bug reports, docs, and compatibility checks are just as useful as adapter code.

Read [Code of Conduct](CODE_OF_CONDUCT.md), [Architecture](docs/architecture.md), and the [Contributor guide](docs/contributor-guide.md) before your first PR.

## Development setup

```bash
python3 -m pip install pyyaml tomli-w pytest
python3 scripts/generate.py
python3 scripts/validate.py
pytest -q
bash tests/test_installer.sh
```

## Ground rules

- Edit files under `core/`, never under `generated/`.
- Run `python3 scripts/generate.py` after every core change.
- Include tests for new adapters and gateways.
- Keep public defaults safe and auditable.
- Never commit API keys, local absolute paths, or generated logs.
- Treat model facts as time-sensitive and verify them against the live catalog.

## Pull request checklist

- `python3 scripts/validate.py` passes
- `pytest -q` passes
- `bash tests/test_installer.sh` passes
- `git diff --check` passes
- README compatibility matrix is updated
- New behavior is documented
- No secrets, local absolute paths, or personal data are included

## Adapter contributions

1. Add the canonical model and routing behavior to `core/`.
2. Add a generator function for the target agent.
3. Add generated-file expectations to `scripts/validate.py`.
4. Add tests for deterministic generation.
5. Add sandboxed install coverage.
6. Document the native config path and limitations.

## Gateway contributions

1. Add gateway semantics to `core/gateways.yml`.
2. Generate any native starter config under `generated/gateways/`.
3. Document auth, base URL, model naming, fallback behavior, and operational tradeoffs.
4. Add validation for required gateway artifacts.

## Reporting bugs

Include the agent name, version, generated config, expected behavior, and actual behavior. Redact all credentials.

For vulnerabilities, use [SECURITY.md](SECURITY.md) instead of a public issue.

## Project values

- Native output over magic wrappers
- Conservative safety defaults
- Documented compatibility with dates and versions
- Deterministic generated artifacts
- Useful contributions over activity theater
