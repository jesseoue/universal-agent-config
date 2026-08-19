# Universal Agent Config wiki

This repository uses versioned docs instead of the separate GitHub wiki. They receive the same review and CI checks as code.

## Start here

| Guide | Purpose |
| --- | --- |
| [README](../README.md) | Product overview, install, compatibility, routing, and cost patterns |
| [Architecture](architecture.md) | Canonical files, generators, and design rules |
| [Contributor guide](contributor-guide.md) | Development setup, adapters, gateways, and model maintenance |
| [Maintainer guide](maintainer-guide.md) | Cadence, triage, releases, and community health |
| [Launch plan](launch.md) | Positioning and launch channels |
| [SEO strategy](SEO.md) | Search intent, keywords, and launch copy |

## Frequently asked questions

### Does this run while my coding agent is active?

No. It generates native configuration files. Once installed, those files do not require this repository unless you deliberately link them.

### Does it send my code anywhere?

The generated routing policy uses your selected provider or gateway. Universal Agent Config itself does not telemetry-track usage, and generated defaults disable telemetry where supported.

### Can I use a different gateway?

Yes. The repo documents OpenRouter, Cloudflare AI Gateway, Vercel AI Gateway, LiteLLM Proxy, and Portkey. OpenRouter is the default because it is broadly compatible and easy to verify; alternative gateway coverage is starter-oriented until runtime tests expand.

### Why is OpenCode native-first?

Native OpenCode supports the important routing, agent, permission, MCP, compaction, and logging surfaces. OMO remains an opt-in profile for background orchestration, concurrency caps, tool-call limits, and circuit breakers.

### Why is Hermes isolated?

Hermes 4 405B does not support tool calls in the canonical catalog. It is useful for toolless long-form analysis, but unsafe to use as a coding-agent tool lane.

### How do I remove it?

```bash
./scripts/install.sh uninstall
```

Only UAC-owned symlinks are removed. Backed-up files are preserved.

## Contribution surface

- Issues: bug reports, adapter requests, gateway requests, documentation gaps
- Discussions: setup help and routing strategy
- Security: private GitHub security advisories
- Pull requests: canonical policy changes plus regenerated artifacts
