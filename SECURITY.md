# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Latest tagged release | Yes |
| Older tagged releases | Best effort while a fix is being prepared |

Universal Agent Config is a configuration generator. Generated files are installed into normal agent directories, but this repository does not run an internet-facing service.

## Reporting a vulnerability

Please report vulnerabilities privately at:

https://github.com/jesseoue/universal-agent-config/security/advisories/new/

Include:

- affected file, adapter, generated config, or install path
- affected Universal Agent Config commit or release
- reproduction steps
- impact, including whether secrets could be exposed
- suggested mitigation if you have one

Please do not open a public issue for a suspected vulnerability.

## Security model

- API keys stay in environment variables and local secret stores; they are never committed.
- Generated logging defaults to `error`, disables telemetry, and redacts supported provider keys.
- Installation is user-local and refuses to run as root.
- Existing files are backed up before replacement.
- Destructive commands require confirmation by default.
- Generated files can be removed with the uninstall command.

These defaults reduce risk, but the target agent and selected model provider still control execution. Review generated permissions and sandbox settings before using any configuration in a sensitive environment.

## Scope

Issues in supported coding agents, model providers, gateways, MCP servers, plugins, or the OpenRouter catalog are generally upstream issues. Please report them there unless Universal Agent Config generates an unsafe configuration or exposes secret material.
