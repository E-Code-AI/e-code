# MCP Server Cloud Run Deployment Guide

## Prerequisites Completed ✓
- ✅ **gcloud CLI installed** (version 475.0.0)
- ✅ MCP server fully operational with authentication
- ✅ Deployment scripts ready (deploy-mcp-server.sh, cloudbuild.yaml)

## Quick Start Deployment

### 1. Configure Your GCP Project
First, update the deployment script with your project details:

```bash
# Edit deploy-mcp-server.sh
nano deploy-mcp-server.sh
```

Change these values at the top of the file:
- `PROJECT_ID="your-gcp-project-id"` → Your actual GCP project ID
- `DOMAIN="mcp.your-domain.com"` → Your domain (or use the auto-generated Cloud Run URL)

### 2. Authenticate with Google Cloud
```bash
# Login to your Google Cloud account
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Set default region
gcloud config set run/region us-central1
```

### 3. Deploy the MCP Server
```bash
# Make the script executable
chmod +x deploy-mcp-server.sh

# Run the deployment
./deploy-mcp-server.sh
```

The script will:
- Enable required GCP APIs
- Create secure API keys and secrets
- Build and deploy the container to Cloud Run
- Configure HTTPS and authentication
- Provide you with the MCP API key for Claude.ai

### 4. Get Your MCP Server URL
After deployment, you'll receive:
- **Service URL**: `https://ecode-mcp-server-xxxxx-uc.a.run.app`
- **MCP API Key**: `mcp_key_xxxxx...` (save this!)

### 5. Connect Claude.ai to Your MCP Server

1. Go to Claude.ai Custom Connectors
2. Add a new MCP connection:
   - **Server URL**: Your Cloud Run URL from step 4
   - **API Key**: The MCP API key from deployment
   - **Name**: "E-Code Platform MCP"

### Alternative: Local Testing First
If you want to test locally before deploying:

```bash
# The MCP server is already running locally at:
# http://127.0.0.1:3200

# Test the connection
curl http://127.0.0.1:3200/mcp/health

# Test with authentication
curl -H "X-API-Key: test-api-key" http://127.0.0.1:3200/mcp/tools
```

## Troubleshooting

### If deployment fails:
1. Check you have billing enabled on your GCP project
2. Ensure you have the necessary permissions (Cloud Run Admin, Secret Manager Admin)
3. Review the Cloud Build logs: `gcloud builds list`

### To view deployed service:
```bash
# List your Cloud Run services
gcloud run services list

# Get service details
gcloud run services describe ecode-mcp-server

# View logs
gcloud run logs read --service=ecode-mcp-server
```

## Security Notes
- The deployment automatically generates secure API keys
- All secrets are stored in Google Secret Manager
- HTTPS is enforced with Cloud Run
- Rate limiting and CORS are pre-configured for Claude.ai

## Next Steps
After successful deployment:
1. Test the connection from Claude.ai
2. Monitor usage in the GCP Console
3. Set up custom domain (optional)
4. Configure additional authentication methods if needed

## Cost Estimation
Cloud Run pricing (approximate):
- **Free tier**: 2 million requests/month
- **After free tier**: ~$0.40 per million requests
- **Compute**: ~$0.00002400 per vCPU-second
- **Memory**: ~$0.00000250 per GiB-second

For typical MCP usage, expect < $5/month.