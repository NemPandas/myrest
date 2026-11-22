#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

server="165.22.115.165"
user="deploy"
remote="/home/deploy/apps/myrest/backend"
app="myrest-backend"

# Run in Git Bash with npm and OpenSSH (ssh/scp) on PATH.
for tool in npm ssh scp; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "Missing command: $tool. Add Node.js and OpenSSH to PATH." >&2
    exit 1
  }
done

npm run build

# Use standard OpenSSH keys/agent, or supply an OpenSSH key path in DEPLOY_KEY.
auth=(-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no)
if [[ -n "${DEPLOY_KEY:-}" ]]; then
  [[ -f "$DEPLOY_KEY" ]] || { echo "SSH key file not found: $DEPLOY_KEY" >&2; exit 1; }
  auth+=(-i "$DEPLOY_KEY" -o IdentitiesOnly=yes)
fi

# On first connection OpenSSH asks you to verify the server host key.
ssh "${auth[@]}" "$user@$server" "mkdir -p '$remote'"

scp "${auth[@]}" -r migrations dist "$user@$server:$remote/"
scp "${auth[@]}" package.json package-lock.json schema.sql .env.example "$user@$server:$remote/"

# Load NVM explicitly: noninteractive SSH sessions do not load it automatically.
# Keep the server .env and database intact; schema.sql is only uploaded.
command="set -e
export NVM_DIR=\"\$HOME/.nvm\"
. \"\$NVM_DIR/nvm.sh\"
nvm use 24 >/dev/null
cd '$remote'
npm ci --omit=dev
if [ ! -f .env ]; then
  echo 'Upload complete. Configure the server .env and import schema.sql before starting the backend.'
  exit 0
fi
if pm2 describe '$app' >/dev/null 2>&1; then
  pm2 restart '$app' --update-env
else
  pm2 start npm --name '$app' -- start
fi
pm2 save
"

printf '%s\n' "$command" | ssh "${auth[@]}" "$user@$server" "bash -s"
