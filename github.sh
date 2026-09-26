apt-get update && \
    apt-get install -y \
    openssh-server \
    curl \
    git \
    sudo \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*


curl -fsSL https://chatgpt.com/codex/install.sh | sh

codex --version

sudo apt update
sudo apt install gh
gh auth login --hostname github.com --git-protocol https --web


gh auth status

git clone https://github.com/siva1b3/agents


