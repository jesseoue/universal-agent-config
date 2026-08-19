from __future__ import annotations

import shutil
from pathlib import Path

from common import dump_json, dump_toml, load_json, load_yaml, model_option

ROOT = Path(__file__).resolve().parents[2]


def generate_codex(models, routing, policy, providers, tools=None) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    provider = providers["openrouter"]
    default_model = profile["roles"]["default"]["primary"]
    logging = (tools or load_yaml(ROOT / "core" / "tools.yml"))["contract"]["logging"]

    config = {
        "model": default_model,
        "model_provider": "openrouter",
        "model_reasoning_effort": "high",
        "model_providers": {
            "openrouter": {
                "name": "OpenRouter",
                "base_url": provider["base_url"],
                "env_key": provider["api_key_env"],
                "http_headers": {
                    "HTTP-Referer": provider["attribution"]["http_referer"],
                    "X-Title": provider["attribution"]["x_title"],
                },
            }
        },
        "mcp_servers": {
            "context7": {
                "command": "npx",
                "args": ["-y", "@upstash/context7-mcp"],
                "env": {"CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"},
            }
        },
        "approval_policy": "on-request",
        "sandbox_mode": "workspace-write",
        "log_level": logging["level"],
    }
    dump_toml(config, Path("generated") / "codex" / "config.toml")
    shutil.copyfile(ROOT / "core" / "prompts" / "core.md", Path("generated") / "codex" / "AGENTS.md")
