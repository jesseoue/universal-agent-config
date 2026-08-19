from __future__ import annotations

import tomllib

import yaml

import shutil
from pathlib import Path

from common import dump_json, dump_text, dump_toml, dump_yaml, load_json, load_yaml, model_option
def generate_omp(models, routing, policy, providers, starters=None) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    provider = providers["openrouter"]
    roles = {
        "default": profile["roles"]["default"]["primary"],
        "smol": profile["roles"]["background"]["primary"],
        "slow": profile["roles"]["reasoning"]["primary"],
        "plan": profile["roles"]["reasoning"]["primary"],
        "vision": profile["roles"]["vision"]["primary"],
        "designer": profile["roles"]["default"]["primary"],
        "commit": profile["roles"]["background"]["primary"],
        "tiny": profile["roles"]["background"]["primary"],
        "task": profile["roles"]["default"]["primary"],
        "advisor": profile["roles"]["reasoning"]["primary"],
    }

    chains = {}
    for role, lane in profile["roles"].items():
        omp_role = {
            "default": "default",
            "background": "smol",
            "reasoning": "slow",
            "vision": "vision",
        }.get(role, role)
        chains[omp_role] = lane["fallbacks"]

    config = {
        "modelRoles": {k: f"openrouter/{v}" for k, v in roles.items()},
        "retry": {
            "maxRetries": policy["defaults"]["max_retries"],
            "modelFallback": True,
            "fallbackRevertPolicy": "cooldown-expiry",
            "fallbackChains": chains,
        },
        "cycleOrder": ["smol", "default", "slow"],
        "modelProviderOrder": ["openrouter"],
        "advisor": {
            "enabled": True,
            "syncBacklog": "off",
            "immuneTurns": 3,
        },
        "tools": {
            "approvalMode": "normal",
            "bash": {"autoBackground": True},
        },
        "thinkingBudgets": {
            "defaultThinkingLevel": "high",
            "minimal": 1024,
            "low": 2048,
            "medium": 4096,
            "high": 8192,
            "xhigh": 16384,
            "max": 32768,
        },
        "compaction": {
            "strategy": "snapcompact",
            "reserveTokens": 16384,
            "midTurnEnabled": True,
            "keepRecentTokens": 20000,
            "midTurnEnabled": True,
            "autoContinue": True,
        },
        "tools": {
            "format": "auto",
            "approvalMode": "write",
            "maxTimeout": 300,
            "outputMaxColumns": 768,
        },
    }

    models_config = {
        "providers": {
            "openrouter": {
                "baseUrl": provider["base_url"],
                "api": "openai-completions",
                "apiKey": provider["api_key_env"],
                "authHeader": True,
                "modelOverrides": {
                    model_id: {
                        "contextWindow": model["context_window"],
                        "maxTokens": model["max_output_tokens"],
                        "reasoning": bool(model["reasoning"]),
                        "compat": {
                            "supportsReasoningEffort": bool(model["reasoning"]),
                            "openRouterRouting": {"only": model["providers"]},
                        },
                    }
                    for model_id, model in models["models"].items()
                },
            }
        }
    }

    dump_yaml(config, Path("generated") / "omp" / "config.yml")
    dump_yaml(models_config, Path("generated") / "omp" / "models.yml")
    dump_json(
        {
            "mcpServers": {
                "context7": {
                    "type": "http",
                    "url": "https://mcp.context7.com/mcp",
                    "headers": {"CONTEXT7_API_KEY": "${CONTEXT7_API_KEY:-}"},
                }
            }
        },
        Path("generated") / "omp" / "mcp.json",
    )
