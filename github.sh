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

cd /agents
git config user.name "siva"
git config user.email "siva@openai.com"

git config --list



sudo apt update
sudo apt install -y python3 python3-venv python3-pip


python3 --version
python3 -m pip --version
python3 -c "import venv; print('Virtual environment support is available')"



cd /agents
mkdir -p navigator-agent
cd navigator-agent
python3 -m venv .venv
source .venv/bin/activate



which python
python --version
python -m pip --version


source /agents/navigator-agent/.venv/bin/activate


cd /agents/navigator-agent

cat >> .gitignore <<'EOF'
.venv/
__pycache__/
*.pyc
.env
EOF


cd /agents/navigator-agent
source .venv/bin/activate
python -m pip install openai


python -m pip show openai
python -m pip check

python -m pip freeze > requirements.txt

cat requirements.txt
git status --short

python -m pip install -r requirements.txt

