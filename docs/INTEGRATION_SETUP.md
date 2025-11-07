# E-Code Platform - Integration Setup Guide

This guide explains how to configure external service integrations for production deployment.

## Mobile Push Notifications (Firebase Cloud Messaging)

### Overview
The platform uses Firebase Cloud Messaging (FCM) to send push notifications to mobile devices (Android & iOS).

### Setup Instructions

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable Cloud Messaging API

2. **Generate Service Account Key**
   - Navigate to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file (keep it secure!)

3. **Configure Environment Variable**
   Add the following to your Replit Secrets or `.env` file:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project",...}'
   ```
   
   The value should be the entire JSON content from the downloaded file, as a single-line string.

4. **Mobile App Configuration**
   - Android: Add `google-services.json` to your Android app
   - iOS: Add `GoogleService-Info.plist` to your iOS app
   - Configure FCM in your mobile app to receive tokens

### Testing
```bash
# Check if FCM is initialized
curl http://localhost:5000/api/mobile/test-notification \
  -H "Content-Type: application/json" \
  -d '{"userId": 1, "title": "Test", "body": "Hello from E-Code!"}'
```

### Features
- ✅ Send to individual devices
- ✅ Send to multiple devices (multicast)
- ✅ Topic-based messaging
- ✅ Rich notifications with images
- ✅ Data payloads
- ✅ Android & iOS support

---

## Video Conferencing (Zoom Integration)

### Overview
The platform uses Zoom to create video meetings for mentorship sessions and collaboration.

### Setup Instructions

#### Option 1: Server-to-Server OAuth (Recommended)

1. **Create Zoom App**
   - Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
   - Click "Develop" → "Build App"
   - Choose "Server-to-Server OAuth"
   - Fill in app details

2. **Get Credentials**
   - Copy Account ID
   - Copy Client ID
   - Copy Client Secret

3. **Configure Environment Variables**
   ```bash
   ZOOM_ACCOUNT_ID=your_account_id
   ZOOM_CLIENT_ID=your_client_id
   ZOOM_CLIENT_SECRET=your_client_secret
   ```

4. **Add Scopes**
   Required scopes:
   - `meeting:write:admin` - Create meetings
   - `meeting:read:admin` - Read meeting details
   - `meeting:delete:admin` - Delete meetings

#### Option 2: JWT (Legacy - Being Deprecated)

1. **Create JWT App**
   - Go to Zoom App Marketplace
   - Create JWT app
   - Copy API Key and API Secret

2. **Configure Environment Variables**
   ```bash
   ZOOM_API_KEY=your_api_key
   ZOOM_API_SECRET=your_api_secret
   ```

### Testing
```bash
# Test Zoom integration
curl http://localhost:5000/api/mentorship/test-meeting \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Meeting",
    "start_time": "2025-11-10T15:00:00Z",
    "duration": 30
  }'
```

### Features
- ✅ Automatic meeting creation
- ✅ Scheduled meetings with waiting room
- ✅ Join URLs for participants
- ✅ Start URLs for hosts
- ✅ Password protection
- ✅ Recording options
- ✅ Meeting deletion

---

## Production Checklist

### Before Going Live

- [ ] **Firebase/FCM**
  - [ ] Service account JSON configured
  - [ ] Mobile apps have Firebase SDK integrated
  - [ ] Test notifications on real devices
  - [ ] Configure notification icons and sounds

- [ ] **Zoom**
  - [ ] OAuth credentials configured
  - [ ] Required scopes approved
  - [ ] Test meeting creation
  - [ ] Verify join/start URLs work

- [ ] **Security**
  - [ ] All secrets stored in Replit Secrets (not .env file)
  - [ ] Service account keys rotated regularly
  - [ ] API rate limits configured
  - [ ] Error handling tested

- [ ] **Monitoring**
  - [ ] Log aggregation configured
  - [ ] Error tracking enabled
  - [ ] Usage metrics monitored

---

## Troubleshooting

### Push Notifications Not Working

**Problem**: Notifications not received on devices
- Check: Is `FIREBASE_SERVICE_ACCOUNT_JSON` set correctly?
- Check: Does mobile app have valid FCM token?
- Check: Are Firebase credentials valid and not expired?
- Check: Logs for `[FCMService]` errors

**Solution**:
```bash
# View FCM service logs
grep "FCMService" /tmp/logs/*.log
```

### Zoom Meetings Not Creating

**Problem**: Meeting URLs are placeholder links
- Check: Are Zoom credentials configured?
- Check: Do credentials have required scopes?
- Check: Is Zoom API accessible from your deployment?

**Solution**:
```bash
# Test Zoom authentication
curl https://api.zoom.us/v2/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Service Account JSON Parsing Error

**Problem**: `SyntaxError: Unexpected token` when parsing JSON
- Ensure JSON is properly escaped
- Use single quotes around the entire JSON string
- Verify no newlines in the middle of the string

**Solution**:
```bash
# Minify JSON first
cat service-account.json | jq -c . | pbcopy
# Then paste into Replit Secrets
```

---

## Fallback Behavior

If integrations are not configured:

### Push Notifications
- Notifications are logged to console
- Warning message displayed: "FCM service not initialized"
- No actual notifications sent
- API endpoints still return success (for compatibility)

### Zoom Meetings
- Returns placeholder URL: `https://meet.ecode.com/session/{sessionId}`
- Warning message displayed: "Zoom service not initialized"
- Meetings can still be tracked in database
- Users must use alternative meeting solution

---

## Alternative Services

### Instead of FCM
- **OneSignal**: Multi-platform push notifications
- **Pusher Beams**: Real-time push notifications
- **AWS SNS**: Amazon Simple Notification Service

### Instead of Zoom
- **Google Meet**: Requires Google Workspace
- **Microsoft Teams**: Enterprise collaboration
- **Jitsi**: Open-source video conferencing
- **Daily.co**: Embedded video calls

---

## Support

For integration issues:
- Check service logs: `/tmp/logs/*.log`
- Review console warnings
- Verify environment variables are set
- Test with example payloads above

Service implementation files:
- FCM: `server/integrations/fcm-service.ts`
- Zoom: `server/integrations/zoom-service.ts`
- Mobile App: `server/services/mobile-app-service.ts`
- Mentorship: `server/api/mentorship-service.ts`
