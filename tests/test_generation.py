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
    actual = {p.name for p in GENERATED.iterdir() if p.is_dir()}
    assert actual == expected


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
