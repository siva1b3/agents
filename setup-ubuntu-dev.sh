#!/bin/bash
set -euo pipefail

install_dependencies() {
  apt-get update

  DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
      openssh-server \
      curl \
      git \
      sudo \
      ca-certificates

  rm -rf /var/lib/apt/lists/*
}

prepare_ssh_directories() {
  mkdir -p /root/.ssh /run/sshd
  chmod 700 /root/.ssh
}

install_authorized_key() {
  cp /tmp/chatgpt_ubuntu_dev.pub /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
}

configure_ssh_server() {
  cat > /etc/ssh/sshd_config.d/99-dev.conf <<'CONFIG'
PermitRootLogin prohibit-password
PubkeyAuthentication yes
CONFIG
}

generate_host_keys() {
  ssh-keygen -A
}

main() {
  install_dependencies
  prepare_ssh_directories
  install_authorized_key
  configure_ssh_server
  generate_host_keys
}

main
