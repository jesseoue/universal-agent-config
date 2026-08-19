from __future__ import annotations

import shutil
from pathlib import Path

from common import dump_json, dump_toml, load_json, load_yaml, model_option

ROOT = Path(__file__).resolve().parents[2]


def generate_codex(models, routing, policy, providers, tools=None, starters=None) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    provider = providers["openrouter"]
    default_model = profile["roles"]["default"]["primary"]
    logging = (tools or load_yaml(ROOT / "core" / "tools.yml"))["contract"]["logging"]
    performance = policy["performance"]
    agent_policy = (starters or load_yaml(ROOT / "core" / "starters.yml"))["adapters"]["codex"]["agents"]

    config = {
        "model": default_model,
        "model_provider": "openrouter",
        "model_reasoning_effort": performance["reasoning_effort"],
        "model_reasoning_summary": "concise",
        "model_verbosity": "low",
        "model_providers": {
            "openrouter": {
                "name": "OpenRouter",
                "base_url": provider["base_url"],
                "env_key": provider["api_key_env"],
                "request_max_retries": policy["defaults"]["max_retries"],
                "stream_idle_timeout_ms": policy["defaults"]["stalled_chunk_timeout_seconds"] * 1000,
                "stream_max_retries": policy["defaults"]["max_retries"],
                "wire_api": "responses",
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
                "startup_timeout_sec": performance["mcp_startup_timeout_seconds"],
                "tool_timeout_sec": performance["mcp_timeout_seconds"],
                "required": False,
            }
        },
        "approval_policy": "on-request",
        "sandbox_mode": "workspace-write",
        "log_level": logging["level"],
        "agents": {
            "enabled": agent_policy["enabled"],
            "max_concurrent_threads_per_session": agent_policy["max_concurrent_threads"],
            "default_subagent_model": agent_policy["default_subagent_model"],
            "default_subagent_reasoning_effort": agent_policy["default_subagent_reasoning_effort"],
        },
    }
    dump_toml(config, Path("generated") / "codex" / "config.toml")
    shutil.copyfile(ROOT / "core" / "prompts" / "core.md", Path("generated") / "codex" / "AGENTS.md")
