# Contributing

Thanks for helping improve Universal Agent Config.

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
