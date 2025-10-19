#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
LOCK_FILE="$REPO_ROOT/.git/index.lock"

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "Error: unable to find .git directory from $REPO_ROOT" >&2
  exit 1
fi

if [ -f "$LOCK_FILE" ]; then
  rm -f "$LOCK_FILE"
  echo "Removed stale git index lock at $LOCK_FILE"
else
  echo "No git index lock found at $LOCK_FILE"
fi
