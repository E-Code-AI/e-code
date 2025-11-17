#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "Error: unable to find .git directory from $REPO_ROOT" >&2
  exit 1
fi

# Remove all lock files
LOCK_FILES_REMOVED=0

# Clean index.lock
if [ -f "$REPO_ROOT/.git/index.lock" ]; then
  rm -f "$REPO_ROOT/.git/index.lock"
  echo "✓ Removed .git/index.lock"
  LOCK_FILES_REMOVED=$((LOCK_FILES_REMOVED + 1))
fi

# Clean all ref locks recursively
find "$REPO_ROOT/.git/refs" -type f -name "*.lock" 2>/dev/null | while read -r lock_file; do
  rm -f "$lock_file"
  echo "✓ Removed $lock_file"
  LOCK_FILES_REMOVED=$((LOCK_FILES_REMOVED + 1))
done

# Clean HEAD.lock if exists
if [ -f "$REPO_ROOT/.git/HEAD.lock" ]; then
  rm -f "$REPO_ROOT/.git/HEAD.lock"
  echo "✓ Removed .git/HEAD.lock"
  LOCK_FILES_REMOVED=$((LOCK_FILES_REMOVED + 1))
fi

if [ $LOCK_FILES_REMOVED -eq 0 ]; then
  echo "✓ No Git lock files found"
else
  echo "✓ Removed $LOCK_FILES_REMOVED lock file(s)"
fi
