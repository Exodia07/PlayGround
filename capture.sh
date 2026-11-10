#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"
: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to the evidence output directory}"
: "${RUNTIME_DIR:?RUNTIME_DIR must point to the worker runtime}"

# The runtime capture owns and closes its browser; strict mode treats page/render errors as defects.
/usr/bin/time -p env CAPTURE_STRICT=1 CAPTURE_READY_SELECTOR="#scene" node "$RUNTIME_DIR/scripts/default-capture.mjs"
