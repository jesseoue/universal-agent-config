"""Shared serialization helpers for generator modules."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

try:
    import tomli_w
except ImportError as exc:  # pragma: no cover
    raise RuntimeError("tomli-w is required to generate the Codex config") from exc


def load_yaml(path: Path):
    with path.open() as handle:
        return yaml.safe_load(handle)


def load_json(path: Path):
    return json.loads(path.read_text())


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


def dump_toml(data, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(tomli_w.dumps(data))


def model_option(model: dict) -> dict:
    return {
        "contextWindow": model["context_window"],
        "maxTokens": model["max_output_tokens"],
        "reasoning": bool(model["reasoning"]),
        "tool_call": bool(model["supports_tools"]),
        "attachment": bool(model["supports_vision"]),
        "provider": {"only": model["providers"]},
    }
