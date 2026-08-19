from __future__ import annotations

from pathlib import Path

from common import dump_json, dump_yaml
def generate_gateway_configs(models, routing, policy, providers, gateways) -> None:
    profile = routing["profiles"][routing["default_profile"]]
    roles = profile["roles"]

    # OpenRouter is generated for every agent adapter and remains the default.
    openrouter_env = {
        "OPENROUTER_API_KEY": "required",
        "CONTEXT7_API_KEY": "optional",
    }
    dump_yaml(openrouter_env, Path("generated") / "gateways" / "openrouter" / "env.example.yml")

    # Cloudflare is OpenAI-compatible but requires an account-specific base URL.
    cloudflare_env = {
        "CLOUDFLARE_ACCOUNT_ID": "required",
        "CLOUDFLARE_API_TOKEN": "required",
        "CLOUDFLARE_GATEWAY_ID": "optional; defaults to default",
    }
    dump_yaml(cloudflare_env, Path("generated") / "gateways" / "cloudflare" / "env.example.yml")
    dump_json(
        {
            "base_url_template": gateways["gateways"]["cloudflare"]["base_url_template"],
            "headers": gateways["gateways"]["cloudflare"]["headers"],
            "model_format": "provider/model",
            "notes": [
                "Point OpenAI-compatible agents at the account-specific /ai/v1 endpoint.",
                "Use a Cloudflare API token with the required AI permissions.",
                "Gateway features include logging, caching, rate limiting, retries, and guardrails.",
            ],
        },
        Path("generated") / "gateways" / "cloudflare" / "connection.json",
    )

    # Vercel AI Gateway uses provider/model strings and supports provider options.
    dump_yaml(
        {
            "AI_GATEWAY_API_KEY": "required outside Vercel OIDC",
            "VERCEL_OIDC_TOKEN": "optional on Vercel deployments",
        },
        Path("generated") / "gateways" / "vercel" / "env.example.yml",
    )

    # LiteLLM proxy config with role lanes and ordered fallbacks.
    model_names = {
        "default": "uac-default",
        "background": "uac-background",
        "reasoning": "uac-reasoning",
        "vision": "uac-vision",
    }
    litellm_models = []
    for role, lane in roles.items():
        for model_id in [lane["primary"], *lane.get("fallbacks", [])]:
            deployment = model_names[role] if model_id == lane["primary"] else f"{model_names[role]}-{model_id.replace('/', '--')}"
            litellm_models.append(
                {
                    "model_name": deployment,
                    "litellm_params": {"model": f"openrouter/{model_id}"},
                }
            )
    litellm_config = {
        "model_list": litellm_models,
        "litellm_settings": {
            "num_retries": policy["defaults"]["max_retries"],
            "request_timeout": policy["defaults"]["request_timeout_seconds"],
        },
        "router_settings": {
            "fallbacks": [
                {
                    model_names[role]: [
                        f"{model_names[role]}-{model_id.replace('/', '--')}"
                        for model_id in lane.get("fallbacks", [])
                    ]
                }
                for role, lane in roles.items()
                if lane.get("fallbacks")
            ]
        },
    }
    dump_yaml(litellm_config, Path("generated") / "gateways" / "litellm" / "config.yaml")

    # Portkey fallback policy. Provider credentials remain Portkey virtual keys.
    portkey_config = {
        "strategy": {"mode": "fallback"},
        "targets": [
            {
                "name": lane_name,
                "override_params": {"model": lane["primary"]},
            }
            for lane_name, lane in roles.items()
        ],
    }
    dump_json(portkey_config, Path("generated") / "gateways" / "portkey" / "config.json")
