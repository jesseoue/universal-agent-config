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
        if p.is_dir() and p.name not in {"gateways", "providers"}
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
    assert config["providers"]["openrouter"]["base_url"] == "https://openrouter.ai/api/v1"


def test_omp_configs():
    config = yaml.safe_load((GENERATED / "omp" / "config.yml").read_text())
    models = yaml.safe_load((GENERATED / "omp" / "models.yml").read_text())
    assert config["modelRoles"]["default"] == "openrouter/anthropic/claude-sonnet-5"
    assert models["providers"]["openrouter"]["api"] == "openai-completions"
