# Import Tools Documentation

This document describes the enhanced import tools available in the E-Code platform.

## Overview

The import system supports importing projects from various sources including:
- **Figma**: Design files with component extraction and code generation
- **Bolt.new/StackBlitz**: Complete project imports with framework detection
- **GitHub**: Repository imports with advanced features like monorepo detection and LFS support

## Architecture

### Common Interface

All import adapters implement the `ImportAdapter` interface which provides:

- `prepare()`: Validate inputs and check prerequisites
- `validate()`: Validate the source data/URL before processing
- `import()`: Perform the actual import operation
- `reportProgress()`: Report progress during import

### Base Adapter

The `BaseImportAdapter` class provides common functionality:

- Progress reporting with stages
- Telemetry tracking
- Error handling
- Import record management

## Import Types

### Figma Import

Imports design files from Figma with the following features:

**Features:**
- OAuth/token authentication support
- Design token extraction (colors, typography, spacing)
- Component extraction and React code generation
- Image export at 1x/2x resolution
- TypeScript component generation

**Usage:**
```typescript
await figmaImportService.import({
  projectId: 1,
  userId: 1,
  figmaUrl: 'https://www.figma.com/file/ABC123/MyDesign',
  figmaToken: 'fig_token', // Optional for private files
  exportImages: true,
  imageScale: 2,
  componentsOnly: false
});
```

**Generated Files:**
- `/src/theme/figma-tokens.ts` - Design tokens
- `/src/components/figma/ComponentName.tsx` - React components
- `/figma.json` - Import metadata

### Bolt.new Import

Imports projects from Bolt.new or StackBlitz with the following features:

**Features:**
- URL import from Bolt.new/StackBlitz
- ZIP file upload support (planned)
- Framework detection (React, Vue, Svelte, etc.)
- Project structure analysis
- Dependency management

**Usage:**
```typescript
await boltImportService.import({
  projectId: 1,
  userId: 1,
  boltUrl: 'https://bolt.new/my-project',
  // OR
  boltProjectData: { name: 'My Project', framework: 'react', ... }
});
```

**Generated Files:**
- Project files as specified in the Bolt project
- `/package.json` - Enhanced with proper configuration
- `/.env` - Environment variables if specified
- `/bolt.json` - Import metadata

### GitHub Import

Enhanced GitHub repository import with the following features:

**Features:**
- Monorepo detection and subproject selection
- Subdirectory import support
- Git LFS file handling
- Rate limit handling with retries
- Private repository support with tokens

**Usage:**
```typescript
await githubImportService.import({
  projectId: 1,
  userId: 1,
  githubUrl: 'https://github.com/owner/repo',
  token: 'ghp_token', // Optional for private repos
  branch: 'main',
  subdirectory: 'packages/frontend',
  includeHistory: false,
  handleLFS: true
});
```

**Generated Files:**
- All repository files (or subdirectory files)
- `/.github-import.json` - Import metadata with repository info

## Feature Flags

Import features are controlled by feature flags that can be enabled/disabled:

- `flags.import.figma` - Enable/disable Figma import
- `flags.import.bolt` - Enable/disable Bolt.new import  
- `flags.import.githubEnhanced` - Enable/disable enhanced GitHub import

Feature flags are checked on both client and server side.

## API Endpoints

### Import Endpoints

- `POST /api/import/figma` - Import from Figma
- `POST /api/import/bolt` - Import from Bolt.new
- `POST /api/import/github` - Import from GitHub
- `GET /api/import/:id/status` - Get import status
- `GET /api/feature-flags` - Get current feature flags

### Request Examples

**Figma Import:**
```json
{
  "projectId": 1,
  "figmaUrl": "https://www.figma.com/file/ABC123/MyDesign",
  "figmaToken": "fig_...",
  "exportImages": true,
  "imageScale": 2
}
```

**Bolt Import:**
```json
{
  "projectId": 1,
  "boltUrl": "https://bolt.new/my-project"
}
```

**GitHub Import:**
```json
{
  "projectId": 1,
  "githubUrl": "https://github.com/owner/repo",
  "subdirectory": "packages/frontend",
  "handleLFS": true
}
```

## UI Components

### Import Hub

The unified import interface (`/projects/:id/import`) provides:

- Tabbed interface for different import types
- URL auto-detection and routing
- Advanced options per import type
- Real-time progress reporting
- Comprehensive error handling

### Individual Import Pages

Legacy import pages are still available:
- `/projects/:id/import/figma`
- `/projects/:id/import/bolt`
- `/github-import`

## Progress Reporting

All imports provide real-time progress updates through:

1. **Stages**: Each import type defines logical stages
2. **Progress**: Percentage completion (0-100)
3. **Messages**: Human-readable status messages
4. **Timestamps**: When each stage was reached

Example progress stages for Figma import:
- `extracting_file_id` (17%)
- `fetching_figma_data` (33%)
- `processing_components` (50%)
- `exporting_images` (67%)
- `generating_code` (83%)
- `creating_files` (100%)

## Error Handling

Comprehensive error handling includes:

- **Validation Errors**: Invalid URLs, missing tokens, etc.
- **API Errors**: Figma/GitHub API failures
- **Processing Errors**: File processing failures
- **System Errors**: Storage or network issues

All errors are:
- Logged on the server
- Reported to the client with user-friendly messages
- Tracked in telemetry for monitoring

## Telemetry

Import operations are tracked with the following metrics:

- Import type and success/failure
- Duration of import operation
- Number of files, assets, and components created
- Error messages for failed imports
- Additional metadata (framework, repository size, etc.)

## Testing

Basic unit tests are provided for:
- Import adapter interfaces
- URL parsing and validation
- Framework detection
- Progress stage generation
- Error handling

## Troubleshooting

### Common Issues

1. **Figma Import Fails**
   - Check if Figma URL is valid and accessible
   - Verify access token for private files
   - Ensure file has components to extract

2. **Bolt Import Fails**
   - Verify Bolt.new URL is accessible
   - Check project data format if using JSON input
   - Ensure framework is supported

3. **GitHub Import Fails**
   - Check repository URL and accessibility
   - Verify access token for private repositories
   - Ensure subdirectory exists if specified

### Error Codes

- `FEATURE_DISABLED` - Import type is disabled via feature flags
- `IMPORT_FAILED` - General import failure with specific error message
- `VALIDATION_ERROR` - Input validation failed
- `API_ERROR` - External API call failed

## Environment Variables

- `FIGMA_ACCESS_TOKEN` - Default Figma API token
- `GITHUB_TOKEN` - Default GitHub API token
- `FEATURE_FLAG_IMPORT_FIGMA` - Enable Figma import (default: false)
- `FEATURE_FLAG_IMPORT_BOLT` - Enable Bolt import (default: false)
- `FEATURE_FLAG_IMPORT_GITHUB_ENHANCED` - Enable enhanced GitHub import (default: false)