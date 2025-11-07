# 🔔 Push Notifications & Live Activities Implementation Plan

## Executive Summary
**Goal:** Cross-platform notification system for AI agent updates, billing alerts, and collaboration  
**Current Status:** 0% - Not implemented  
**Priority:** LOW - Should be implemented AFTER mobile editor/terminal completion  
**Timeline:** 2-3 weeks implementation  
**Dependencies:** Firebase Cloud Messaging (FCM) setup, Service Worker, FCM token storage in database  
**Last Updated:** November 7, 2025

**PRIORITY NOTE:** Push notifications should be implemented AFTER mobile workspace completion (editor + terminal). Users need a functional mobile IDE before async notifications provide value. Reorder priorities: Mobile Editor → Mobile Terminal → Mobile FAB → Push Notifications.

---

## 🎯 Architecture Overview

### Technology Stack
- **Frontend:** Service Worker API, FCM SDK, Notification API
- **Backend:** Firebase Admin SDK, notification queue system
- **iOS:** APNs via FCM, Dynamic Island (Live Activities)
- **Android:** FCM native support

### Notification Types
1. **AI Agent Updates** - Agent progress, completion, errors
2. **Billing Alerts** - Low credits, payment failed, subscription renewal
3. **Collaboration** - Comments, mentions, file changes by teammates
4. **System** - Deployment status, build failures, security alerts

---

## 📐 Implementation Phases

### **Phase 1: FCM Setup & Service Worker** (Week 1)
**Priority:** CRITICAL - Foundation for all notifications

#### Tasks

1. **Search for FCM Integration**
   ```bash
   # Check if Replit has FCM integration
   search_integrations("firebase cloud messaging")
   search_integrations("push notifications")
   ```

2. **Install Firebase SDK**
   ```bash
   npm install firebase firebase-admin
   ```

3. **Create Firebase Project**
   - Create project in Firebase Console
   - Enable Cloud Messaging
   - Generate service account key (backend)
   - Get Web Push certificate (frontend)
   - Store credentials as Replit secrets

4. **Backend: Firebase Admin Setup**
   ```typescript
   // server/services/push-notifications.ts
   import admin from 'firebase-admin';
   
   // Initialize with service account
   admin.initializeApp({
     credential: admin.credential.cert({
       projectId: process.env.FCM_PROJECT_ID,
       clientEmail: process.env.FCM_CLIENT_EMAIL,
       privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
     }),
   });
   
   export class PushNotificationService {
     async sendNotification(userId: string, notification: Notification) {
       // Get user's FCM tokens from database
       const tokens = await this.getUserTokens(userId);
       
       const message = {
         notification: {
           title: notification.title,
           body: notification.body,
           icon: '/logo.png',
           badge: '/badge.png',
         },
         data: {
           type: notification.type,
           actionUrl: notification.actionUrl,
           timestamp: Date.now().toString(),
         },
         tokens,
       };
       
       const response = await admin.messaging().sendMulticast(message);
       console.log('Sent notifications:', response.successCount);
       
       // Remove invalid tokens
       if (response.failureCount > 0) {
         await this.cleanupInvalidTokens(response);
       }
     }
   }
   ```

5. **Database Schema for FCM Tokens**
   ```typescript
   // shared/schema.ts
   export const fcmTokens = pgTable('fcm_tokens', {
     id: serial('id').primaryKey(),
     userId: varchar('user_id').references(() => users.id),
     token: varchar('token').notNull().unique(),
     deviceType: varchar('device_type'), // 'ios', 'android', 'web'
     deviceName: varchar('device_name'),
     createdAt: timestamp('created_at').defaultNow(),
     lastUsed: timestamp('last_used').defaultNow(),
   });
   ```

6. **Frontend: Service Worker**
   ```typescript
   // public/firebase-messaging-sw.js
   importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
   importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');
   
   firebase.initializeApp({
     apiKey: 'YOUR_API_KEY',
     authDomain: 'YOUR_AUTH_DOMAIN',
     projectId: 'YOUR_PROJECT_ID',
     storageBucket: 'YOUR_STORAGE_BUCKET',
     messagingSenderId: 'YOUR_SENDER_ID',
     appId: 'YOUR_APP_ID',
   });
   
   const messaging = firebase.messaging();
   
   // Background message handler
   messaging.onBackgroundMessage((payload) => {
     console.log('Background message:', payload);
     
     const { title, body, icon } = payload.notification;
     const { type, actionUrl } = payload.data;
     
     return self.registration.showNotification(title, {
       body,
       icon: icon || '/logo.png',
       badge: '/badge.png',
       tag: type, // Prevent duplicate notifications
       data: { actionUrl },
       actions: [
         { action: 'open', title: 'Open' },
         { action: 'dismiss', title: 'Dismiss' },
       ],
     });
   });
   
   // Notification click handler
   self.addEventListener('notificationclick', (event) => {
     event.notification.close();
     
     if (event.action === 'open' || !event.action) {
       const urlToOpen = event.notification.data.actionUrl || '/';
       event.waitUntil(
         clients.openWindow(urlToOpen)
       );
     }
   });
   ```

7. **Frontend: FCM Client Setup**
   ```typescript
   // client/src/services/fcm-client.ts
   import { getMessaging, getToken, onMessage } from 'firebase/messaging';
   import { initializeApp } from 'firebase/app';
   
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
     appId: import.meta.env.VITE_FIREBASE_APP_ID,
   };
   
   const app = initializeApp(firebaseConfig);
   const messaging = getMessaging(app);
   
   export async function requestNotificationPermission() {
     const permission = await Notification.requestPermission();
     if (permission === 'granted') {
       const token = await getToken(messaging, {
         vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
       });
       return token;
     }
     throw new Error('Notification permission denied');
   }
   
   export function onForegroundMessage(callback: (payload: any) => void) {
     return onMessage(messaging, callback);
   }
   ```

8. **API Route: Register FCM Token**
   ```typescript
   // server/routes/notifications.router.ts
   router.post('/api/notifications/register-token', ensureAuthenticated, async (req, res) => {
     const { token, deviceType, deviceName } = req.body;
     const userId = req.user!.id;
     
     await db.insert(fcmTokens).values({
       userId,
       token,
       deviceType,
       deviceName,
     }).onConflictDoUpdate({
       target: fcmTokens.token,
       set: { lastUsed: new Date() },
     });
     
     res.json({ success: true });
   });
   ```

#### Success Criteria
- [ ] Firebase project created and configured
- [ ] Service worker registered and functional
- [ ] FCM tokens stored in database
- [ ] Backend can send test notifications
- [ ] Notifications appear on desktop/mobile

---

### **Phase 2: Notification UI Components** (Week 1-2)
**Priority:** HIGH - User-facing notification system

#### Tasks

1. **Permission Request Modal**
   ```typescript
   // client/src/components/NotificationPermissionModal.tsx
   export function NotificationPermissionModal() {
     const [open, setOpen] = useState(false);
     const { user } = useAuth();
     
     useEffect(() => {
       // Show modal if user hasn't granted permission
       if (user && Notification.permission === 'default') {
         setOpen(true);
       }
     }, [user]);
     
     const handleAllow = async () => {
       try {
         const token = await requestNotificationPermission();
         await apiRequest('/api/notifications/register-token', {
           method: 'POST',
           body: {
             token,
             deviceType: getDeviceType(),
             deviceName: navigator.userAgent,
           },
         });
         toast.success('Notifications enabled!');
         setOpen(false);
       } catch (error) {
         toast.error('Failed to enable notifications');
       }
     };
     
     return (
       <Dialog open={open} onOpenChange={setOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Enable Notifications</DialogTitle>
             <DialogDescription>
               Get real-time updates about your AI agents, builds, and collaborators.
             </DialogDescription>
           </DialogHeader>
           <DialogFooter>
             <Button variant="ghost" onClick={() => setOpen(false)}>
               Maybe Later
             </Button>
             <Button onClick={handleAllow}>
               Enable Notifications
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     );
   }
   ```

2. **In-App Notification Bell**
   ```typescript
   // client/src/components/NotificationBell.tsx
   export function NotificationBell() {
     const [notifications, setNotifications] = useState<Notification[]>([]);
     const [unreadCount, setUnreadCount] = useState(0);
     
     // Listen for foreground messages
     useEffect(() => {
       const unsubscribe = onForegroundMessage((payload) => {
         const notification = {
           id: Date.now(),
           title: payload.notification.title,
           body: payload.notification.body,
           type: payload.data.type,
           actionUrl: payload.data.actionUrl,
           read: false,
         };
         
         setNotifications(prev => [notification, ...prev]);
         setUnreadCount(count => count + 1);
         
         // Show toast
         toast.info(notification.title, {
           description: notification.body,
           action: {
             label: 'View',
             onClick: () => window.location.href = notification.actionUrl,
           },
         });
       });
       
       return unsubscribe;
     }, []);
     
     return (
       <Popover>
         <PopoverTrigger asChild>
           <Button variant="ghost" size="icon" className="relative">
             <Bell className="h-5 w-5" />
             {unreadCount > 0 && (
               <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                 {unreadCount}
               </Badge>
             )}
           </Button>
         </PopoverTrigger>
         <PopoverContent className="w-80">
           <NotificationList 
             notifications={notifications}
             onMarkAsRead={(id) => {/* ... */}}
             onClearAll={() => {/* ... */}}
           />
         </PopoverContent>
       </Popover>
     );
   }
   ```

3. **Notification Preferences**
   ```typescript
   // Settings page - Notification preferences
   <FormField>
     <FormLabel>Agent Notifications</FormLabel>
     <Switch checked={preferences.agentUpdates} onChange={handleToggle} />
     <FormDescription>
       Get notified when AI agents complete tasks or need help
     </FormDescription>
   </FormField>
   
   <FormField>
     <FormLabel>Billing Notifications</FormLabel>
     <Switch checked={preferences.billing} onChange={handleToggle} />
     <FormDescription>
       Alerts for low credits, failed payments, renewals
     </FormDescription>
   </FormField>
   ```

#### Success Criteria
- [ ] Permission modal appears for new users
- [ ] Notification bell shows unread count
- [ ] Foreground notifications show as toasts
- [ ] Notification list displays all notifications
- [ ] Preferences save to database

---

### **Phase 3: AI Agent Integration** (Week 2)
**Priority:** HIGH - Key use case for notifications

#### Tasks

1. **Agent Event Hooks**
   ```typescript
   // server/services/agent-orchestrator.ts
   export class AgentOrchestrator {
     async executeTask(task: AgentTask, userId: string) {
       try {
         // Send start notification
         await notificationService.sendNotification(userId, {
           title: 'AI Agent Started',
           body: `Working on: ${task.description}`,
           type: 'agent_start',
           actionUrl: `/projects/${task.projectId}`,
         });
         
         const result = await this.runAgent(task);
         
         // Send completion notification
         await notificationService.sendNotification(userId, {
           title: 'AI Agent Complete ✅',
           body: `Finished: ${task.description}`,
           type: 'agent_complete',
           actionUrl: `/projects/${task.projectId}`,
           priority: 'high',
         });
         
         return result;
       } catch (error) {
         // Send error notification
         await notificationService.sendNotification(userId, {
           title: 'AI Agent Error ❌',
           body: `Failed: ${error.message}`,
           type: 'agent_error',
           actionUrl: `/projects/${task.projectId}`,
           priority: 'high',
         });
         throw error;
       }
     }
   }
   ```

2. **Progress Updates**
   ```typescript
   // For long-running agent tasks
   await notificationService.sendNotification(userId, {
     title: 'AI Agent Progress',
     body: `${progress}% complete - ${currentStep}`,
     type: 'agent_progress',
     actionUrl: `/projects/${projectId}`,
     data: {
       progress,
       currentStep,
       totalSteps,
     },
   });
   ```

#### Success Criteria
- [ ] Notification sent when agent starts
- [ ] Notification sent when agent completes
- [ ] Error notifications sent on failure
- [ ] Progress updates for long tasks

---

### **Phase 4: iOS Live Activities** (Week 3) - OPTIONAL
**Priority:** LOW - iOS-specific enhancement

#### Tasks

1. **Backend: APNs Setup**
   - Configure APNs authentication
   - Create activity push payloads
   - Send activity updates via FCM

2. **iOS: ActivityKit Integration** (requires native Swift)
   - Create Live Activity widget
   - Update widget with agent progress
   - Dynamic Island integration

3. **Fallback for Web**
   - Show progress in notification bell
   - Update badge count

#### Success Criteria
- [ ] Live Activity appears on iOS lock screen
- [ ] Dynamic Island shows agent progress
- [ ] Activity updates in real-time

---

## 🧪 Testing Strategy

### Manual Testing
1. **Desktop Browser**
   - Request notification permission
   - Trigger agent task
   - Verify notification appears
   - Click notification → navigates to project

2. **Mobile (PWA)**
   - Install as PWA
   - Request permission
   - Receive notification while app closed
   - Tap notification → opens app

3. **Cross-Browser**
   - Chrome, Firefox, Safari (desktop)
   - Chrome, Safari (mobile iOS/Android)

### E2E Tests
```typescript
test.describe('Push Notifications', () => {
  test('Request permission and register token', async ({ page, context }) => {
    // Grant notification permission
    await context.grantPermissions(['notifications']);
    
    await page.goto('/');
    await page.click('[data-testid="enable-notifications"]');
    
    // Verify token registered
    const response = await page.waitForResponse('/api/notifications/register-token');
    expect(response.status()).toBe(200);
  });
  
  test('Receive foreground notification', async ({ page }) => {
    await page.goto('/editor/project-id');
    
    // Trigger agent task (simulates notification)
    await page.click('[data-testid="run-agent"]');
    
    // Verify toast appears
    await expect(page.locator('[data-testid="toast"]')).toContainText('AI Agent Started');
  });
});
```

---

## 🔒 Security Considerations

### Best Practices
1. **Token Security**
   - Store FCM tokens in database with userId
   - Clean up expired tokens regularly
   - Use HTTPS only for token transmission

2. **Notification Content**
   - Don't include sensitive data in notifications
   - Use generic messages, details in app
   - Respect user privacy settings

3. **Rate Limiting**
   - Limit notifications per user per hour
   - Batch similar notifications
   - Allow users to disable specific types

---

## 📊 Analytics & Monitoring

### Metrics to Track
- Notification permission grant rate
- Notification click-through rate
- FCM delivery success rate
- User notification preferences

### Monitoring
```typescript
// Track notification events
analytics.track('Notification Sent', {
  type: notification.type,
  userId,
  success: true,
});

analytics.track('Notification Clicked', {
  type: notification.type,
  userId,
  actionUrl: notification.actionUrl,
});
```

---

## 📚 Technical References

### Firebase Cloud Messaging
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### iOS Live Activities
- [ActivityKit](https://developer.apple.com/documentation/activitykit)
- [Dynamic Island](https://developer.apple.com/design/human-interface-guidelines/live-activities)

---

**Status:** READY FOR IMPLEMENTATION  
**Next Step:** Phase 1 - FCM Setup & Service Worker  
**Dependencies:** Firebase project creation, service account  
**Owner:** Engineering Team  
**Updated:** November 7, 2025
