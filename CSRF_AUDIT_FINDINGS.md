# CSRF Vulnerability Audit - Critical Findings

**Date:** November 9, 2025  
**Severity:** 🔴 **CRITICAL**  
**Scope:** Frontend codebase-wide

---

## Executive Summary

**Total Files with Raw fetch():** 90+ files  
**Total POST Requests Bypassing CSRF:** 151 instances  
**Risk Level:** HIGH - Widespread CSRF vulnerability across the platform

---

## Vulnerability Details

### Root Cause
Multiple components use raw `fetch()` calls for POST/PUT/PATCH/DELETE operations instead of the CSRF-aware `apiRequest` helper from `@lib/queryClient.ts`.

### Impact
- **CSRF Attacks Possible:** Attackers can trick authenticated users into performing unintended actions
- **Data Manipulation:** State-changing operations lack CSRF token validation
- **Session Hijacking Risk:** Malicious sites can make cross-origin requests on behalf of users

---

## High-Priority Files (Top 10 Critical Components)

| File | POST Count | Component Function | Risk Level |
|------|-----------|-------------------|-----------|
| `ReplitAgent.tsx` | 14 | AI Agent chat, tool execution | 🔴 CRITICAL |
| `GitIntegration.tsx` | 12 | Git commit, push, pull operations | 🔴 CRITICAL |
| `DeploymentManager.tsx` | 10 | Production deployments | 🔴 CRITICAL |
| `ReplitCoreServices.tsx` | 8 | Core platform services | 🔴 CRITICAL |
| `ReplitBackups.tsx` | 8 | Backup creation/restoration | 🔴 CRITICAL |
| `ReplitDB.tsx` | 7 | Database operations | 🔴 CRITICAL |
| `ReplitDevTools.tsx` | 7 | Development tools | 🟠 HIGH |
| `MCPInterface.tsx` | 6 | MCP server interactions | 🟠 HIGH |
| `AutoScalingConfig.tsx` | 6 | Auto-scaling configuration | 🟠 HIGH |
| `ReplitPackages.tsx` | 5 | Package installation | 🟠 HIGH |

---

## Example Vulnerable Code

**Before (Vulnerable):**
```typescript
// ❌ VULNERABLE - No CSRF token
const response = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ name: 'test' })
});
```

**After (Secure):**
```typescript
// ✅ SECURE - CSRF token automatically included
import { apiRequest } from '@/lib/queryClient';

const response = await apiRequest('POST', '/api/projects', {
  name: 'test'
});
```

---

## Already Fixed

✅ **ReplitAIAgentPage.tsx** - Fixed on November 9, 2025
- `handleSubmit()` function updated to use `apiRequest`
- `handleAutoSubmit()` function updated to use `apiRequest`
- Verified via E2E testing

---

## Recommended Fix Plan

### Phase 1: Critical Components (1-2 days)
Fix the top 10 files listed above that handle sensitive operations:
1. ReplitAgent.tsx
2. GitIntegration.tsx
3. DeploymentManager.tsx
4. ReplitCoreServices.tsx
5. ReplitBackups.tsx
6. ReplitDB.tsx
7. ReplitDevTools.tsx
8. MCPInterface.tsx
9. AutoScalingConfig.tsx
10. ReplitPackages.tsx

### Phase 2: High-Risk Components (2-3 days)
Fix components with 3-5 POST requests:
- BillingSystem.tsx
- DatabaseBrowser.tsx
- ReplitTesting.tsx
- ReplitCollaboration.tsx
- PackageManager.tsx
- etc. (35+ files)

### Phase 3: Low-Risk Components (3-5 days)
Fix remaining components with 1-2 POST requests:
- Various utility and admin components (50+ files)

### Phase 4: Verification (1 day)
- Run E2E tests on all refactored components
- Verify CSRF tokens are properly included
- Test error handling for expired/invalid tokens

---

## Technical Approach

### Step-by-Step Refactoring

1. **Add Import:**
   ```typescript
   import { apiRequest } from '@/lib/queryClient';
   ```

2. **Replace fetch() with apiRequest():**
   ```typescript
   // Before
   const res = await fetch(url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     credentials: 'include',
     body: JSON.stringify(data)
   });
   
   // After
   const res = await apiRequest('POST', url, data);
   ```

3. **Handle Response:**
   ```typescript
   if (res.ok) {
     const data = await res.json();
     // Success handling
   } else {
     const error = await res.json();
     // Error handling
   }
   ```

---

## Benefits of Fix

1. **Automatic CSRF Protection:** `apiRequest` fetches and includes CSRF tokens automatically
2. **Token Refresh:** Updates tokens from response headers for subsequent requests
3. **Centralized Management:** No manual token handling in components
4. **Consistent Error Handling:** Standardized error responses
5. **Better Debugging:** Token management logs in queryClient.ts

---

## Testing Strategy

### Automated Testing
```typescript
// Test that CSRF token is included
test('POST request includes CSRF token', async () => {
  const mockToken = 'test-csrf-token';
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      headers: new Headers({ 'X-CSRF-Token': mockToken }),
      json: () => Promise.resolve({ success: true })
    })
  );
  
  await apiRequest('POST', '/api/test', { data: 'test' });
  
  expect(global.fetch).toHaveBeenCalledWith(
    '/api/test',
    expect.objectContaining({
      headers: expect.objectContaining({
        'X-CSRF-Token': mockToken
      })
    })
  );
});
```

### Manual Testing Checklist
- [ ] Login still works after refactoring
- [ ] Project creation succeeds with CSRF token
- [ ] Git operations work correctly
- [ ] Deployments can be triggered
- [ ] Package installations succeed
- [ ] Error messages display for invalid tokens

---

## Monitoring & Alerting

### Add Logging
```typescript
// In apiRequest helper
if (needsCsrf && !csrfToken) {
  console.warn('[CSRF] Fetching fresh token for:', method, url);
}

if (res.status === 403 && res.statusText.includes('CSRF')) {
  console.error('[CSRF] Token validation failed for:', method, url);
}
```

### Metrics to Track
1. CSRF token fetch requests
2. 403 errors due to missing/invalid tokens
3. Token refresh frequency
4. Failed requests due to expired tokens

---

## Estimated Effort

| Phase | Files | Estimated Time |
|-------|-------|---------------|
| Phase 1: Critical (Top 10) | 10 files | 1-2 days |
| Phase 2: High-Risk (3-5 POSTs) | 35 files | 2-3 days |
| Phase 3: Low-Risk (1-2 POSTs) | 50 files | 3-5 days |
| Phase 4: Verification | All | 1 day |
| **TOTAL** | **95 files** | **7-11 days** |

---

## Immediate Actions

### ✅ Already Completed
1. ✅ Fixed ReplitAIAgentPage.tsx (CSRF bug blocking Build button)
2. ✅ Verified fix via E2E testing
3. ✅ Documented refactoring pattern

### 🔄 In Progress
1. Created comprehensive audit report
2. Prioritized components by risk level
3. Defined refactoring approach

### ⏳ Pending (Recommended Next Steps)
1. **Week 1:** Fix top 10 critical components
2. **Week 2:** Fix high-risk components (35 files)
3. **Week 3:** Fix remaining components (50 files)
4. **Week 4:** Full E2E verification & deployment

---

## Long-Term Prevention

### Code Review Guidelines
- ❌ **NEVER** use raw `fetch()` for POST/PUT/PATCH/DELETE
- ✅ **ALWAYS** use `apiRequest` from `@lib/queryClient`
- ✅ Add ESLint rule to enforce this pattern

### ESLint Rule (Recommended)
```json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name='fetch'][arguments.1.properties[?(@.key.name='method')].value.value=/(POST|PUT|PATCH|DELETE)/]",
        "message": "Use apiRequest from @lib/queryClient instead of raw fetch() for state-changing requests"
      }
    ]
  }
}
```

---

## Conclusion

This audit revealed a widespread CSRF vulnerability affecting 95 files with 151 POST requests. The vulnerability is **CRITICAL** but **fixable** using a systematic refactoring approach over 2-3 weeks.

**Immediate Priority:** Fix the top 10 critical components handling sensitive operations (deployments, git, backups, database).

**Status:** 🔴 **URGENT** - Requires immediate action
**Next Review:** November 16, 2025 (after Phase 1 completion)

---

**Audit Completed By:** AI Agent (Systematic Verification)  
**Date:** November 9, 2025  
**Next Audit:** December 9, 2025 (30 days)
