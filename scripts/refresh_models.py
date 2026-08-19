#!/usr/bin/env python3
"""Refresh canonical model metadata from the live OpenRouter catalog."""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
MODELS_PATH = ROOT / "core" / "models.yml"
CATALOG_URL = "https://openrouter.ai/api/v1/models"


def fetch_catalog() -> dict:
    with urllib.request.urlopen(CATALOG_URL, timeout=30) as response:
        return json.load(response)


def main() -> int:
    current = yaml.safe_load(MODELS_PATH.read_text())
    catalog = {model["id"]: model for model in fetch_catalog()["data"]}
    missing = []

    for model_id, model in current["models"].items():
        live = catalog.get(model_id)
        if live is None:
            missing.append(model_id)
            continue
        modalities = live["architecture"].get("input_modalities", [])
        parameters = live.get("supported_parameters", [])
        reasoning = live.get("reasoning") or {}
        model["context_window"] = live["context_length"]
        model["max_output_tokens"] = (
            live.get("top_provider", {}).get("max_completion_tokens") or 32768
        )
        model["supports_tools"] = "tools" in parameters
        model["supports_vision"] = any(
            item in modalities for item in ("image", "video", "file")
        )
        model["reasoning"] = bool(reasoning.get("supported_efforts") or reasoning.get("default_enabled"))
        model["live_verified"] = str(current.get("updated"))

    if missing:
        print("Models missing from OpenRouter:", file=sys.stderr)
        for model_id in missing:
            print(f"  - {model_id}", file=sys.stderr)
        return 1

    MODELS_PATH.write_text(yaml.safe_dump(current, sort_keys=False, width=120))
    print(f"Refreshed {len(current['models'])} models from OpenRouter")
    return 0


if __name__ == "__main__":
    sys.exit(main())
