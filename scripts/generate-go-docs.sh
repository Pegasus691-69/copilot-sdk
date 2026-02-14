#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GO_DIR="$REPO_ROOT/go"
OUT_DIR="$REPO_ROOT/docs/go/reference"

usage() {
  echo "Usage: $0 [markdown|serve|all]"
  echo "  markdown  Generate Markdown reference docs via gomarkdoc"
  echo "  serve     Start local pkgsite HTML doc server"
  echo "  all       Generate Markdown then start HTML server"
  exit 1
}

generate_markdown() {
  echo "=== Generating Go Markdown docs ==="
  mkdir -p "$OUT_DIR"

  go run github.com/princjef/gomarkdoc/cmd/gomarkdoc@latest \
    --exclude-dirs "$GO_DIR/internal/e2e" \
    -o "$OUT_DIR/api.md" \
    "$GO_DIR/..."

  echo "✅ Markdown docs written to $OUT_DIR/api.md"
}

serve_html() {
  echo "=== Starting pkgsite HTML doc server ==="
  echo "Browse to: http://localhost:6060/github.com/github/copilot-sdk/go"
  echo "Press Ctrl+C to stop."

  go run golang.org/x/pkgsite/cmd/pkgsite@latest \
    -http=localhost:6060 \
    "$REPO_ROOT"
}

MODE="${1:-all}"

case "$MODE" in
  markdown) generate_markdown ;;
  serve)    serve_html ;;
  all)      generate_markdown; serve_html ;;
  *)        usage ;;
esac
