from __future__ import annotations

import tomllib

import yaml

import shutil
from pathlib import Path

from common import dump_json, dump_text, dump_toml, dump_yaml, load_json, load_yaml, model_option
def generate_opencode(models, routing, policy, providers) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    provider = providers["openrouter"]
    default_model = profile["roles"]["default"]["primary"]
    small_model = profile["roles"]["background"]["primary"]

    opencode_models = {
        model_id: {
            "name": model["display_name"],
            "id": model_id,
            "family": model["family"],
            "provider": "openrouter",
            **model_option(model),
        }
        for model_id, model in models["models"].items()
    }

    config = {
        "$schema": "https://opencode.ai/config.json",
        "model": f"openrouter/{default_model}",
        "small_model": f"openrouter/{small_model}",
        "enabled_providers": ["openrouter"],
        "disabled_providers": [],
        "provider": {
            "openrouter": {
                "npm": "@ai-sdk/openai-compatible",
                "name": "OpenRouter",
                "options": {
                    "baseURL": provider["base_url"],
                    "apiKey": "{env:OPENROUTER_API_KEY}",
                    "headers": {
                        "HTTP-Referer": provider["attribution"]["http_referer"],
                        "X-Title": provider["attribution"]["x_title"],
                    },
                    "timeout": policy["defaults"]["request_timeout_seconds"] * 1000,
                    "headerTimeout": policy["defaults"]["request_timeout_seconds"] * 1000,
                    "chunkTimeout": policy["defaults"]["stalled_chunk_timeout_seconds"] * 1000,
                },
                "models": opencode_models,
                "modelsCache": "revalidate",
            }
        },
        "instructions": "AGENTS.md",
        "share": False,
        "logLevel": "ERROR",
        "tool_output": {"max_lines": 300, "max_bytes": 12000},
        "mcp": {
            "context7": {
                "type": "remote",
                "url": "https://mcp.context7.com/mcp",
                "enabled": True,
                "headers": {"CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}"},
            }
        },
    }
    dump_json(config, Path("generated") / "opencode" / "opencode.json")
    shutil.copyfile(Path(__file__).resolve().parents[2] / "core" / "prompts" / "core.md", Path("generated") / "opencode" / "AGENTS.md")
