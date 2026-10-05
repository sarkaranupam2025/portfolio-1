#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Publishes this folder to a GitHub repository.
#
# Use this if you would rather not carry around the .git directory from the
# prepared bundle — it makes a fresh commit from the files themselves.
#
#   bash push-to-github.sh https://github.com/sarkaranupam2025/Anupam-Portfolio-.git
#
# Run it with `bash` rather than `./` — zip archives lose the executable bit, so
# the file may arrive non-executable. (It restores its own mode below anyway.)
#
# GitHub no longer accepts account passwords over HTTPS, so when git asks for a
# password, paste a Personal Access Token:
#   github.com -> Settings -> Developer settings -> Personal access tokens
#   -> Fine-grained token -> repository access: just this repo
#   -> Permissions: Contents = Read and write
#
# If the repository does not exist yet, create it first (New repository -> name it
# -> do NOT add a README, .gitignore or licence, so the first push is clean).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REMOTE="${1:-https://github.com/sarkaranupam2025/Anupam-Portfolio-.git}"
BRANCH="${2:-main}"
cd "$(dirname "$0")"

case "$REMOTE" in
  -h|--help|help)
    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
    exit 0 ;;
esac
case "$REMOTE" in
  https://*|http://*|git@*|ssh://*) : ;;
  *) echo "'$REMOTE' does not look like a repository URL."
     echo "Usage: bash push-to-github.sh [https://github.com/USER/REPO.git] [branch]"
     exit 1 ;;
esac

command -v git >/dev/null || { echo "git is not installed."; exit 1; }
chmod +x "$0" 2>/dev/null || true      # zip archives drop the executable bit

echo "Repository : $REMOTE"
echo "Branch     : $BRANCH"
echo "Folder     : $(pwd)"
echo

# Never commit dependencies or local CMS data
if [ ! -f .gitignore ]; then
  echo "No .gitignore found — refusing to run, you would commit node_modules/."
  exit 1
fi
rm -rf build/node_modules 2>/dev/null || true

if [ -d .git ]; then
  echo "A git repository already exists here."
  git remote set-url origin "$REMOTE"
  echo "Repointed origin -> $REMOTE"
else
  git init -q -b "$BRANCH"
  git remote add origin "$REMOTE"
  echo "Initialised a new repository."
fi

git config user.name  >/dev/null 2>&1 || git config user.name  "Anupam Sarkar"
git config user.email >/dev/null 2>&1 || git config user.email "ar.anupamsarkar@gmail.com"

git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -q -m "Portfolio, four case studies, and a no-server CMS

site/    the portfolio plus four case studies, each with a real light theme
         alongside its dark one and a shared theme preference
cms/     admin panel, content model, and the runtime that applies it
backend/ optional serverless auth and shared storage
build/   generators, palette applier, and the test suite (235 checks)
download/ single-file builds, including one with all four studies embedded"
  echo "Committed $(git rev-parse --short HEAD)."
fi

echo
echo "Pushing to $BRANCH..."
echo "(username: your GitHub username — password: a Personal Access Token)"
if git push -u origin "$BRANCH"; then
  echo
  echo "Done. ${REMOTE%.git}/tree/$BRANCH"
else
  echo
  echo "The push failed. The usual causes:"
  echo "  • the repository does not exist yet — create it on github.com first"
  echo "  • you pasted your account password instead of a token"
  echo "  • the token lacks Contents: Read and write on this repository"
  echo "  • the remote already has commits — run: git pull --rebase origin $BRANCH"
  exit 1
fi
