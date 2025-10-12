# AI UX Features Documentation

This document describes the new AI UX features that enhance the user experience when working with AI agents.

## Features Overview

### 1. Improve Prompt Button
**Feature Flag:** `aiUx.improvePrompt`

- **Description**: AI-powered prompt refinement that analyzes and improves user prompts for better results
- **Location**: Input area of the AI agent chat
- **Usage**: Type a prompt, then click "Improve Prompt" to enhance it
- **API Endpoint**: `POST /api/ai/improve-prompt`

### 2. Extended Thinking Toggle
**Feature Flag:** `aiUx.extendedThinking`

- **Description**: Enables deeper reasoning and analysis by the AI agent
- **Location**: Toolbar above chat interface
- **Behavior**: When enabled, AI performs more thorough analysis before responding
- **Persistence**: User preference saved to database

### 3. High Power Mode Toggle
**Feature Flag:** `aiUx.highPowerMode`

- **Location**: Toolbar above chat interface
- **Description**: Increases model reasoning depth, max tokens, and tool limits
- **Behavior**: Enables more intensive AI processing for complex tasks
- **Persistence**: User preference saved to database

### 4. Progress Tab
**Feature Flag:** `aiUx.progressTab`

- **Description**: Real-time activity timeline showing agent steps and file interactions
- **Location**: Tab next to "Chat" in the AI interface
- **Features**:
  - Step-by-step progress tracking
  - File navigation (click file names to open)
  - Timestamp for each action
  - Color-coded status indicators

### 5. Pause/Resume Functionality
**Feature Flag:** `aiUx.pauseResume`

- **Description**: Ability to pause and resume AI agent execution
- **Location**: Appears when agent is working
- **Behavior**: Preserves context during pause/resume cycle
- **API Endpoints**: 
  - `POST /api/agent/task/:taskId/pause`
  - `POST /api/agent/task/:taskId/resume`

## Configuration

### Environment Variables

Set these environment variables to enable features:

```bash
FEATURE_AI_UX_IMPROVE_PROMPT=true
FEATURE_AI_UX_EXTENDED_THINKING=true  
FEATURE_AI_UX_HIGH_POWER_MODE=true
FEATURE_AI_UX_PROGRESS_TAB=true
FEATURE_AI_UX_PAUSE_RESUME=true
```

### Default State
All features are **disabled by default** for gradual rollout.

## API Endpoints

### Feature Flags
- `GET /api/feature-flags` - Get current feature flag states

### User Preferences  
- `GET /api/user/ai-preferences` - Get user AI preferences
- `PUT /api/user/ai-preferences` - Update user AI preferences

### AI Functions
- `POST /api/ai/improve-prompt` - Improve a user prompt
- `POST /api/agent/task/:taskId/pause` - Pause agent task
- `POST /api/agent/task/:taskId/resume` - Resume agent task

## Database Schema

The `dynamic_intelligence` table has been extended with:

```sql
-- AI UX Feature preferences  
improve_prompt_enabled BOOLEAN DEFAULT false,
progress_tab_enabled BOOLEAN DEFAULT false,
pause_resume_enabled BOOLEAN DEFAULT false,
auto_checkpoints BOOLEAN DEFAULT true
```

## Telemetry

All features include comprehensive telemetry tracking:

### Events Tracked
- `feature_usage` - When a feature is used
- `feature_toggle` - When a feature is enabled/disabled  
- `feature_success` - Successful feature completion
- `feature_error` - Feature errors

### Metrics Collected
- Usage frequency
- Latency measurements
- Error rates
- User adoption rates

## Testing

Run the test suite:

```bash
npm test test/ai-ux-features.test.ts
```

## User Guide

### Getting Started
1. Enable desired features via environment variables
2. Restart the application
3. Navigate to any project with AI agent
4. Features will appear in the interface based on enabled flags

### Best Practices
- **Extended Thinking**: Use for complex problem-solving tasks
- **High Power Mode**: Enable for intensive coding tasks
- **Progress Tab**: Monitor during long-running operations
- **Pause/Resume**: Use when needing to interrupt long tasks

## Troubleshooting

### Features Not Visible
- Check feature flags are enabled
- Verify user has appropriate permissions
- Check browser console for errors

### Performance Issues
- Disable High Power Mode for simple tasks
- Monitor telemetry for bottlenecks
- Check server resources during intensive operations

## Migration Notes

### Existing Users
- All preferences default to previous behavior
- No existing functionality is changed
- Features are additive, not replacement

### Database Migration
The schema changes are backwards compatible and use default values for existing users.