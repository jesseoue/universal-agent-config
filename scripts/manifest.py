from __future__ import annotations

from pathlib import Path

from common import dump_json

ADAPTERS = {
    "opencode": ["opencode.json", "AGENTS.md", "omo.jsonc"],
    "omp": ["config.yml", "models.yml", "mcp.json"],
    "claude-code": ["settings.json", "CLAUDE.md", ".mcp.json"],
    "codex": ["config.toml", "AGENTS.md"],
    "cursor": [".cursor/rules/universal-agent-config.mdc"],
    "aider": [".aider.conf.yml"],
    "goose": ["config.yaml"],
    "gateways": {
        "openrouter": ["env.example.yml"],
        "cloudflare": ["env.example.yml", "connection.json"],
        "vercel": ["env.example.yml"],
        "litellm": ["config.yaml"],
        "portkey": ["config.json"],
    },
    "providers": ["taxonomy.json", "media.env.example.yml"],
    "tools": ["contract.yml", "mcp.json", "provider-semantics.json"],
}


def generate_manifest(models, routing, policy, starters) -> None:
    manifest = {
        "name": "universal-agent-config",
        "version": 1,
        "updated": str(models["updated"]),
        "default_profile": routing["default_profile"],
        "default_starter": starters["default_starter"],
        "starter_count": len(starters["starters"]),
        "adapters": ADAPTERS,
        "model_count": len(models["models"]),
    }
    dump_json(manifest, Path("generated") / "manifest.json")
