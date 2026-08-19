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
        "opencode-omo/opencode.json",
        "opencode-omo/AGENTS.md",
        "opencode-omo/omo.jsonc",
        "omp/config.yml",
        "omp/models.yml",
        "omp/mcp.json",
        "claude-code/settings.json",
        "claude-code/.mcp.json",
        "claude-code/CLAUDE.md",
        "codex/config.toml",
        "codex/AGENTS.md",
        "cursor/.cursorignore",
        "cursor/.cursor/mcp.json",
        "cursor/.cursor/rules/00-universal-agent-core.mdc",
        "cursor/.cursor/rules/01-model-routing.mdc",
        "cursor/.cursor/rules/02-planning.mdc",
        "cursor/.cursor/rules/03-testing.mdc",
        "cursor/.cursor/rules/04-typescript.mdc",
        "cursor/.cursor/rules/05-python.mdc",
        "cursor/.cursor/rules/06-documentation.mdc",
        "cursor/.cursor/rules/07-security-review.mdc",
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
        "tools/contract.yml",
        "tools/mcp.json",
        "tools/provider-semantics.json",
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
        if config.get("plugin"):
            errors.append("native OpenCode config must not require a plugin")

    opencode_omo = generated / "opencode-omo" / "opencode.json"
    if opencode_omo.is_file():
        config = load_json(opencode_omo)
        if config.get("plugin") != ["oh-my-openagent@4.19.4"]:
            errors.append("OpenCode OMO profile must pin oh-my-openagent")

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

    cursor_rules_dir = generated / "cursor" / ".cursor" / "rules"
    if cursor_rules_dir.is_dir():
        rule_files = sorted(path.name for path in cursor_rules_dir.glob("*.mdc"))
        if rule_files[0] != "00-universal-agent-core.mdc" or len(rule_files) != 8:
            errors.append("Cursor rule set must contain exactly eight ordered rules")
        always_applied = 0
        for filename in rule_files:
            content = (cursor_rules_dir / filename).read_text()
            if "alwaysApply: true" in content:
                always_applied += 1
            if "alwaysApply: false" not in content and "alwaysApply: true" not in content:
                errors.append(f"Cursor rule lacks explicit alwaysApply value: {filename}")
        if always_applied != 2:
            errors.append("Cursor must have exactly two always-applied rules")
        routing_rule = (cursor_rules_dir / "01-model-routing.mdc")
        if routing_rule.is_file():
            content = routing_rule.read_text()
            if "https://openrouter.ai/api/v1/cursor" not in content:
                errors.append("Cursor routing rule must document the OpenRouter Cursor endpoint")
            if "https://openrouter.ai/api/v1` in Cursor" not in content:
                errors.append("Cursor routing rule must warn against the generic OpenRouter endpoint")

    cursor_mcp = generated / "cursor" / ".cursor" / "mcp.json"
    if cursor_mcp.is_file():
        config = load_json(cursor_mcp)
        server = config.get("mcpServers", {}).get("context7")
        if not server:
            errors.append("Cursor MCP config must include Context7")
        elif server.get("headers", {}).get("CONTEXT7_API_KEY") != "${env:CONTEXT7_API_KEY}":
            errors.append("Cursor Context7 auth must use environment expansion")

    cursor_ignore = generated / "cursor" / ".cursorignore"
    if cursor_ignore.is_file():
        patterns = set(cursor_ignore.read_text().splitlines())
        for pattern in (".env*", "**/*.key", "**/*.pem", "**/secrets/**", "node_modules/", "dist/", "coverage/"):
            if pattern not in patterns:
                errors.append(f"Cursor ignore file is missing pattern: {pattern}")

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


def validate_tool_contract(models, routing, policy, tools) -> list[str]:
    errors = []
    contract = tools["contract"]
    required_tools = {"read", "edit", "shell", "browser", "web_search"}
    if set(contract["tools"]) != required_tools:
        errors.append(f"tool contract mismatch: {sorted(contract['tools'])}")

    if set(contract["interfaces"]) != {"mcp", "plugin", "native_tools"}:
        errors.append("tool interfaces must cover MCP, plugins, and native tools")

    expected_profiles = set(routing["profiles"])
    actual_profiles = set(contract["profiles"])
    if actual_profiles != expected_profiles:
        errors.append(
            f"tool profiles must match routing profiles: expected {sorted(expected_profiles)}, got {sorted(actual_profiles)}"
        )

    for profile_name, tool_profile in contract["profiles"].items():
        policy_profile = policy["profiles"][profile_name]
        defaults = policy["defaults"]
        effective_edit = policy_profile.get("allow_edit", defaults["allow_edit"])
        effective_shell = policy_profile.get("allow_shell", defaults["allow_shell"])
        if tool_profile["edit"] != effective_edit:
            errors.append(f"{profile_name}.edit does not match policy.allow_edit")
        if tool_profile["shell"] != effective_shell:
            errors.append(f"{profile_name}.shell does not match policy.allow_shell")

    if contract["logging"]["telemetry"]:
        errors.append("tool contract telemetry must be disabled")
    if contract["logging"]["level"] != "error":
        errors.append("tool contract logging level must be error")

    required_redactions = {
        "OPENROUTER_API_KEY", "CONTEXT7_API_KEY", "CLOUDFLARE_API_TOKEN",
        "AI_GATEWAY_API_KEY", "LITELLM_PROXY_API_KEY", "PORTKEY_API_KEY",
        "FAL_KEY", "REPLICATE_API_TOKEN",
    }
    if set(contract["logging"]["redact"]) != required_redactions:
        errors.append("tool contract logging redaction set is incomplete")

    generated_semantics = load_json(ROOT / "generated" / "tools" / "provider-semantics.json")
    if set(generated_semantics) != set(tools["provider_tool_semantics"]):
        errors.append("generated provider tool semantics are incomplete")
    for gateway_name, semantics in tools["provider_tool_semantics"].items():
        if not semantics.get("note"):
            errors.append(f"{gateway_name} tool semantics lacks an operational note")
    for media_name in ("fal", "replicate"):
        if tools["media_providers"][media_name]["tools"] != "unsupported":
            errors.append(f"{media_name} must not claim tool-call support")

    return errors


def validate_generated_tool_contract(tools) -> list[str]:
    errors = []
    omp = load_yaml(ROOT / "generated" / "omp" / "config.yml")
    opencode = load_json(ROOT / "generated" / "opencode" / "opencode.json")
    claude = load_json(ROOT / "generated" / "claude-code" / "settings.json")
    codex = tomllib.loads((ROOT / "generated" / "codex" / "config.toml").read_text())
    goose = load_yaml(ROOT / "generated" / "goose" / "config.yaml")

    if omp["tools"]["approvalMode"] != "normal":
        errors.append("omp approval mode must be normal")
    if omp["logging"]["telemetry"] is not False:
        errors.append("omp telemetry must be disabled")
    if not omp["mcp"]["enableProjectConfig"]:
        errors.append("omp project MCP config must be enabled")

    if opencode["logLevel"] != "ERROR":
        errors.append("OpenCode log level must be ERROR")
    if opencode["tool_output"]["max_lines"] != 300 or opencode["tool_output"]["max_bytes"] != 12000:
        errors.append("OpenCode tool output limits are incorrect")
    if opencode["mcp"]["context7"]["headers"]["CONTEXT7_API_KEY"] != "{env:CONTEXT7_API_KEY}":
        errors.append("OpenCode Context7 auth header is incorrect")
    if opencode["agent"]["review"]["tools"]["edit"] is not False:
        errors.append("OpenCode review starter must disable edit")
    if opencode["compaction"]["prune"] is not True:
        errors.append("OpenCode compaction pruning must be enabled")
    if opencode["permission"]["bash"] != "allow":
        errors.append("OpenCode shell permission must be allow for the balanced profile")

    if "Read(**/.env*)" not in claude["permissions"]["deny"]:
        errors.append("Claude Code must deny reading .env files")
    if claude["env"].get("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC") != "1":
        errors.append("Claude Code nonessential traffic must be disabled")

    if codex.get("log_level") != "error":
        errors.append("Codex log level must be error")
    if codex.get("approval_policy") != "on-request":
        errors.append("Codex approval policy must be on-request")
    if "openrouter" not in codex.get("model_providers", {}):
        errors.append("Codex config must use model_providers.openrouter")
    if "context7" not in codex.get("mcp_servers", {}):
        errors.append("Codex config must include Context7 MCP")
    if codex.get("agents", {}).get("enabled") is not True:
        errors.append("Codex multi-agent tools must be enabled")

    claude_mcp = load_json(ROOT / "generated" / "claude-code" / ".mcp.json")
    if "context7" not in claude_mcp.get("mcpServers", {}):
        errors.append("Claude Code config must include Context7 MCP")

    if goose["tools"]["shell"] is not True:
        errors.append("Goose shell tool must be enabled for the balanced profile")
    if goose["logging"]["level"] != "error":
        errors.append("Goose log level must be error")
    if goose["otel"]["enabled"] is not False:
        errors.append("Goose OpenTelemetry must be disabled")

    required_redactions = set(tools["contract"]["logging"]["redact"])
    if set(omp["logging"]["redact"]) != required_redactions:
        errors.append("omp logging redactions are incomplete")
    if set(goose["logging"]["redact"]) != required_redactions:
        errors.append("Goose logging redactions are incomplete")

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
    for fallback in litellm.get("router_settings", {}).get("fallbacks", []):
        for source, targets in fallback.items():
            if len(targets) != len(set(targets)) or source in targets:
                errors.append(f"LiteLLM fallback lane {source} must route to distinct downstream models")

    cloudflare = load_json(ROOT / "generated" / "gateways" / "cloudflare" / "connection.json")
    if "{account_id}" not in cloudflare.get("base_url_template", ""):
        errors.append("Cloudflare connection template must contain {account_id}")

    return errors


def validate_starters(models, routing, starters) -> list[str]:
    errors = []
    starter_names = set(starters["starters"])
    if starters["default_starter"] not in starter_names:
        errors.append("default starter is missing")

    for starter_name, starter in starters["starters"].items():
        if starter["routing_profile"] not in routing["profiles"]:
            errors.append(f"starter {starter_name} references unknown routing profile")
        referenced_models = [
            starter[key]
            for key in ("primary_model", "background_model", "deep_model", "frontier_model")
            if key in starter
        ] + starter.get("fallback_models", [])
        for model_id in referenced_models:
            if model_id not in models["models"]:
                errors.append(f"starter {starter_name} references unknown model: {model_id}")

    opencode = starters["adapters"]["opencode"]
    if not opencode.get("pin"):
        errors.append("OpenCode starter must pin the OMO plugin")
    for native_starter in opencode["native_starters"].values():
        if native_starter not in starter_names:
            errors.append("OpenCode native starter is missing")

    claude = starters["adapters"]["claude-code"]
    for field in ("model", "fallback_model"):
        if claude[field] not in models["models"]:
            errors.append(f"Claude Code starter references unknown model: {claude[field]}")

    codex = starters["adapters"]["codex"]["agents"]
    if codex["default_subagent_model"] not in models["models"]:
        errors.append("Codex default subagent model is unknown")
    if codex["max_concurrent_threads"] < 1:
        errors.append("Codex concurrent thread cap must be positive")

    if starters["philosophy"].get("frontier_default", False):
        errors.append("frontier spend must not be the public default")
    return errors


def main() -> int:
    models = load_yaml(ROOT / "core" / "models.yml")
    routing = load_yaml(ROOT / "core" / "routing.yml")
    policy = load_yaml(ROOT / "core" / "policy.yml")
    providers = load_yaml(ROOT / "core" / "providers.yml")
    gateways = load_yaml(ROOT / "core" / "gateways.yml")
    starters = load_yaml(ROOT / "core" / "starters.yml")
    errors = validate_core(models, routing, policy, providers)
    errors.extend(validate_generated(models, routing))
    errors.extend(validate_gateways(gateways))
    errors.extend(validate_provider_taxonomy(models, providers))
    errors.extend(validate_tool_contract(models, routing, policy, load_yaml(ROOT / "core" / "tools.yml")))
    errors.extend(validate_generated_tool_contract(load_yaml(ROOT / "core" / "tools.yml")))
    errors.extend(validate_starters(models, routing, starters))

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
