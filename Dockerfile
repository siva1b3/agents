FROM ubuntu:24.04

RUN apt-get update && \
    apt-get install -y \
    openssh-server \
    curl \
    git \
    sudo \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /run/sshd

RUN useradd -m -s /bin/bash dev && \
    usermod -aG sudo dev

# Explicit SSH configuration
RUN printf '%s\n' \
    'PubkeyAuthentication yes' \
    'PasswordAuthentication no' \
    'PermitRootLogin no' \
    > /etc/ssh/sshd_config.d/99-dev.conf

# Install Codex CLI
USER dev

RUN curl -fsSL https://chatgpt.com/codex/install.sh \
    | CODEX_NON_INTERACTIVE=1 sh

ENV PATH="/home/dev/.local/bin:${PATH}"

USER root

RUN mkdir -p /home/dev/workspace && \
    chown -R dev:dev /home/dev/workspace

WORKDIR /home/dev/workspace

EXPOSE 22 3000 4000 5001 5002 5003 5004 5005

CMD ["/usr/sbin/sshd", "-D", "-e"]