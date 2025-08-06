# Connect Claude.ai to Your MCP Server

## What You Need for Claude MCP Connection

Since you've already installed the MCP connectors in Claude, here's what's missing and how to complete the connection:

## 🔴 Current Issue
Your MCP server is running locally, but Claude.ai cannot connect to `localhost` or `127.0.0.1` addresses. You need either:
1. **A public URL** (using ngrok or deploying to Cloud Run)
2. **OR use the built-in MCP features** in Claude Desktop App

## Option 1: Use Ngrok for Quick Testing (Recommended for Testing)

### Step 1: Install and run ngrok
```bash
# Install ngrok (if not already installed)
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# Or download directly
wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
unzip ngrok-stable-linux-amd64.zip

# Run ngrok to expose your MCP server
ngrok http 5000
```

### Step 2: Get your public URL
After running ngrok, you'll see:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:5000
```

### Step 3: Connect in Claude.ai
1. Go to Claude.ai → Settings → MCP Connectors
2. Add new MCP Server:
   - **Name**: E-Code Platform MCP
   - **Server URL**: `https://abc123.ngrok.io/api/mcp`
   - **API Key**: `test-api-key` (for testing)
   - **Description**: E-Code Platform development tools

## Option 2: Deploy to Cloud Run (Production)

Since gcloud is installed, deploy for permanent access:

```bash
# Configure your project
gcloud config set project YOUR_PROJECT_ID

# Deploy using the script
./deploy-mcp-server.sh
```

After deployment, you'll get:
- **Public URL**: `https://ecode-mcp-server-xxxxx-uc.a.run.app`
- **API Key**: Generated during deployment

## Option 3: Use Claude Desktop App (Simplest)

If you're using Claude Desktop App (not web), you can configure local MCP servers:

### Create MCP config file:
```bash
# For macOS/Linux
mkdir -p ~/.config/claude
cat > ~/.config/claude/mcp.json << 'EOF'
{
  "servers": {
    "ecode-platform": {
      "command": "node",
      "args": ["/path/to/workspace/server/mcp/standalone-server.ts"],
      "env": {
        "PORT": "3200",
        "MCP_API_KEY": "test-api-key"
      }
    }
  }
}
EOF
```

### For Windows:
Create `%APPDATA%\Claude\mcp.json` with the same content.

## What Your MCP Server Provides

Once connected, Claude will have access to:

### 🛠️ Tools (15+ available):
- **File Operations**: Create, read, write, delete files
- **Code Execution**: Run commands, install packages
- **Database**: Query and manage PostgreSQL
- **AI Integration**: Use Anthropic Claude API
- **Git Operations**: Status, commit, push
- **System Info**: Get environment details

### 📦 Resources:
- Filesystem access
- Database connections
- Environment variables
- Process management
- Git repositories

### 🔑 Authentication Methods:
- API Key (simplest)
- OAuth2 (for production)
- JWT tokens (for sessions)

## Testing Your Connection

Once connected, you can test in Claude by asking:
- "What MCP tools are available?"
- "Show me the file structure of the project"
- "Run a test command using MCP"

## Troubleshooting

### If connection fails:
1. **Check server is running**: 
   ```bash
   curl http://localhost:5000/api/mcp/health
   ```

2. **Check logs**:
   ```bash
   # Check server logs
   tail -f server.log
   ```

3. **Verify CORS is allowing your domain**:
   - The server already allows Claude.ai domains
   - Ngrok URLs are automatically allowed

### Common Issues:
- **"Cannot connect"**: Use ngrok or deploy to Cloud Run
- **"Unauthorized"**: Check API key is correct
- **"CORS error"**: Server needs restart after config changes

## Current Server Status

Your MCP server is running at:
- **Local**: `http://localhost:5000/api/mcp`
- **Standalone**: `http://127.0.0.1:3200` (for internal use)
- **Status**: ✅ Running and ready

To make it accessible to Claude.ai web, you need to:
1. Use ngrok (quick, temporary)
2. OR deploy to Cloud Run (permanent)
3. OR use Claude Desktop App (local only)

Choose the option that best fits your needs!