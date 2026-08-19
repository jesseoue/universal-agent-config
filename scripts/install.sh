#!/usr/bin/env bash
# Universal Agent Config installer.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
AGENT=""
PROFILE="${UAC_PROFILE:-balanced}"
DEST_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: install.sh --agent AGENT [--profile PROFILE] [--dry-run]

Agents:
  opencode     ~/.config/opencode
  omp          ~/.omp/agent
  claude-code  ~/.claude
  codex        ~/.codex
  cursor       current directory
  aider        current directory
  goose        ~/.config/goose

Profiles:
  balanced, open-weight, low-cost, frontier

Environment:
  UAC_PROFILE       Default routing profile (default: balanced)
  XDG_CONFIG_HOME   Config destination root (default: ~/.config)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent) AGENT="${2:?missing agent}"; shift 2 ;;
    --profile) PROFILE="${2:?missing profile}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ -n "$AGENT" ]] || { usage >&2; exit 2; }

if [[ "$(id -u)" == 0 ]]; then
  echo "error: refusing to install as root" >&2
  exit 1
fi

backup_path() {
  local source="$1" backup
  backup="${source}.backup.$(date +%Y%m%d%H%M%S)"
  local n=1
  while [[ -e "$backup" ]]; do
    backup="${source}.backup.$(date +%Y%m%d%H%M%S).$n"
    ((n++))
  done
  printf '%s' "$backup"
}

install_file() {
  local source="$1" destination="$2"
  if [[ "$DRY_RUN" == true ]]; then
    echo "would install $source -> $destination"
    return
  fi
  mkdir -p "$(dirname "$destination")"
  if [[ -e "$destination" && ! -L "$destination" ]]; then
    local backup
    backup="$(backup_path "$destination")"
    mv "$destination" "$backup"
    echo "backed up existing file: $backup"
  fi
  ln -sfn "$source" "$destination"
  echo "installed $destination"
}

case "$AGENT" in
  opencode)
    target="$DEST_HOME/opencode"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$target"
    install_file "$REPO/generated/opencode/opencode.json" "$target/opencode.json"
    install_file "$REPO/generated/opencode/AGENTS.md" "$target/AGENTS.md"
    ;;
  omp)
    target="$HOME/.omp/agent"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$target"
    install_file "$REPO/generated/omp/config.yml" "$target/config.yml"
    install_file "$REPO/generated/omp/models.yml" "$target/models.yml"
    install_file "$REPO/generated/omp/mcp.json" "$target/mcp.json"
    ;;
  claude-code)
    target="$HOME/.claude"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$target"
    install_file "$REPO/generated/claude-code/settings.json" "$target/settings.json"
    install_file "$REPO/generated/claude-code/CLAUDE.md" "$target/CLAUDE.md"
    ;;
  codex)
    target="$HOME/.codex"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$target"
    install_file "$REPO/generated/codex/config.toml" "$target/config.toml"
    install_file "$REPO/generated/codex/AGENTS.md" "$target/AGENTS.md"
    ;;
  cursor)
    install_file "$REPO/generated/cursor/.cursor/rules/universal-agent-config.mdc" "$PWD/.cursor/rules/universal-agent-config.mdc"
    ;;
  aider)
    install_file "$REPO/generated/aider/.aider.conf.yml" "$PWD/.aider.conf.yml"
    ;;
  goose)
    target="$DEST_HOME/goose"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$target"
    install_file "$REPO/generated/goose/config.yaml" "$target/config.yaml"
    ;;
  *)
    echo "Unknown agent: $AGENT" >&2
    usage >&2
    exit 2
    ;;
esac

echo "Done. Profile metadata: $PROFILE (set UAC_PROFILE before generation for future variants)."
