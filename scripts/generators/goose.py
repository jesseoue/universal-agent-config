from __future__ import annotations

from pathlib import Path

from common import dump_json, dump_toml, dump_yaml, load_json, load_yaml, model_option

ROOT = Path(__file__).resolve().parents[2]


def generate_goose(models, routing, policy, providers, tools=None) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    provider = providers["openrouter"]
    default_model = profile["roles"]["default"]["primary"]
    contract = (tools or load_yaml(ROOT / "core" / "tools.yml"))["contract"]
    tool_profile = contract["profiles"][routing["default_profile"]]
    logging = contract["logging"]

    config = {
        "default": {
            "provider": "openrouter",
            "model": default_model,
            "temperature": 0.2,
        },
        "provider": {
            "openrouter": {
                "base_url": provider["base_url"],
                "api_key_env": provider["api_key_env"],
            }
        },
        "extensions": {
            "developer": {"enabled": True, "timeout": 300},
            "developer_docs": {"enabled": True},
        },
        "GOOSE_MODE": "auto" if tool_profile["shell"] else "approve",
        "tools": {
            "read": tool_profile["read"],
            "edit": tool_profile["edit"],
            "shell": tool_profile["shell"],
            "browser": tool_profile["browser"],
            "web_search": tool_profile["web_search"],
        },
        "logging": {
            "level": logging["level"],
            "redact": logging["redact"],
        },
        "otel": {
            "enabled": False,
        },
    }
    dump_yaml(config, Path("generated") / "goose" / "config.yaml")
