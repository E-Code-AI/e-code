# Web Content Import Documentation

## Overview

The Web Content Import feature allows users to import content, take screenshots, and extract text from any web page directly into their E-Code projects. This feature provides first-class integration with clean text extraction, screenshot capture, and intelligent content processing.

## Features

### URL Import
- **Smart Content Extraction**: Uses readability algorithms to extract main content while removing boilerplate
- **Multiple Format Support**: Provides both plain text and Markdown converted content
- **Metadata Extraction**: Captures title, description, reading time, word count, images, and links
- **Artifact Storage**: Saves content in structured project folders with proper organization

### Screenshot Capture
- **Full-Page Screenshots**: Captures complete page content using headless Chromium
- **Above-the-Fold Capture**: Provides quick preview screenshots for faster loading
- **High Quality**: 1920x1080 resolution with PNG format for crisp images
- **Safe Automation**: Sandboxed browser execution with proper timeout handling

### Text Extraction
- **Readability Algorithm**: Intelligent content identification removing navigation, ads, and boilerplate
- **HTML-to-Markdown**: Clean conversion preserving formatting and structure
- **Code Block Detection**: Automatically identifies and preserves code snippets
- **Link and Image Extraction**: Catalogs all media and external references

## User Interface

### Command Palette Integration
Access web import features quickly using keyboard shortcuts:
- `⌘⇧I` - Open web import dialog
- Search for "Import from URL", "Capture Screenshot", or "Extract Text Only"

### Sidebar Widget
Compact web import widget available in project sidebars:
- Quick URL input with one-click import
- Separate buttons for screenshot-only and text-only extraction
- Real-time status indicators and progress feedback

### Full Import Dialog
Comprehensive import interface with:
- Feature status indicators showing enabled capabilities
- Import options (screenshot inclusion, artifact saving, extraction type)
- Tabbed results view (Content, Markdown, Screenshot, Metadata)
- Copy-to-clipboard functionality for easy content usage

## API Usage

### Import Content from URL
```typescript
POST /api/import/url
{
  "url": "https://example.com/article",
  "projectId": 123,
  "options": {
    "includeScreenshot": true,
    "saveArtifacts": true,
    "extractionType": "readability"
  }
}
```

### Capture Screenshot Only
```typescript
POST /api/import/screenshot
{
  "url": "https://example.com",
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

### Check Feature Status
```typescript
GET /api/import/status
// Returns current feature flag status for the user
```

## Feature Flags

All web import features are controlled by feature flags and default to **disabled** for gradual rollout:

- `flags.import.url` - Enable/disable URL content import
- `flags.import.screenshot` - Enable/disable screenshot capture
- `flags.import.textExtraction` - Enable/disable text extraction
- `flags.import.readabilityAlgorithm` - Enable smart content detection
- `flags.import.htmlToMarkdown` - Enable HTML to Markdown conversion

### Enabling Features
```typescript
POST /api/import/feature-flags
{
  "feature": "urlImport",
  "enabled": true
}
```

## Error Handling

The system gracefully handles common scenarios:

### Network Issues
- **Connection Timeouts**: 30-second timeout with proper error messages
- **HTTP Errors**: Clear feedback for 403, 404, 500 status codes
- **Invalid URLs**: URL validation with helpful correction suggestions

### Content Issues
- **JavaScript-heavy Sites**: Waits for content to load before extraction
- **Paywalls**: Respects access restrictions and provides appropriate feedback
- **Empty Content**: Fallback extraction methods for edge cases

### Feature Restrictions
- **Disabled Features**: Clear messaging when features are not enabled
- **Rate Limiting**: Prevents abuse with proper throttling
- **Permission Errors**: Authentication and authorization feedback

## Security

### Safe Browsing
- **Sandboxed Execution**: Browser runs in isolated environment
- **Resource Limits**: Memory and CPU constraints prevent system abuse
- **No Code Execution**: Content extraction only, no script execution

### Input Validation
- **URL Sanitization**: Comprehensive URL validation and cleaning
- **Content Filtering**: Removes potentially harmful content during extraction
- **Size Limits**: Prevents oversized content from overwhelming the system

### Privacy Protection
- **No Data Retention**: Original HTML not stored beyond processing
- **User Agent**: Identifies as E-Code platform for transparency
- **Robots.txt Respect**: Honors website crawling preferences

## Performance

### Optimization
- **Parallel Processing**: Screenshot and content extraction can run simultaneously
- **Caching**: Results cached to avoid redundant processing
- **Compression**: Artifacts stored with optimal compression

### Monitoring
- **Processing Time**: Tracked and reported for performance monitoring
- **Success Rates**: Telemetry on import success/failure rates
- **Content Metrics**: Word count, reading time, and size tracking

## Telemetry

Comprehensive tracking for feature improvement:

### Success Metrics
- Import completion rates
- Processing times
- Content quality metrics (word count, reading time)
- User engagement with imported content

### Error Analysis
- Failure categorization (network, content, permission)
- Error frequency by domain and content type
- User retry patterns and success rates

### Feature Usage
- Most popular import types (full, screenshot, text-only)
- Feature flag adoption rates
- User workflow patterns

## Limitations

### Site Compatibility
- **Single Page Applications**: May require special handling for dynamic content
- **Authentication Required**: Cannot access login-protected content
- **Geographic Restrictions**: Respects regional content blocking

### Content Types
- **PDF Files**: Currently text-only, no embedded media extraction
- **Video Content**: Screenshots only, no video download capability
- **Interactive Elements**: Static capture only, no dynamic interaction

### Rate Limits
- **Per-User Limits**: Prevents individual user abuse
- **System-wide Limits**: Protects overall platform performance
- **Domain-specific Limits**: Respects target site preferences

## Troubleshooting

### Common Issues

**"Feature Not Available"**
- Check feature flag status in user settings
- Contact administrator for feature enablement

**"Import Failed - Network Error"**
- Verify URL is accessible from your browser
- Check for typos in the URL
- Try again in a few minutes for temporary issues

**"Screenshot Capture Failed"**
- Ensure screenshot feature is enabled
- Check if site blocks automated access
- Try with a different URL for testing

**"No Content Extracted"**
- Site may be heavily JavaScript-dependent
- Content might be behind authentication
- Try using screenshot mode instead

### Support

For additional help with web import features:
1. Check feature flag status in settings
2. Verify URL accessibility in a regular browser
3. Try different extraction types (full, text-only, screenshot)
4. Contact support with specific error messages

## Future Enhancements

### Planned Features
- **Batch Import**: Multiple URLs in a single operation
- **Scheduled Imports**: Automatic content updates from monitored URLs
- **Content Diff**: Track changes in imported content over time
- **Advanced Filtering**: Custom content selection and filtering rules

### Integration Opportunities
- **AI Enhancement**: Automatic summarization and key point extraction
- **Project Templates**: URL-based project initialization
- **Collaboration**: Shared import libraries and team collections
- **Export Options**: Integration with external documentation tools