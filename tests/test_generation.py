#!/usr/bin/env python3
import json
import subprocess
import tomllib
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "generated"


def test_all_adapters_generated():
    expected = {
        "opencode", "omp", "claude-code", "codex", "cursor", "aider", "goose"
    }
    actual = {
        p.name for p in GENERATED.iterdir()
        if p.is_dir() and p.name not in {"gateways", "providers", "tools"}
    }
    assert actual == expected


def test_gateway_matrix_generated():
    expected = {"cloudflare", "litellm", "openrouter", "portkey", "vercel"}
    actual = {p.name for p in (GENERATED / "gateways").iterdir() if p.is_dir()}
    assert actual == expected


def test_litellm_gateway_config():
    config = yaml.safe_load((GENERATED / "gateways" / "litellm" / "config.yaml").read_text())
    assert config["litellm_settings"]["num_retries"] == 5
    assert config["router_settings"]["fallbacks"]


def test_provider_taxonomy():
    taxonomy = json.loads((GENERATED / "providers" / "taxonomy.json").read_text())
    assert len(taxonomy["model_gateways"]) == 5
    assert {item["name"] for item in taxonomy["media_providers"]} == {"fal", "replicate"}
    assert len(taxonomy["inference_runtimes"]) == 4


def test_hermes_is_isolated_from_tool_lanes():
    core_models = yaml.safe_load((ROOT / "core" / "models.yml").read_text())
    hermes = core_models["models"]["nousresearch/hermes-4-405b"]
    assert hermes["supports_tools"] is False
    policy = yaml.safe_load((ROOT / "core" / "policy.yml").read_text())
    content = policy["profiles"]["content-analysis"]
    assert content["allow_shell"] is False
    assert content["allow_edit"] is False


def test_tool_contract_and_generated_permissions():
    contract = yaml.safe_load((GENERATED / "tools" / "contract.yml").read_text())
    assert contract["interfaces"]["mcp"]["enabled"] is True
    assert contract["logging"]["telemetry"] is False

    omp = yaml.safe_load((GENERATED / "omp" / "config.yml").read_text())
    assert omp["tools"]["approvalMode"] == "normal"
    assert omp["logging"]["level"] == "error"

    opencode = json.loads((GENERATED / "opencode" / "opencode.json").read_text())
    assert opencode["logLevel"] == "ERROR"
    assert opencode["plugin"] == ["oh-my-openagent@4.19.4"]
    assert opencode["agent"]["review"]["tools"]["edit"] is False

    goose = yaml.safe_load((GENERATED / "goose" / "config.yaml").read_text())
    assert goose["tools"]["shell"] is True
    assert goose["logging"]["level"] == "error"


def test_provider_tool_semantics():
    semantics = json.loads((GENERATED / "tools" / "provider-semantics.json").read_text())
    assert set(semantics) == {"openrouter", "cloudflare", "vercel", "litellm", "portkey"}
    assert semantics["openrouter"]["tools"] == "model_capability"
    assert semantics["litellm"]["tools"] == "normalized"
    assert semantics["vercel"]["transport"] == "ai-sdk-provider-options"


def test_generation_is_deterministic():
    before = {
        p.relative_to(GENERATED).as_posix(): p.read_bytes()
        for p in GENERATED.rglob("*") if p.is_file()
    }
    subprocess.run(["python3", str(ROOT / "scripts" / "generate.py")], check=True)
    after = {
        p.relative_to(GENERATED).as_posix(): p.read_bytes()
        for p in GENERATED.rglob("*") if p.is_file()
    }
    assert before == after


def test_opencode_config():
    config = json.loads((GENERATED / "opencode" / "opencode.json").read_text())
    assert config["enabled_providers"] == ["openrouter"]
    assert config["provider"]["openrouter"]["options"]["headers"]["HTTP-Referer"] == "https://github.com/jesseoue/universal-agent-config"


def test_codex_config():
    config = tomllib.loads((GENERATED / "codex" / "config.toml").read_text())
    assert config["model_provider"] == "openrouter"
    assert config["model_providers"]["openrouter"]["base_url"] == "https://openrouter.ai/api/v1"
    assert config["agents"]["default_subagent_model"] == "z-ai/glm-5.3"
    assert config["model_providers"]["openrouter"]["stream_idle_timeout_ms"] == 60000


def test_omp_configs():
    config = yaml.safe_load((GENERATED / "omp" / "config.yml").read_text())
    models = yaml.safe_load((GENERATED / "omp" / "models.yml").read_text())
    assert config["modelRoles"]["default"] == "openrouter/z-ai/glm-5.3"
    assert models["providers"]["openrouter"]["api"] == "openai-completions"


def test_opinionated_starters_and_omo():
    starters = yaml.safe_load((ROOT / "core" / "starters.yml").read_text())
    assert starters["starters"]["balanced"]["primary_model"] == "z-ai/glm-5.3"
    assert starters["starters"]["balanced"]["background_model"] == "poolside/laguna-s-2.1"
    assert starters["starters"]["plan"]["primary_model"] == "deepseek/deepseek-v4-pro-0813"
    assert starters["philosophy"]["frontier_policy"].startswith("Never make frontier spend")

    opencode = json.loads((GENERATED / "opencode" / "opencode.json").read_text())
    omo = json.loads((GENERATED / "opencode" / "omo.jsonc").read_text())
    assert opencode["plugin"] == ["oh-my-openagent@4.19.4"]
    assert opencode["permission"]["bash"] == "allow"
    assert opencode["compaction"]["tail_turns"] == 2
    assert opencode["agent"]["prometheus"]["model"] == "openrouter/deepseek/deepseek-v4-pro-0813"
    assert omo["[opencode]"]["background_task"]["defaultConcurrency"] == 10
    assert omo["telemetry"]["enabled"] is False


def test_claude_code_uses_openrouter_anthropic_compatible_gateway():
    config = json.loads((GENERATED / "claude-code" / "settings.json").read_text())
    assert config["env"]["ANTHROPIC_BASE_URL"] == "https://openrouter.ai/api"
    assert config["env"]["ANTHROPIC_API_KEY"] == "${OPENROUTER_API_KEY}"
    assert config["model"] == "anthropic/claude-sonnet-5"


def test_cursor_native_project_surfaces():
    rules_dir = GENERATED / "cursor" / ".cursor" / "rules"
    rule_files = sorted(path.name for path in rules_dir.glob("*.mdc"))
    assert len(rule_files) == 8
    assert rule_files[0] == "00-universal-agent-core.mdc"

    always_applied = [
        filename for filename in rule_files
        if f"alwaysApply: true" in (rules_dir / filename).read_text()
    ]
    assert always_applied == ["00-universal-agent-core.mdc", "01-model-routing.mdc"]

    testing = (rules_dir / "03-testing.mdc").read_text()
    assert "globs: **/test*" in testing

    routing = (rules_dir / "01-model-routing.mdc").read_text()
    assert "https://openrouter.ai/api/v1/cursor" in routing
    assert "https://openrouter.ai/api/v1` in Cursor" in routing

    mcp = json.loads((GENERATED / "cursor" / ".cursor" / "mcp.json").read_text())
    assert mcp["mcpServers"]["context7"]["headers"]["CONTEXT7_API_KEY"] == "${env:CONTEXT7_API_KEY}"

    ignore = (GENERATED / "cursor" / ".cursorignore").read_text().splitlines()
    assert ".env*" in ignore
    assert "node_modules/" in ignore
