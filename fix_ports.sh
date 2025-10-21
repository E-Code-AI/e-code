#!/bin/bash

# This script will fix the .replit port configuration for publishing

echo "🔧 Fixing .replit port configuration for Reserved VM deployment..."
echo ""
echo "This script will create a corrected .replit file content."
echo "You need to manually copy and paste it."
echo ""
echo "========================================="
echo "COPY THE FOLLOWING INTO YOUR .replit FILE:"
echo "========================================="
echo ""

cat << 'EOF'
modules = ["nodejs-20", "web", "postgresql-16", "python-3.11"]
run = "npm run dev"
hidden = [".config", ".git", "generated-icon.png", "node_modules", "dist"]

[nix]
channel = "stable-24_05"
packages = ["glibcLocales", "go", "google-cloud-sdk", "jq", "libxcrypt", "sptk"]

[deployment]
deploymentTarget = "cloudrun"
build = ["npm", "install"]
run = ["npm", "run", "dev"]

[[ports]]
localPort = 5000
externalPort = 80

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Project"
mode = "parallel"
author = "agent"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"

[[workflows.workflow]]
name = "Start application"
author = "agent"

[workflows.workflow.metadata]
agentRequireRestartOnSave = false

[[workflows.workflow.tasks]]
task = "packager.installForAll"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000

[agent]
integrations = ["javascript_slack==1.0.0", "javascript_openai==1.0.0", "javascript_anthropic==1.0.0", "javascript_xai==1.0.0", "javascript_gemini==1.0.0", "perplexity_v0==1.0.0", "javascript_sendgrid==1.0.0", "javascript_stripe==1.0.0", "javascript_websocket==1.0.0"]

[objectStorage]
defaultBucketID = "replit-objstore-2566672f-a4a2-4a4f-94f0-4e6c88fa4e9b"
EOF

echo ""
echo "========================================="
echo "HOW TO FIX:"
echo "========================================="
echo ""
echo "1. Click on the .replit file in your file explorer"
echo "2. Select ALL text (Ctrl+A or Cmd+A)"
echo "3. Delete it all"
echo "4. Paste the content shown above"
echo "5. Save the file (Ctrl+S or Cmd+S)"
echo "6. Run: kill 1 (to restart the workspace)"
echo "7. Try publishing again!"
echo ""
echo "✅ This fixes the 'multiple ports' issue that prevents publishing on Reserved VMs."