from __future__ import annotations

from pathlib import Path

from common import dump_json, dump_yaml
def generate_provider_taxonomy(providers) -> None:
    taxonomy = providers["taxonomy"]
    categories = taxonomy["categories"]
    media = taxonomy["media_providers"]

    matrix = {
        "model_gateways": [
            {"name": "OpenRouter", "category": categories["model_gateway"]["description"], "default": True},
            {"name": "Cloudflare AI Gateway", "category": "edge control plane"},
            {"name": "Vercel AI Gateway", "category": "developer gateway"},
            {"name": "LiteLLM Proxy", "category": "self-hosted proxy"},
            {"name": "Portkey AI Gateway", "category": "managed governance gateway"},
        ],
        "model_providers": [
            {"name": provider_name, "models": policy["preferred"] + policy.get("alternates", [])}
            for provider_name, policy in taxonomy["provider_policies"].items()
            if provider_name != "hermes"
        ],
        "media_providers": [
            {
                "name": media_name,
                "protocol": provider["protocol"],
                "base_url": provider.get("base_url"),
                "api_key_env": provider.get("api_key_env"),
                "best_for": provider["best_for"],
                "caveats": provider["caveats"],
            }
            for media_name, provider in media.items()
            if provider.get("category") == "media_provider"
        ],
        "inference_runtimes": [
            {"name": "vLLM", "category": categories["inference_runtime"]["description"]},
            {"name": "Ollama", "category": "local model runtime"},
            {"name": "llama.cpp", "category": "local GGUF runtime"},
            {"name": "SGLang", "category": "high-performance serving"},
        ],
    }
    dump_json(matrix, Path("generated") / "providers" / "taxonomy.json")
    dump_yaml(
        {
            "FAL_KEY": "required for Fal media generation",
            "REPLICATE_API_TOKEN": "required for Replicate media generation",
        },
        Path("generated") / "providers" / "media.env.example.yml",
    )
