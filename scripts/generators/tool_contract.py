from __future__ import annotations

import tomllib

import yaml

import shutil
from pathlib import Path

from common import dump_json, dump_text, dump_toml, dump_yaml, load_json, load_yaml, model_option
def generate_tool_contract(tools) -> None:
    contract = tools["contract"]
    dump_yaml(
        {
            "tools": contract["tools"],
            "interfaces": contract["interfaces"],
            "profiles": contract["profiles"],
            "logging": contract["logging"],
        },
        Path("generated") / "tools" / "contract.yml",
    )
    dump_json(
        {
            "mcpServers": {
                name: {
                    "type": server["type"],
                    "url": server["url"],
                    "headers": {server["auth"]["env"]: "${" + server["auth"]["env"] + ":-}"},
                }
                for name, server in contract["servers"].items()
            }
        },
        Path("generated") / "tools" / "mcp.json",
    )
    dump_json(
        tools["provider_tool_semantics"],
        Path("generated") / "tools" / "provider-semantics.json",
    )

    profile_name = "balanced"
    tool_profile = contract["profiles"][profile_name]
    logging = contract["logging"]

    # omp: tool permissions, MCP, and logging.
    omp_config_path = Path("generated") / "omp" / "config.yml"
    omp_config = load_yaml(omp_config_path)
    omp_config["tools"] = {
        "read": tool_profile["read"],
        "edit": tool_profile["edit"],
        "bash": tool_profile["shell"],
        "browser": tool_profile["browser"],
        "web_search": tool_profile["web_search"],
        "approvalMode": "normal" if tool_profile["confirm_destructive_commands"] else "yolo",
    }
    omp_config["logging"] = {
        "level": logging["level"],
        "telemetry": logging["telemetry"],
        "redact": logging["redact"],
    }
    omp_config["mcp"] = {
        "enableProjectConfig": True,
        "renderMarkdownResults": True,
    }
    dump_yaml(omp_config, omp_config_path)

    # OpenCode already carries MCP and logging; normalize permission fields.
    opencode_path = Path("generated") / "opencode" / "opencode.json"
    opencode = load_json(opencode_path)
    opencode["permission"] = {
        "read": "allow" if tool_profile["read"] else "deny",
        "edit": "allow" if tool_profile["edit"] else "deny",
        "bash": "allow" if tool_profile["shell"] else "deny",
        "webfetch": "allow" if tool_profile["browser"] else "deny",
    }
    opencode["logLevel"] = logging["level"].upper()
    opencode["tool_output"] = logging["tool_output"]
    dump_json(opencode, opencode_path)

    # Claude Code permissions and traffic minimization.
    claude_path = Path("generated") / "claude-code" / "settings.json"
    claude = load_json(claude_path)
    claude["permissions"] = {
        "allow": ["Read"] + (["Edit", "Bash", "WebFetch"] if tool_profile["edit"] else []),
        "deny": [
            "Bash(rm -rf *)",
            "Read(.env)",
            "Read(**/.env)",
            "Read(**/secrets/**)",
        ],
    }
    claude["env"]["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = "1" if logging["telemetry"] is False else "0"
    dump_json(claude, claude_path)

    # Codex logging and approval policy.
    codex_path = Path("generated") / "codex" / "config.toml"
    codex = tomllib.loads(codex_path.read_text())
    codex["log_level"] = logging["level"]
    codex["approval_policy"] = "on-request" if tool_profile["confirm_destructive_commands"] else "never"
    dump_toml(codex, codex_path)

    # Goose tool permissions and logging.
    goose_path = Path("generated") / "goose" / "config.yaml"
    goose = load_yaml(goose_path)
    goose["tools"] = {
        "read": tool_profile["read"],
        "edit": tool_profile["edit"],
        "shell": tool_profile["shell"],
        "browser": tool_profile["browser"],
        "web_search": tool_profile["web_search"],
    }
    goose["logging"] = {
        "level": logging["level"],
        "redact": logging["redact"],
    }
    dump_yaml(goose, goose_path)
