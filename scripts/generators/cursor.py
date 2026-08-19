from __future__ import annotations

import tomllib

import yaml

import shutil
from pathlib import Path

from common import dump_json, dump_text, dump_toml, dump_yaml, load_json, load_yaml, model_option
def generate_cursor(models, routing, policy, providers, starters=None) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    default_model = profile["roles"]["default"]["primary"]
    rule = f"""---
description: Universal Agent Config routing and policy
alwaysApply: true
---

# Universal Agent Config

- Default model lane: `{default_model}`
- Reasoning lane: `{profile['roles']['reasoning']['primary']}`
- Background lane: `{profile['roles']['background']['primary']}`
- Vision lane: `{profile['roles']['vision']['primary']}`
- Provider: OpenRouter (`OPENROUTER_API_KEY`)
- Telemetry: disabled
- Confirm destructive commands: {str(policy['defaults']['confirm_destructive_commands']).lower()}

Read relevant code before editing, make minimal changes, preserve unrelated work, run targeted checks, and never expose secrets.
"""
    dump_text(rule, Path("generated") / "cursor" / ".cursor" / "rules" / "universal-agent-config.mdc")
