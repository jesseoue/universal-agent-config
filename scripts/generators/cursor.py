from __future__ import annotations

from pathlib import Path

from common import dump_json, dump_text


def _frontmatter(rule: dict) -> str:
    lines = ["---"]
    if "description" in rule:
        lines.append(f"description: {rule['description']}")
    if "globs" in rule:
        lines.append(f"globs: {rule['globs']}")
    lines.append(f"alwaysApply: {str(rule['alwaysApply']).lower()}")
    lines.extend(["---", ""])
    return "\n".join(lines)


def generate_cursor(models, routing, policy, providers, starters=None) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    rules = {
        "00-universal-agent-core.mdc": {
            "description": "Universal Agent Config core behavior and safety policy",
            "alwaysApply": True,
            "body": """# Universal Agent Config core

Read the relevant code and project instructions before editing.

- Make the smallest correct change and preserve unrelated work.
- Keep secrets out of prompts, diffs, logs, and generated files.
- Ask before destructive commands or changes with high blast radius.
- Run targeted checks proportional to the change before handoff.
- Separate verified facts from assumptions and clearly state blockers.
- Prefer reversible operations and backups for user-owned local state.
""",
        },
        "01-model-routing.mdc": {
            "description": "Cost-aware OpenRouter model lane selection and escalation policy",
            "alwaysApply": True,
            "body": f"""# Model routing

Lane defaults:

- Daily coding lead: `{profile['roles']['default']['primary']}`
- Deep planning and difficult debugging: `{profile['roles']['reasoning']['primary']}`
- Background summaries and bounded subtasks: `{profile['roles']['background']['primary']}`
- Screenshots and multimodal input: `{profile['roles']['vision']['primary']}`

Routing policy:

- Start on the daily lead for tool-driven coding.
- Escalate to the deep lane for architecture, migrations, security-sensitive changes, or repeated failure.
- Use the frontier lane only when the user explicitly accepts that spend or the blast radius justifies it.
- Keep generated titles, summaries, and compaction on the cheap background lane.
- When switching the OpenAI base URL or model family, start a fresh Cursor chat instead of reusing a stale thread.

Cursor + OpenRouter setup:

- Override OpenAI Base URL: `https://openrouter.ai/api/v1/cursor`
- Do not use `https://openrouter.ai/api/v1` in Cursor; the dedicated Cursor endpoint handles its tool-call format.
- Use exact OpenRouter model IDs from the model list. Router aliases require the `~` prefix.
- Set `OPENROUTER_API_KEY` through Cursor's API-key settings, not in repository files.
""",
        },
        "02-planning.mdc": {
            "description": "Planning workflow for architecture, migrations, and high-blast-radius changes",
            "alwaysApply": False,
            "body": """# Planning

Before implementation:

- Identify current behavior, affected surfaces, rollback path, and verification commands.
- Check migration journals, API contracts, ownership boundaries, and dependent callers.
- Split work into reversible steps when possible.
- Define completion as both implementation and evidence, not prose.

For migrations, verify that the journal and deployed schema agree. For multi-file changes, map each consumer before editing shared interfaces.
""",
        },
        "03-testing.mdc": {
            "description": "Reproduce-first testing, targeted checks, and honest verification policy",
            "globs": "**/test*,**/tests/**,**/spec*,**/specs/**,**/e2e/**,**/*.test.*,**/*.spec.*",
            "alwaysApply": False,
            "body": """# Testing

- Reproduce a failure before changing code.
- Prefer the narrowest useful checks, then the project's full verification suite when risk justifies it.
- Do not delete, skip, weaken, or mark tests as expected to fail merely to make a run pass.
- Investigate flaky tests with evidence and scope before retrying.
- Report exact commands and outcomes, and distinguish unit checks from runtime or end-to-end verification.
""",
        },
        "04-typescript.mdc": {
            "description": "TypeScript and React implementation conventions",
            "globs": "**/*.ts,**/*.tsx,**/*.mts,**/*.cts",
            "alwaysApply": False,
            "body": """# TypeScript

- Prefer precise types over broad casts or `any`.
- Keep public interfaces explicit and update consumers when contracts change.
- Use immutable updates for state and data transformations.
- Keep component logic small and colocated; extract reusable behavior only when it has a second consumer.
- Run the project formatter, typecheck, and relevant test command before handoff.
""",
        },
        "05-python.mdc": {
            "description": "Python implementation conventions",
            "globs": "**/*.py",
            "alwaysApply": False,
            "body": """# Python

- Follow the project's packaging, import, and formatting conventions.
- Prefer explicit boundaries over global mutable state.
- Use `pathlib` for filesystem paths and safe temporary directories for generated artifacts.
- Keep dependencies pinned to the project manifest.
- Run targeted pytest tests, plus lint and typecheck when configured.
""",
        },
        "06-documentation.mdc": {
            "description": "Documentation, changelog, and README writing conventions",
            "globs": "**/*.md,**/*.mdx",
            "alwaysApply": False,
            "body": """# Documentation

- Lead with the outcome, then the setup or decision rationale.
- Keep installation, configuration, and troubleshooting steps copyable.
- Mark time-sensitive model, pricing, and availability claims as such.
- Prefer one canonical explanation over duplicated statements that can drift.
- Do not describe untested behavior as verified or deployed.
""",
        },
        "07-security-review.mdc": {
            "description": "Security review checklist for authentication, secrets, dependencies, injection, and severity",
            "alwaysApply": False,
            "body": """# Security review

Check:

- Authentication, authorization, tenant isolation, and session boundaries.
- Secret storage, logging, shell interpolation, SSRF, path traversal, and injection sinks.
- Dependency reachability and exploitability, not just advisory presence.
- Rollback and blast radius for proposed remediation.

High or critical findings require a demonstrated exploit and meaningful impact. HTTP status, simulated output, or a suspicious sink alone is insufficient evidence.
""",
        },
    }

    for filename, rule in rules.items():
        dump_text(_frontmatter(rule) + rule["body"], Path("generated") / "cursor" / ".cursor" / "rules" / filename)

    mcp = {
        "mcpServers": {
            "context7": {
                "url": "https://mcp.context7.com/mcp",
                "headers": {"CONTEXT7_API_KEY": "${env:CONTEXT7_API_KEY}"},
            }
        }
    }
    dump_json(mcp, Path("generated") / "cursor" / ".cursor" / "mcp.json")

    ignore = """# Secrets and credentials
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
"""
    dump_text(ignore, Path("generated") / "cursor" / ".cursorignore")
