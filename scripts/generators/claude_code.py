from __future__ import annotations

import shutil
from pathlib import Path

from common import dump_json, dump_toml, dump_yaml, load_json, load_yaml, model_option

ROOT = Path(__file__).resolve().parents[2]


def generate_claude_code(models, routing, policy, providers, tools=None) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    default_model = profile["roles"]["default"]["primary"]
    fallback_model = profile["roles"]["default"]["fallbacks"][0]
    contract = (tools or load_yaml(ROOT / "core" / "tools.yml"))["contract"]
    tool_profile = contract["profiles"][routing["default_profile"]]
    logging = contract["logging"]

    settings = {
        "env": {
            "ANTHROPIC_MODEL": default_model,
            "ANTHROPIC_SMALL_FAST_MODEL": profile["roles"]["background"]["primary"],
            "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "0" if logging["telemetry"] else "1",
        },
        "permissions": {
            "allow": ["Read"] + (["Edit", "Bash", "WebFetch"] if tool_profile["edit"] else []),
            "deny": [
                "Bash(rm -rf *)",
                "Read(.env)",
                "Read(**/.env)",
                "Read(**/secrets/**)",
            ],
        },
        "model": default_model,
        "fallbackModel": fallback_model,
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
