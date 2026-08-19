#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TEMP_HOME="$(mktemp -d)"
trap 'rm -rf "$TEMP_HOME"' EXIT

for agent in opencode omp claude-code codex goose; do
  HOME="$TEMP_HOME" XDG_CONFIG_HOME="$TEMP_HOME/.config" "$ROOT/scripts/install.sh" --agent "$agent" --dry-run >/dev/null
done

INSTALL_PROJECT="$(mktemp -d)"
(
  cd "$INSTALL_PROJECT"
  HOME="$TEMP_HOME" "$ROOT/scripts/install.sh" --agent cursor --dry-run >/dev/null
  HOME="$TEMP_HOME" "$ROOT/scripts/install.sh" --agent cursor >/dev/null
  test -L .cursorignore
  test -L .cursor/mcp.json
  test "$(find .cursor/rules -type l -name '*.mdc' | wc -l)" -eq 8
)
rm -rf "$INSTALL_PROJECT"

HOME="$TEMP_HOME" XDG_CONFIG_HOME="$TEMP_HOME/.config" "$ROOT/scripts/install.sh" --agent opencode >/dev/null
HOME="$TEMP_HOME" XDG_CONFIG_HOME="$TEMP_HOME/.config" "$ROOT/scripts/install.sh" --agent omp >/dev/null
HOME="$TEMP_HOME" XDG_CONFIG_HOME="$TEMP_HOME/.config" "$ROOT/scripts/install.sh" --agent claude-code >/dev/null
HOME="$TEMP_HOME" XDG_CONFIG_HOME="$TEMP_HOME/.config" "$ROOT/scripts/install.sh" --agent codex >/dev/null
HOME="$TEMP_HOME" XDG_CONFIG_HOME="$TEMP_HOME/.config" "$ROOT/scripts/install.sh" --agent goose >/dev/null

test -L "$TEMP_HOME/.config/opencode/opencode.json"
test -L "$TEMP_HOME/.omp/agent/config.yml"
test -L "$TEMP_HOME/.claude/settings.json"
test -L "$TEMP_HOME/.claude/.mcp.json"
test -L "$TEMP_HOME/.claude/.mcp.json"
test -L "$TEMP_HOME/.codex/config.toml"
test -L "$TEMP_HOME/.config/goose/config.yaml"

echo "installer sandbox tests OK"

HOME="$TEMP_HOME" XDG_CONFIG_HOME="$TEMP_HOME/.config" "$ROOT/scripts/install.sh" doctor >/dev/null
HOME="$TEMP_HOME" XDG_CONFIG_HOME="$TEMP_HOME/.config" "$ROOT/scripts/install.sh" uninstall >/dev/null
test ! -e "$TEMP_HOME/.config/opencode/opencode.json"
test ! -e "$TEMP_HOME/.omp/agent/config.yml"
test ! -e "$TEMP_HOME/.claude/.mcp.json"
test ! -e "$TEMP_HOME/.claude/.mcp.json"

echo "doctor and uninstall sandbox tests OK"
