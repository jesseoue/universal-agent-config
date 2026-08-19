from __future__ import annotations

import shutil
from pathlib import Path

from common import dump_json, dump_toml, dump_yaml, load_json, load_yaml, model_option

ROOT = Path(__file__).resolve().parents[2]


def generate_claude_code(models, routing, policy, providers, tools=None, starters=None) -> None:
    contract = (tools or load_yaml(ROOT / "core" / "tools.yml"))["contract"]
    tool_profile = contract["profiles"][routing["default_profile"]]
    logging = contract["logging"]
    adapter = (starters or load_yaml(ROOT / "core" / "starters.yml"))["adapters"]["claude-code"]

    settings = {
        "env": {
            "ANTHROPIC_BASE_URL": adapter["base_url"],
            "ANTHROPIC_API_KEY": "${OPENROUTER_API_KEY}",
            "ANTHROPIC_MODEL": adapter["model"],
            "ANTHROPIC_SMALL_FAST_MODEL": adapter["small_fast_model"],
            "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "0" if logging["telemetry"] else "1",
        },
        "permissions": {
            "allow": ["Read"] + (["Edit", "Bash", "WebFetch", "WebSearch"] if tool_profile["edit"] else []),
            "deny": [
                "Bash(rm -rf *)",
                "Read(**/.env*)",
                "Read(**/.dev.vars*)",
                "Read(**/secrets/**)",
            ],
        },
        "model": adapter["model"],
        "fallbackModel": [adapter["fallback_model"], adapter["small_fast_model"]],
        "autoCompactEnabled": True,
        "autoCompactWindow": 500000,
        "effortLevel": "high",
    }
    dump_json(settings, Path("generated") / "claude-code" / "settings.json")

    mcp = {
        "mcpServers": {
            "context7": {
                "command": "npx",
                "args": ["-y", "@upstash/context7-mcp"],
                "env": {"CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"},
            }
        }
    }
    dump_json(mcp, Path("generated") / "claude-code" / ".mcp.json")
    shutil.copyfile(ROOT / "core" / "prompts" / "core.md", Path("generated") / "claude-code" / "CLAUDE.md")
