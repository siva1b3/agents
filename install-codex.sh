#!/bin/bash
set -euo pipefail

install_codex() {
  curl -fsSL https://chatgpt.com/codex/install.sh | sh
}

configure_path() {
  export PATH="/root/.local/bin:$PATH"
}

verify_installation() {
  codex --version
}

main() {
  install_codex
  configure_path
  verify_installation
}

main