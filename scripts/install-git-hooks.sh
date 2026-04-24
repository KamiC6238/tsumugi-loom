#!/bin/sh

set -eu

REPO_ROOT="$(git rev-parse --show-toplevel)"
SOURCE_DIR="$REPO_ROOT/.github/hooks"
TARGET_DIR="$REPO_ROOT/.git/hooks"

mkdir -p "$TARGET_DIR"
cp "$SOURCE_DIR/pre-commit" "$TARGET_DIR/pre-commit"
chmod +x "$TARGET_DIR/pre-commit"

echo "Installed pre-commit hook from .github/hooks/pre-commit"