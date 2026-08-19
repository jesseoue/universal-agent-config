#!/usr/bin/env python3
"""Offline structural and cross-reference validation."""

from __future__ import annotations

import json
import sys
import tomllib
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def load_yaml(path: Path):
    with path.open() as handle:
        return yaml.safe_load(handle)


def load_json(path: Path):
    return json.loads(path.read_text())


def validate_core(models, routing, policy, providers) -> list[str]:
    errors = []
    model_ids = set(models["models"])
    if not model_ids:
        errors.append("core/models.yml contains no models")

    for profile_name, profile in routing["profiles"].items():
        for role_name, lane in profile["roles"].items():
            referenced = [lane["primary"], *lane.get("fallbacks", [])]
            for model_id in referenced:
                if model_id not in model_ids:
                    errors.append(f"{profile_name}.{role_name} references unknown model: {model_id}")
            if lane["primary"] not in model_ids:
                continue
            profile_policy = policy.get("profiles", {}).get(profile_name, {})
            toolless_allowed = not profile_policy.get("allow_shell", True) and not profile_policy.get("allow_edit", True)
            if not toolless_allowed and not models["models"][lane["primary"]]["supports_tools"]:
                errors.append(f"{profile_name}.{role_name} primary must support tools")
            if role_name == "vision":
                for model_id in referenced:
                    if model_id in model_ids and not models["models"][model_id]["supports_vision"]:
                        errors.append(f"{profile_name}.{role_name} references non-vision model: {model_id}")

    if routing["default_profile"] not in routing["profiles"]:
        errors.append("routing.default_profile is missing")
    if providers["openrouter"]["base_url"] != "https://openrouter.ai/api/v1":
        errors.append("OpenRouter base URL is incorrect")
    if providers["openrouter"]["api_key_env"] != "OPENROUTER_API_KEY":
        errors.append("OpenRouter API key environment variable is incorrect")
    if providers["openrouter"]["attribution"]["http_referer"] != "https://github.com/jesseoue/universal-agent-config":
        errors.append("OpenRouter attribution URL is incorrect")
    if policy["defaults"]["telemetry"]:
        errors.append("public default telemetry must be disabled")
    return errors


def validate_generated(models, routing) -> list[str]:
    errors = []
    generated = ROOT / "generated"
    expected = {
        "opencode/opencode.json",
        "opencode/AGENTS.md",
        "omp/config.yml",
        "omp/models.yml",
        "omp/mcp.json",
        "claude-code/settings.json",
        "claude-code/CLAUDE.md",
        "codex/config.toml",
        "codex/AGENTS.md",
        "cursor/.cursor/rules/universal-agent-config.mdc",
        "aider/.aider.conf.yml",
        "goose/config.yaml",
        "gateways/openrouter/env.example.yml",
        "gateways/cloudflare/env.example.yml",
        "gateways/cloudflare/connection.json",
        "gateways/vercel/env.example.yml",
        "gateways/litellm/config.yaml",
        "gateways/portkey/config.json",
        "providers/taxonomy.json",
        "providers/media.env.example.yml",
        "manifest.json",
    }
    for relative in expected:
        if not (generated / relative).is_file():
            errors.append(f"missing generated artifact: {relative}")

    opencode = generated / "opencode" / "opencode.json"
    if opencode.is_file():
        config = load_json(opencode)
        defined = set(config["provider"]["openrouter"]["models"])
        if defined != set(models["models"]):
            errors.append("OpenCode generated model set does not match canonical models")
        if config.get("enabled_providers") != ["openrouter"]:
            errors.append("OpenCode config must enable only OpenRouter")

    omp = generated / "omp" / "config.yml"
    if omp.is_file():
        config = load_yaml(omp)
        role_models = set(config["modelRoles"].values())
        for value in role_models:
            model_id = value.removeprefix("openrouter/")
            if model_id not in models["models"]:
                errors.append(f"omp config references unknown model: {model_id}")

    codex_config = generated / "codex" / "config.toml"
    if codex_config.is_file():
        config = tomllib.loads(codex_config.read_text())
        if config.get("model_provider") != "openrouter":
            errors.append("Codex config must use OpenRouter")
        if config.get("model") not in models["models"]:
            errors.append("Codex config references unknown model")

    aider_config = generated / "aider" / ".aider.conf.yml"
    if aider_config.is_file():
        config = load_yaml(aider_config)
        model_id = config["model"].removeprefix("openrouter/")
        if model_id not in models["models"]:
            errors.append(f"Aider config references unknown model: {model_id}")

    goose_config = generated / "goose" / "config.yaml"
    if goose_config.is_file():
        config = load_yaml(goose_config)
        if config["default"]["model"] not in models["models"]:
            errors.append("Goose config references unknown model")

    return errors


def validate_provider_taxonomy(models, providers) -> list[str]:
    errors = []
    taxonomy = providers["taxonomy"]
    categories = taxonomy["categories"]
    expected = {"model_gateway", "model_provider", "media_provider", "inference_runtime"}
    if set(categories) != expected:
        errors.append(f"provider taxonomy categories mismatch: {sorted(categories)}")

    for lane_name, policy in taxonomy["provider_policies"].items():
        model_ids = []
        if "primary" in policy:
            model_ids.append(policy["primary"])
        if "fallback" in policy:
            model_ids.append(policy["fallback"])
        for model_id in model_ids:
            if model_id not in models["models"]:
                errors.append(f"provider taxonomy {lane_name} references unknown model: {model_id}")

    media = taxonomy["media_providers"]
    if set(media) != {"fal", "replicate", "openrouter_media"}:
        errors.append("media provider set is incomplete")
    for provider_name in ("fal", "replicate"):
        if media[provider_name].get("category") != "media_provider":
            errors.append(f"{provider_name} must be categorized as a media provider")
        if "Not an OpenAI-compatible chat API" not in " ".join(media[provider_name]["caveats"]):
            errors.append(f"{provider_name} must document protocol incompatibility")

    generated = load_json(ROOT / "generated" / "providers" / "taxonomy.json")
    if len(generated["model_gateways"]) != 5:
        errors.append("generated taxonomy must include five model gateways")
    if len(generated["media_providers"]) != 2:
        errors.append("generated taxonomy must include Fal and Replicate")
    if len(generated["inference_runtimes"]) != 4:
        errors.append("generated taxonomy must include four inference runtimes")

    return errors


def validate_gateways(gateways) -> list[str]:
    errors = []
    expected = {"openrouter", "cloudflare", "vercel", "litellm", "portkey"}
    actual = set(gateways["gateways"])
    if actual != expected:
        errors.append(f"gateway set mismatch: expected {sorted(expected)}, got {sorted(actual)}")

    protocols = {
        "openrouter": "openai-chat-completions",
        "cloudflare": "openai-chat-completions",
        "vercel": "provider-model-strings",
        "litellm": "openai-compatible",
        "portkey": "openai-compatible",
    }
    for gateway_name, protocol in protocols.items():
        actual_protocol = gateways["gateways"][gateway_name].get("protocol")
        if actual_protocol != protocol:
            errors.append(f"{gateway_name} protocol must be {protocol}, got {actual_protocol}")

    if gateways["default"] != "openrouter":
        errors.append("default gateway must remain openrouter until runtime tests cover alternatives")

    litellm = load_yaml(ROOT / "generated" / "gateways" / "litellm" / "config.yaml")
    if not litellm.get("model_list"):
        errors.append("LiteLLM config has no model list")
    fallback_count = sum(len(entry.values()) for entry in litellm.get("router_settings", {}).get("fallbacks", []))
    if fallback_count == 0:
        errors.append("LiteLLM config has no fallbacks")

    cloudflare = load_json(ROOT / "generated" / "gateways" / "cloudflare" / "connection.json")
    if "{account_id}" not in cloudflare.get("base_url_template", ""):
        errors.append("Cloudflare connection template must contain {account_id}")

    return errors


def main() -> int:
    models = load_yaml(ROOT / "core" / "models.yml")
    routing = load_yaml(ROOT / "core" / "routing.yml")
    policy = load_yaml(ROOT / "core" / "policy.yml")
    providers = load_yaml(ROOT / "core" / "providers.yml")
    gateways = load_yaml(ROOT / "core" / "gateways.yml")
    errors = validate_core(models, routing, policy, providers)
    errors.extend(validate_generated(models, routing))
    errors.extend(validate_gateways(gateways))
    errors.extend(validate_provider_taxonomy(models, providers))

    if errors:
        print("Validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1
    print(
        f"Validation OK: {len(models['models'])} models, "
        f"{len(routing['profiles'])} profiles, 7 adapters, "
        f"{len(gateways['gateways'])} gateways"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
