#!/usr/bin/env bash
# Universal Agent Config installer.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
AGENT=""
PROFILE="${UAC_PROFILE:-balanced}"
DEST_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
DRY_RUN=false
VERSION="0.1.0"
COMMAND="install"

usage() {
  cat <<'EOF'
Usage: install.sh [command] --agent AGENT [--dry-run]

Commands:
  install       Install one agent (default)
  doctor        Check environment, generated files, and install state
  health        Alias for doctor
  uninstall     Remove Universal Agent Config symlinks

Agents:
  opencode     ~/.config/opencode
  opencode-omo ~/.config/opencode + ~/.omo (native config plus OMO orchestration)
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
    install|doctor|health|uninstall)
      COMMAND="$1"; shift ;;
    --version) echo "universal-agent-config $VERSION"; exit 0 ;;
    --all) AGENT="all"; shift ;;
    --agent) AGENT="${2:?missing agent}"; shift 2 ;;
    --profile) PROFILE="${2:?missing profile}"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ "$COMMAND" == "install" && -z "$AGENT" ]]; then
  usage >&2
  exit 2
fi

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

uninstall_file() {
  local destination="$1"
  if [[ "$DRY_RUN" == true ]]; then
    echo "would remove $destination"
    return
  fi
  if [[ -L "$destination" ]]; then
    local target
    target="$(readlink "$destination")"
    if [[ "$target" == "$REPO"/generated/* ]]; then
      rm "$destination"
      echo "removed $destination"
    else
      echo "kept non-UAC symlink: $destination"
    fi
  fi
}

doctor() {
  local failed=false
  local destination target
  local installed=0
  local supported=6

  echo "Universal Agent Config doctor"
  if [[ "$(id -u)" != 0 ]]; then
    echo "  ✓ not running as root"
  else
    echo "  ✗ running as root"
    failed=true
  fi
  if python3 --version >/dev/null 2>&1; then
    echo "  ✓ Python 3 available"
  else
    echo "  ✗ Python 3 missing"
    failed=true
  fi
  if [[ -f "$REPO/generated/manifest.json" ]]; then
    echo "  ✓ generated manifest present"
  else
    echo "  ✗ generated manifest missing; run scripts/generate.py"
    failed=true
  fi

  local destinations=(
    "$DEST_HOME/opencode/opencode.json"
    "$HOME/.omo/omo.jsonc"
    "$HOME/.omp/agent/config.yml"
    "$HOME/.claude/settings.json"
    "$HOME/.codex/config.toml"
    "$DEST_HOME/goose/config.yaml"
  )
  for destination in "${destinations[@]}"; do
    if [[ -L "$destination" ]]; then
      target="$(readlink "$destination")"
      if [[ "$target" == "$REPO"/generated/* ]]; then
        echo "  ✓ installed: $destination"
        installed=$((installed + 1))
      else
        echo "  ⚠ other symlink: $destination"
      fi
    else
      echo "  - not installed: $destination"
    fi
  done

  if [[ "$failed" == true ]]; then
    echo "Doctor failed."
    return 1
  fi
  echo "Doctor passed. ${installed}/${supported} global adapters installed."
  echo "Install help: ./scripts/install.sh --agent AGENT [--dry-run]"
  echo "Agents: opencode omp claude-code codex cursor aider goose"
}

uninstall_all() {
  local destinations=(
    "$DEST_HOME/opencode/opencode.json"
    "$DEST_HOME/opencode/AGENTS.md"
    "$HOME/.omo/omo.jsonc"
    "$HOME/.omp/agent/config.yml"
    "$HOME/.omp/agent/models.yml"
    "$HOME/.omp/agent/mcp.json"
    "$HOME/.claude/settings.json"
    "$HOME/.claude/.mcp.json"
    "$HOME/.claude/CLAUDE.md"
    "$HOME/.codex/config.toml"
    "$HOME/.codex/AGENTS.md"
    "$DEST_HOME/goose/config.yaml"
    "$PWD/.cursorignore"
    "$PWD/.cursor/mcp.json"
    "$PWD/.cursor/rules/00-universal-agent-core.mdc"
    "$PWD/.cursor/rules/01-model-routing.mdc"
    "$PWD/.cursor/rules/02-planning.mdc"
    "$PWD/.cursor/rules/03-testing.mdc"
    "$PWD/.cursor/rules/04-typescript.mdc"
    "$PWD/.cursor/rules/05-python.mdc"
    "$PWD/.cursor/rules/06-documentation.mdc"
    "$PWD/.cursor/rules/07-security-review.mdc"
    "$PWD/.aider.conf.yml"
  )
  local destination
  for destination in "${destinations[@]}"; do
    uninstall_file "$destination"
  done
}

if [[ "$COMMAND" == "doctor" || "$COMMAND" == "health" ]]; then
  doctor
  exit $?
fi

if [[ "$COMMAND" == "uninstall" ]]; then
  uninstall_all
  exit 0
fi

case "$AGENT" in
  all)
    "$0" install --agent opencode --profile "$PROFILE"
    "$0" install --agent omp --profile "$PROFILE"
    "$0" install --agent claude-code --profile "$PROFILE"
    "$0" install --agent codex --profile "$PROFILE"
    "$0" install --agent goose --profile "$PROFILE"
    ;;
  opencode)
    target="$DEST_HOME/opencode"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$target"
    install_file "$REPO/generated/opencode/opencode.json" "$target/opencode.json"
    install_file "$REPO/generated/opencode/AGENTS.md" "$target/AGENTS.md"
    ;;
  opencode-omo)
    target="$DEST_HOME/opencode"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$target"
    install_file "$REPO/generated/opencode-omo/opencode.json" "$target/opencode.json"
    install_file "$REPO/generated/opencode-omo/AGENTS.md" "$target/AGENTS.md"
    install_file "$REPO/generated/opencode-omo/omo.jsonc" "$HOME/.omo/omo.jsonc"
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
    install_file "$REPO/generated/claude-code/.mcp.json" "$target/.mcp.json"
    install_file "$REPO/generated/claude-code/CLAUDE.md" "$target/CLAUDE.md"
    ;;
  codex)
    target="$HOME/.codex"
    [[ "$DRY_RUN" == true ]] || mkdir -p "$target"
    install_file "$REPO/generated/codex/config.toml" "$target/config.toml"
    install_file "$REPO/generated/codex/AGENTS.md" "$target/AGENTS.md"
    ;;
  cursor)
    install_file "$REPO/generated/cursor/.cursorignore" "$PWD/.cursorignore"
    install_file "$REPO/generated/cursor/.cursor/mcp.json" "$PWD/.cursor/mcp.json"
    install_file "$REPO/generated/cursor/.cursor/rules/00-universal-agent-core.mdc" "$PWD/.cursor/rules/00-universal-agent-core.mdc"
    install_file "$REPO/generated/cursor/.cursor/rules/01-model-routing.mdc" "$PWD/.cursor/rules/01-model-routing.mdc"
    install_file "$REPO/generated/cursor/.cursor/rules/02-planning.mdc" "$PWD/.cursor/rules/02-planning.mdc"
    install_file "$REPO/generated/cursor/.cursor/rules/03-testing.mdc" "$PWD/.cursor/rules/03-testing.mdc"
    install_file "$REPO/generated/cursor/.cursor/rules/04-typescript.mdc" "$PWD/.cursor/rules/04-typescript.mdc"
    install_file "$REPO/generated/cursor/.cursor/rules/05-python.mdc" "$PWD/.cursor/rules/05-python.mdc"
    install_file "$REPO/generated/cursor/.cursor/rules/06-documentation.mdc" "$PWD/.cursor/rules/06-documentation.mdc"
    install_file "$REPO/generated/cursor/.cursor/rules/07-security-review.mdc" "$PWD/.cursor/rules/07-security-review.mdc"
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

echo "Done. Routing profile metadata: $PROFILE."
