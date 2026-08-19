from __future__ import annotations

from pathlib import Path

from common import dump_yaml
def generate_aider(models, routing, policy, providers, starters=None) -> None:
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
