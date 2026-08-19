from __future__ import annotations

import tomllib

import yaml

import shutil
from pathlib import Path

from common import dump_json, dump_text, dump_toml, dump_yaml, load_json, load_yaml, model_option
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
    dump_yaml(config, Path("generated") / "aider" / ".aider.conf.yml")
