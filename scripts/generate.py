#!/usr/bin/env python3
"""Generate native agent configurations from the canonical core files."""

from __future__ import annotations

import shutil
from pathlib import Path

from common import load_yaml
from generators import (
    generate_aider,
    generate_claude_code,
    generate_codex,
    generate_cursor,
    generate_gateway_configs,
    generate_goose,
    generate_omp,
    generate_opencode,
    generate_provider_taxonomy,
    generate_tool_contract,
)
from manifest import generate_manifest

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "generated"


def main() -> None:
    models = load_yaml(ROOT / "core" / "models.yml")
    routing = load_yaml(ROOT / "core" / "routing.yml")
    policy = load_yaml(ROOT / "core" / "policy.yml")
    providers = load_yaml(ROOT / "core" / "providers.yml")
    gateways = load_yaml(ROOT / "core" / "gateways.yml")
    tools = load_yaml(ROOT / "core" / "tools.yml")
    starters = load_yaml(ROOT / "core" / "starters.yml")

    if GENERATED.exists():
        shutil.rmtree(GENERATED)
    GENERATED.mkdir(parents=True)

    generate_opencode(models, routing, policy, providers, starters)
    generate_omp(models, routing, policy, providers, starters)
    generate_claude_code(models, routing, policy, providers, tools, starters)
    generate_codex(models, routing, policy, providers, tools, starters)
    generate_cursor(models, routing, policy, providers, starters)
    generate_aider(models, routing, policy, providers, starters)
    generate_goose(models, routing, policy, providers, tools, starters)
    generate_gateway_configs(models, routing, policy, providers, gateways)
    generate_provider_taxonomy(providers)
    generate_tool_contract(tools)
    generate_manifest(models, routing, policy, starters)

    print("Generated adapters:", ", ".join(sorted(p.name for p in GENERATED.iterdir() if p.is_dir())))


if __name__ == "__main__":
    main()
