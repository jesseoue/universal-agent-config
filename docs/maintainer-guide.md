# Maintainer guide

## Project information

| Field | Value |
| --- | --- |
| Repository | [jesseoue/universal-agent-config](https://github.com/jesseoue/universal-agent-config) |
| License | MIT |
| Default branch | `main` |
| Development dependencies | Python, PyYAML, tomli-w, pytest, ShellCheck |
| Support surface | Adapter generators, gateway starters, installer, docs |
| Runtime dependency | None in generated configs unless deliberately linked |

## Maintenance cadence

| Task | Cadence | Command |
| --- | --- | --- |
| Model drift | Daily CI plus manual refresh | `python3 scripts/refresh_models.py` |
| Full verification | Every push and release | `python3 scripts/generate.py && python3 scripts/validate.py && pytest -q` |
| Installer safety | Every push | `bash tests/test_installer.sh` |
| Tool compatibility | Monthly or after major agent releases | Update README version table |
| Community health | Weekly | Triage issues, discussions, security advisories |
| Release | After a meaningful, releasable change | Tag `vX.Y.Z` |

## Required checks before merge

```bash
python3 scripts/generate.py
python3 scripts/validate.py
pytest -q
bash tests/test_installer.sh
shellcheck scripts/install.sh
git diff --check
```

CI also runs secret scanning and confirms generated artifacts are current.

## Triage labels

| Label | Meaning |
| --- | --- |
| `bug` | Incorrect generated config, validation, or installer behavior |
| `adapter` | Agent adapter change |
| `gateway` | Routing technology change |
| `model-drift` | OpenRouter catalog or model capability change |
| `documentation` | Docs or examples |
| `good first issue` | Clearly scoped newcomer work |
| `help wanted` | Maintainer-reviewed work open to contributors |

## Release process

1. Confirm `main` is clean and CI is green.
2. Refresh model metadata and review the diff.
3. Regenerate and run the full verification suite.
4. Update compatibility tables and release notes if needed.
5. Tag a semantic version: `git tag vX.Y.Z && git push origin vX.Y.Z`.
6. Confirm the release workflow creates the GitHub Release.

## Community and safety

- Enforce the Code of Conduct consistently and privately.
- Route vulnerability reports through GitHub security advisories.
- Keep public defaults telemetry-free and local-first.
- Treat model capability claims as time-sensitive.
- Do not accept generated configs that weaken permissions or expose secrets.
