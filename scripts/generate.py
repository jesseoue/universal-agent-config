#!/usr/bin/env python3
"""Generate native agent configurations from the canonical core files."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "generated"


def load_yaml(path: Path):
    with path.open() as handle:
        return yaml.safe_load(handle)


def dump_yaml(data, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as handle:
        yaml.safe_dump(data, handle, sort_keys=False, width=120)


def dump_json(data, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def dump_text(text: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def model_option(model: dict) -> dict:
    return {
        "contextWindow": model["context_window"],
        "maxTokens": model["max_output_tokens"],
        "reasoning": bool(model["reasoning"]),
        "tool_call": bool(model["supports_tools"]),
        "attachment": bool(model["supports_vision"]),
        "provider": {"only": model["providers"]},
    }


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
    dump_json(config, GENERATED / "opencode" / "opencode.json")
    shutil.copyfile(ROOT / "core" / "prompts" / "core.md", GENERATED / "opencode" / "AGENTS.md")


def generate_omp(models, routing, policy, providers) -> None:
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
            "keepRecentTokens": 20000,
            "autoContinue": True,
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

    dump_yaml(config, GENERATED / "omp" / "config.yml")
    dump_yaml(models_config, GENERATED / "omp" / "models.yml")
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
        GENERATED / "omp" / "mcp.json",
    )


def generate_claude_code(models, routing, policy, providers) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    default_model = profile["roles"]["default"]["primary"]
    fallback_model = profile["roles"]["default"]["fallbacks"][0]

    settings = {
        "env": {
            "ANTHROPIC_MODEL": default_model,
            "ANTHROPIC_SMALL_FAST_MODEL": profile["roles"]["background"]["primary"],
            "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
        },
        "permissions": {
            "allow": ["Read", "Edit", "Bash"],
            "deny": ["Bash(rm -rf *)", "Read(.env)", "Read(**/.env)"],
        },
        "model": default_model,
        "fallbackModel": fallback_model,
    }
    dump_json(settings, GENERATED / "claude-code" / "settings.json")
    shutil.copyfile(
        ROOT / "core" / "prompts" / "core.md", GENERATED / "claude-code" / "CLAUDE.md"
    )


def generate_codex(models, routing, policy, providers) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    provider = providers["openrouter"]
    default_model = profile["roles"]["default"]["primary"]

    config = {
        "model": default_model,
        "model_provider": "openrouter",
        "model_reasoning_effort": "high",
        "providers": {
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
        "approval_policy": "on-request",
        "sandbox_mode": "workspace-write",
    }
    dump_toml(config, GENERATED / "codex" / "config.toml")
    shutil.copyfile(ROOT / "core" / "prompts" / "core.md", GENERATED / "codex" / "AGENTS.md")


def generate_cursor(models, routing, policy, providers) -> None:
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
    dump_text(rule, GENERATED / "cursor" / ".cursor" / "rules" / "universal-agent-config.mdc")


def generate_aider(models, routing, policy, providers) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    default_model = profile["roles"]["default"]["primary"]
    config = {
        "model": f"openrouter/{default_model}",
        "editor-model": f"openrouter/{profile['roles']['background']['primary']}",
        "map-tokens": 4096,
        "auto-commits": False,
        "dirty-commits": False,
        "attribute-author": False,
        "attribute-committer": False,
        "dark-mode": True,
    }
    dump_yaml(config, GENERATED / "aider" / ".aider.conf.yml")


def generate_goose(models, routing, policy, providers) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    provider = providers["openrouter"]
    default_model = profile["roles"]["default"]["primary"]
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
    }
    dump_yaml(config, GENERATED / "goose" / "config.yaml")


def generate_gateway_configs(models, routing, policy, providers, gateways) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    roles = profile["roles"]

    # OpenRouter is generated for every agent adapter and remains the default.
    openrouter_env = {
        "OPENROUTER_API_KEY": "required",
        "CONTEXT7_API_KEY": "optional",
    }
    dump_yaml(openrouter_env, GENERATED / "gateways" / "openrouter" / "env.example.yml")

    # Cloudflare is OpenAI-compatible but requires an account-specific base URL.
    cloudflare_env = {
        "CLOUDFLARE_ACCOUNT_ID": "required",
        "CLOUDFLARE_API_TOKEN": "required",
        "CLOUDFLARE_GATEWAY_ID": "optional; defaults to default",
    }
    dump_yaml(cloudflare_env, GENERATED / "gateways" / "cloudflare" / "env.example.yml")
    dump_json(
        {
            "base_url_template": gateways["gateways"]["cloudflare"]["base_url_template"],
            "headers": gateways["gateways"]["cloudflare"]["headers"],
            "model_format": "provider/model",
            "notes": [
                "Point OpenAI-compatible agents at the account-specific /ai/v1 endpoint.",
                "Use a Cloudflare API token with the required AI permissions.",
                "Gateway features include logging, caching, rate limiting, retries, and guardrails.",
            ],
        },
        GENERATED / "gateways" / "cloudflare" / "connection.json",
    )

    # Vercel AI Gateway uses provider/model strings and supports provider options.
    dump_yaml(
        {
            "AI_GATEWAY_API_KEY": "required outside Vercel OIDC",
            "VERCEL_OIDC_TOKEN": "optional on Vercel deployments",
        },
        GENERATED / "gateways" / "vercel" / "env.example.yml",
    )

    # LiteLLM proxy config with role lanes and ordered fallbacks.
    model_names = {
        "default": "uac-default",
        "background": "uac-background",
        "reasoning": "uac-reasoning",
        "vision": "uac-vision",
    }
    litellm_models = []
    for role, lane in roles.items():
        for model_id in [lane["primary"], *lane.get("fallbacks", [])]:
            litellm_models.append(
                {
                    "model_name": model_names[role],
                    "litellm_params": {"model": f"openrouter/{model_id}"},
                }
            )
    litellm_config = {
        "model_list": litellm_models,
        "litellm_settings": {
            "num_retries": policy["defaults"]["max_retries"],
            "request_timeout": policy["defaults"]["request_timeout_seconds"],
        },
        "router_settings": {
            "fallbacks": [
                {model_names[role]: [model_names[role] for _ in lane.get("fallbacks", [])]}
                for role, lane in roles.items()
                if lane.get("fallbacks")
            ]
        },
    }
    dump_yaml(litellm_config, GENERATED / "gateways" / "litellm" / "config.yaml")

    # Portkey fallback policy. Provider credentials remain Portkey virtual keys.
    portkey_config = {
        "strategy": {"mode": "fallback"},
        "targets": [
            {
                "name": lane_name,
                "override_params": {"model": lane["primary"]},
            }
            for lane_name, lane in roles.items()
        ],
    }
    dump_json(portkey_config, GENERATED / "gateways" / "portkey" / "config.json")


def generate_provider_taxonomy(providers) -> None:
    taxonomy = providers["taxonomy"]
    categories = taxonomy["categories"]
    media = taxonomy["media_providers"]

    matrix = {
        "model_gateways": [
            {"name": "OpenRouter", "category": categories["model_gateway"]["description"], "default": True},
            {"name": "Cloudflare AI Gateway", "category": "edge control plane"},
            {"name": "Vercel AI Gateway", "category": "developer gateway"},
            {"name": "LiteLLM Proxy", "category": "self-hosted proxy"},
            {"name": "Portkey AI Gateway", "category": "managed governance gateway"},
        ],
        "model_providers": [
            {"name": provider_name, "models": policy["preferred"] + policy.get("alternates", [])}
            for provider_name, policy in taxonomy["provider_policies"].items()
            if provider_name != "hermes"
        ],
        "media_providers": [
            {
                "name": media_name,
                "protocol": provider["protocol"],
                "base_url": provider.get("base_url"),
                "api_key_env": provider.get("api_key_env"),
                "best_for": provider["best_for"],
                "caveats": provider["caveats"],
            }
            for media_name, provider in media.items()
            if provider.get("category") == "media_provider"
        ],
        "inference_runtimes": [
            {"name": "vLLM", "category": categories["inference_runtime"]["description"]},
            {"name": "Ollama", "category": "local model runtime"},
            {"name": "llama.cpp", "category": "local GGUF runtime"},
            {"name": "SGLang", "category": "high-performance serving"},
        ],
    }
    dump_json(matrix, GENERATED / "providers" / "taxonomy.json")
    dump_yaml(
        {
            "FAL_KEY": "required for Fal media generation",
            "REPLICATE_API_TOKEN": "required for Replicate media generation",
        },
        GENERATED / "providers" / "media.env.example.yml",
    )


def dump_toml(data, path: Path) -> None:
    try:
        import tomli_w
    except ImportError as exc:
        raise RuntimeError("tomli-w is required to generate the Codex config") from exc
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(tomli_w.dumps(data))


def generate_manifest(models, routing, policy) -> None:
    manifest = {
        "name": "universal-agent-config",
        "version": 1,
        "updated": str(models["updated"]),
        "default_profile": routing["default_profile"],
        "adapters": {
            "opencode": ["opencode.json", "AGENTS.md"],
            "omp": ["config.yml", "models.yml", "mcp.json"],
            "claude-code": ["settings.json", "CLAUDE.md"],
            "codex": ["config.toml", "AGENTS.md"],
            "cursor": [".cursor/rules/universal-agent-config.mdc"],
            "aider": [".aider.conf.yml"],
            "goose": ["config.yaml"],
            "providers": ["taxonomy.json", "media.env.example.yml"],
            "gateways": {
                "openrouter": ["env.example.yml"],
                "cloudflare": ["env.example.yml", "connection.json"],
                "vercel": ["env.example.yml"],
                "litellm": ["config.yaml"],
                "portkey": ["config.json"],
            },
        },
        "model_count": len(models["models"]),
    }
    dump_json(manifest, GENERATED / "manifest.json")


def main() -> None:
    models = load_yaml(ROOT / "core" / "models.yml")
    routing = load_yaml(ROOT / "core" / "routing.yml")
    policy = load_yaml(ROOT / "core" / "policy.yml")
    providers = load_yaml(ROOT / "core" / "providers.yml")
    gateways = load_yaml(ROOT / "core" / "gateways.yml")

    if GENERATED.exists():
        shutil.rmtree(GENERATED)
    GENERATED.mkdir(parents=True)

    generate_opencode(models, routing, policy, providers)
    generate_omp(models, routing, policy, providers)
    generate_claude_code(models, routing, policy, providers)
    generate_codex(models, routing, policy, providers)
    generate_cursor(models, routing, policy, providers)
    generate_aider(models, routing, policy, providers)
    generate_goose(models, routing, policy, providers)
    generate_gateway_configs(models, routing, policy, providers, gateways)
    generate_provider_taxonomy(providers)
    generate_manifest(models, routing, policy)

    print("Generated adapters:", ", ".join(sorted(p.name for p in GENERATED.iterdir() if p.is_dir())))


if __name__ == "__main__":
    main()
