#!/bin/bash

# Push Your E-Code Platform to GitHub
# Run this script to push all your code to the GitHub repository

echo "==================================="
echo "  Pushing E-Code to GitHub"
echo "==================================="

# Check if git is initialized
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
fi

# Add GitHub remote if not exists
if ! git remote | grep -q origin; then
    echo "Adding GitHub remote..."
    git remote add origin https://github.com/openaxcloud/e-code.git
else
    echo "GitHub remote already configured"
fi

# Add all files
echo "Adding all project files..."
git add .

# Create initial commit
echo "Creating commit..."
git commit -m "Complete E-Code Platform implementation with MCP server, AI integration, and GCP deployment support" || echo "Nothing to commit"

# Push to GitHub
echo "Pushing to GitHub..."
echo "You may be prompted for your GitHub username and password/token"
git push -u origin main || git push -u origin master

echo ""
echo "==================================="
echo "  ✅ Code Pushed to GitHub!"
echo "==================================="
echo ""
echo "Your repository should now be available at:"
echo "https://github.com/openaxcloud/e-code"
echo ""
echo "To clone it elsewhere (like Google Cloud):"
echo "git clone https://github.com/openaxcloud/e-code.git"