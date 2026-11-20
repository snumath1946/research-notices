#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js LTS를 먼저 설치한 뒤 다시 실행해 주세요: https://nodejs.org/'
  read -r '?종료하려면 Enter를 누르세요. '
  exit 1
fi
exec node scripts/start-converter.mjs "$@"
