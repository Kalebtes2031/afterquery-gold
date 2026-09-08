#!/usr/bin/env bash
set -euo pipefail
cd /app
PATCH_PATH="${1:-/task/solution/solution.patch}"
git apply --whitespace=error "$PATCH_PATH"
