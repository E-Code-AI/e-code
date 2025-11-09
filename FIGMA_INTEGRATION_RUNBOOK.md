# Figma Integration Runbook

## Overview
The E-Code Platform supports importing Figma designs directly into React components using the FigmaImportService. This service integrates with the Figma REST API to fetch design files and convert them to production-ready code.

## Environment Setup

### Required Environment Variable
```bash
FIGMA_API_KEY=your_figma_personal_access_token
```

### How to Obtain Figma API Key

1. **Log in to Figma** (https://www.figma.com/)
2. **Navigate to Settings**
   - Click your profile icon (top-right)
   - Select "Settings"
3. **Generate Personal Access Token**
   - Scroll to "Personal access tokens"
   - Click "Create new token"
   - Give it a descriptive name (e.g., "E-Code Platform")
   - Copy the token immediately (you won't see it again)
4. **Add to Replit Secrets**
   - In Replit, open the Secrets tab (🔒 icon in left sidebar)
   - Add key: `FIGMA_API_KEY`
   - Paste your token as the value
   - Click "Add Secret"

## Service Behavior

### With FIGMA_API_KEY Configured
- Service fetches real Figma files via REST API
- Authenticates using `X-Figma-Token` header
- Converts Figma nodes to React components
- Extracts styles, layouts, and typography
- Logs successful API requests

### Without FIGMA_API_KEY (Fallback Mode)
- Service uses demo/mock Figma data
- No API calls made to Figma servers
- Returns predefined component structure
- Logs: "Using demo Figma data (no API key configured)"
- Useful for development and testing

### Error Handling
If API request fails (network issue, invalid key, rate limit):
- Service logs the error
- Falls back to demo data automatically
- Application continues to function
- Log message: "Figma API error: [details], falling back to demo data"

## API Endpoints

### Import Figma File
```http
POST /api/figma/import
Content-Type: application/json

{
  "figmaUrl": "https://www.figma.com/file/XXXX/FileName",
  "projectName": "Optional Project Name"
}
```

**Response:**
```json
{
  "projectId": "uuid",
  "components": {
    "Header": "// React component code...",
    "HeroSection": "// React component code..."
  },
  "styles": "// CSS/Tailwind styles..."
}
```

## Supported Figma Features

### Layouts
- Frame layouts (horizontal/vertical)
- Auto-layout with spacing
- Padding (left, right, top, bottom)
- Alignment (center, flex-start, flex-end)

### Styling
- Background colors (solid fills)
- Border radius
- Dimensions (width, height)

### Typography
- Font family
- Font size
- Font weight
- Text alignment
- Text color

### Nested Components
- Recursive component conversion
- Parent-child relationships preserved
- Component naming from Figma layer names

## Usage Example

```typescript
import { FigmaImportService } from './services/figma-import-service';

const figmaService = new FigmaImportService(storage);

// Import a Figma design
const result = await figmaService.importFigmaFile(
  userId,
  'https://www.figma.com/file/ABC123/MyDesign',
  'My New Project'
);

console.log(`Created project: ${result.projectId}`);
console.log(`Generated ${Object.keys(result.components).length} components`);
```

## Monitoring & Troubleshooting

### Check Integration Status
```bash
# In Replit shell
echo $FIGMA_API_KEY | cut -c1-10  # Should show first 10 chars
```

### Common Issues

**Problem:** "Figma API request failed: 401"
- **Cause:** Invalid or expired API token
- **Solution:** Generate new token and update FIGMA_API_KEY secret

**Problem:** "Figma API request failed: 404"
- **Cause:** Invalid file key or file not accessible
- **Solution:** Verify Figma URL and file permissions

**Problem:** "Figma API request failed: 429"
- **Cause:** Rate limit exceeded (Figma limits: 500 requests/minute)
- **Solution:** Wait and retry, or reduce request frequency

**Problem:** Service uses demo data unexpectedly
- **Cause:** FIGMA_API_KEY not configured or API error
- **Solution:** Check environment variable, check logs for error details

### Log Examples

**Successful API Call:**
```
[FigmaImportService] Successfully fetched Figma file: ABC123
[FigmaImportService] Created project: uuid-here
[FigmaImportService] Generated 3 components
```

**Fallback Mode:**
```
[FigmaImportService] Using demo Figma data (no API key configured)
[FigmaImportService] Created project: uuid-here
[FigmaImportService] Generated 2 demo components
```

**API Error with Fallback:**
```
[FigmaImportService] Figma API error: RequestError: 401 Unauthorized, falling back to demo data
[FigmaImportService] Created project: uuid-here
[FigmaImportService] Generated 2 demo components
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use Replit Secrets** for storing FIGMA_API_KEY
3. **Rotate tokens periodically** (every 90 days recommended)
4. **Limit token scope** if Figma adds granular permissions
5. **Monitor API usage** to detect unauthorized access
6. **Use HTTPS only** (enforced by Figma API)

## Rate Limits

Figma API limits (as of 2025):
- **Personal tokens:** 500 requests per minute
- **OAuth tokens:** 1,000 requests per minute

The service implements automatic fallback to prevent failures when limits are reached.

## Further Reading

- [Figma API Documentation](https://www.figma.com/developers/api)
- [Figma REST API Reference](https://www.figma.com/developers/api#get-files-endpoint)
- [Authentication Guide](https://www.figma.com/developers/api#authentication)
