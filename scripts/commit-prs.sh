
#!/usr/bin/env bash
set -euo pipefail

# Script to commit PR #90 through PR #94
# Make sure you have made all the necessary changes before running this script

echo "=== Committing PRs 90-94 ==="

# Make sure we're on the main branch
echo "Checking out main branch..."
git checkout main

# Pull latest changes to avoid conflicts
echo "Pulling latest changes..."
git pull origin main

# PR #90
echo ""
echo "=== PR #90 ==="
read -p "Enter description for PR #90: " pr90_desc
if [ -n "$pr90_desc" ]; then
  git add .
  git commit -m "PR #90: $pr90_desc" || echo "No changes to commit for PR #90"
fi

# PR #91
echo ""
echo "=== PR #91 ==="
read -p "Enter description for PR #91: " pr91_desc
if [ -n "$pr91_desc" ]; then
  git add .
  git commit -m "PR #91: $pr91_desc" || echo "No changes to commit for PR #91"
fi

# PR #92
echo ""
echo "=== PR #92 ==="
read -p "Enter description for PR #92: " pr92_desc
if [ -n "$pr92_desc" ]; then
  git add .
  git commit -m "PR #92: $pr92_desc" || echo "No changes to commit for PR #92"
fi

# PR #93
echo ""
echo "=== PR #93 ==="
read -p "Enter description for PR #93: " pr93_desc
if [ -n "$pr93_desc" ]; then
  git add .
  git commit -m "PR #93: $pr93_desc" || echo "No changes to commit for PR #93"
fi

# PR #94
echo ""
echo "=== PR #94 ==="
read -p "Enter description for PR #94: " pr94_desc
if [ -n "$pr94_desc" ]; then
  git add .
  git commit -m "PR #94: $pr94_desc" || echo "No changes to commit for PR #94"
fi

# Show commit history
echo ""
echo "=== Recent commit history ==="
git log --oneline -10

# Ask if user wants to push
echo ""
read -p "Push commits to remote? (y/n): " push_confirm
if [ "$push_confirm" = "y" ]; then
  git push origin main
  echo "✅ Changes pushed successfully"
else
  echo "ℹ️  Changes committed locally. Run 'git push origin main' when ready to push."
fi

echo ""
echo "=== Done! ==="
