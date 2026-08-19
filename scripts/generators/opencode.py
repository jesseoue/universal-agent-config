from __future__ import annotations

import tomllib
import json

import yaml

import shutil
from pathlib import Path

from common import dump_json, dump_text, dump_toml, dump_yaml, load_json, load_yaml, model_option
def generate_opencode(models, routing, policy, providers, starters) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    provider = providers["openrouter"]
    default_model = profile["roles"]["default"]["primary"]
    small_model = profile["roles"]["background"]["primary"]
    performance = policy["performance"]
    permission_profile = starters["starters"].get("implement", starters["starters"]["balanced"]).get(
        "permissions",
        {"read": True, "edit": True, "shell": True, "browser": True, "web_search": True},
    )

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
            }
        },
        "plugin": [starters["adapters"]["opencode"]["pin"]],
        "instructions": "AGENTS.md",
        "share": False,
        "logLevel": "ERROR",
        "tool_output": {"max_lines": 300, "max_bytes": 12000},
        "compaction": {
            "auto": performance["compaction"]["auto"],
            "prune": performance["compaction"]["prune"],
            "reserved": performance["compaction"]["reserve_tokens"],
            "tail_turns": performance["compaction"]["tail_turns"],
        },
        "permission": {
            "read": "allow" if permission_profile["read"] else "deny",
            "glob": "allow",
            "grep": "allow",
            "list": "allow",
            "edit": "allow" if permission_profile["edit"] else "deny",
            "bash": "allow" if permission_profile["shell"] else "deny",
            "task": "allow",
            "webfetch": "allow" if permission_profile["browser"] else "deny",
            "websearch": "allow" if permission_profile["web_search"] else "deny",
        },
        "subagent_depth": 1,
        "default_agent": "sisyphus",
        "autoupdate": False,
        "snapshot": False,
        "agent": {
            "sisyphus": {
                "description": "Default orchestrator; delegates cheap and deep work deliberately",
                "model": f"openrouter/{default_model}",
                "prompt": "Lead the task, parallelize independent reads, delegate bounded work, and verify with real command output.",
                "tools": {"edit": True, "write": True, "bash": True, "webfetch": True, "websearch": True},
            },
            "hephaestus": {
                "description": "Implementation worker for edit-capable bounded changes",
                "model": f"openrouter/{default_model}",
                "prompt": "Read the brief and call sites, make the smallest correct diff, and run the acceptance check.",
                "tools": {"edit": True, "write": True, "bash": True, "webfetch": True, "websearch": True},
            },
            "review": {
                "description": "Read-only code review with no edit or shell tools",
                "model": f"openrouter/{default_model}",
                "prompt": "Review code for correctness, security, performance, and maintainability. Do not edit files or run commands.",
                "tools": {"edit": False, "write": False, "bash": False},
            },
            "prometheus": {
                "description": "Deep planning lane; frontier spend must be explicit",
                "model": "openrouter/deepseek/deepseek-v4-pro-0813",
                "prompt": "Create an executable plan with paths, evidence, invariants, dependencies, and verification commands. Do not edit product code.",
                "tools": {"edit": False, "write": False, "bash": False, "webfetch": True, "websearch": True},
            },
            "analyze": {
                "description": "Toolless long-form and sensitive-content analysis",
                "model": "openrouter/nousresearch/hermes-4-405b",
                "prompt": "Analyze and explain. Do not use tools, edit files, run commands, or browse the web.",
                "tools": {"edit": False, "write": False, "bash": False, "webfetch": False, "websearch": False},
            },
        },
        "mcp": {
            "context7": {
                "type": "remote",
                "url": "https://mcp.context7.com/mcp",
                "enabled": True,
                "timeout": performance["mcp_timeout_seconds"] * 1000,
                "headers": {"CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}"},
            }
        },
        "omo": {
            "path": "~/.omo/omo.jsonc",
            "mode": "user",
            "note": "OpenCode loads the oh-my-openagent plugin; OMO reads this unified user-layer file.",
        },
    }
    dump_json(config, Path("generated") / "opencode" / "opencode.json")
    omo_config = {
        "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/omo.schema.json",
        "models": {
            "default": {"model": f"openrouter/{default_model}"},
            "fast": {"model": f"openrouter/{small_model}"},
            "reasoning": {"model": f"openrouter/{profile['roles']['reasoning']['primary']}"},
        },
        "telemetry": {"enabled": False},
        "[opencode]": {
            "agents": {
                "sisyphus": {"model": "default", "reasoning": "medium"},
                "hephaestus": {"model": "default", "reasoning": "high"},
                "prometheus": {"model": "reasoning", "reasoning": "high"},
                "librarian": {"model": "fast"},
                "explore": {"model": "fast"},
                "oracle": {"model": "reasoning", "reasoning": "high"},
            },
            "background_task": {
                "defaultConcurrency": performance["concurrency"]["default"],
                "staleTimeoutMs": 180000,
                "providerConcurrency": {"openrouter": performance["concurrency"]["provider"]},
                "modelConcurrency": {
                    f"openrouter/{default_model}": 8,
                    f"openrouter/{small_model}": 10,
                    "openrouter/deepseek/deepseek-v4-pro-0813": performance["concurrency"]["expensive"],
                    "openrouter/nousresearch/hermes-4-405b": performance["concurrency"]["analysis"],
                },
                "maxDepth": performance["concurrency"]["max_depth"],
                "maxToolCalls": 200,
                "circuitBreaker": {
                    "enabled": True,
                    "maxToolCalls": 160,
                    "consecutiveThreshold": 8,
                },
            },
            "mcp_env_allowlist": ["CONTEXT7_API_KEY"],
            "tmux": {"enabled": False},
        },
    }
    dump_text(json.dumps(omo_config, indent=2) + "\n", Path("generated") / "opencode" / "omo.jsonc")
    shutil.copyfile(Path(__file__).resolve().parents[2] / "core" / "prompts" / "core.md", Path("generated") / "opencode" / "AGENTS.md")
