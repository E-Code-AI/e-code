# Mobile Symbol Navigation - Manual Testing Guide

## Prerequisites
- Application running at http://localhost:5000 or Replit URL
- Mobile device or browser DevTools mobile emulation
- Test account: testuser@test.com / testpass123

## Test Scenarios

### Test 1: Multi-Symbol TypeScript File

**Objective:** Verify symbol list displays all symbols with correct icons

**Steps:**
1. Log in to E-Code platform
2. Create or open a project
3. Create new file: `test-symbols.ts`
4. Add this code:
```typescript
class UserManager {
  private users: string[] = [];
  
  addUser(name: string) {
    this.users.push(name);
  }
  
  getUsers() {
    return this.users;
  }
}

function main() {
  const manager = new UserManager();
  manager.addUser("Alice");
}
```
5. Open Mobile Code Actions panel (FAB or toolbar)
6. Click "Symbol Navigation" or "Symbols"

**Expected Results:**
- ✅ Symbol list shows 4+ symbols:
  - UserManager (Class - Box icon)
  - addUser (Method - Function icon)
  - getUsers (Method - Function icon)
  - main (Function - Function icon)
- ✅ Each symbol shows:
  - Colored icon badge (orange accent)
  - Symbol name
  - Line number ("Line 1", "Line 4", etc.)
  - Chevron arrow
- ✅ Layout is clean and Apple-quality

**Test Actions:**
7. Click "UserManager" symbol
8. Verify editor scrolls to line 1 and highlights the class

9. Click "addUser" symbol
10. Verify editor navigates to the method definition

**Pass Criteria:**
- All symbols display correctly ✅
- Icons match symbol types ✅
- Navigation works without errors ✅
- No console errors ✅

---

### Test 2: Root-Only Symbol (Minimal File)

**Objective:** Verify single-symbol files populate the panel

**Steps:**
1. Create new file: `minimal.ts`
2. Add this code:
```typescript
function hello() {
  console.log("Hello World");
}
```
3. Open symbol navigation panel

**Expected Results:**
- ✅ Symbol list shows "hello" function
- ✅ Function icon (not Box or CircleDot)
- ✅ Line number "Line 1"
- ✅ NO "No symbols found" empty state

**Test Actions:**
4. Click "hello" symbol
5. Verify editor navigates to line 1

**Pass Criteria:**
- Root symbol displays ✅
- No Monaco Range errors in console ✅
- Navigation works ✅

---

### Test 3: Cross-Language Support (Python)

**Objective:** Verify non-TypeScript files show symbols or graceful fallback

**Steps:**
1. Create new file: `test.py`
2. Add this code:
```python
def greet(name):
    print(f"Hello {name}")

class Calculator:
    def add(self, a, b):
        return a + b
```
3. Open symbol navigation panel

**Expected Results (Either):**
- ✅ **Option A:** Symbols display (if DocumentSymbolProvider supports Python)
  - greet function
  - Calculator class
  - add method
- ✅ **Option B:** Graceful empty state
  - "No symbols found" message
  - Explanation that symbol navigation works best for TypeScript/JavaScript

**Pass Criteria:**
- No JavaScript crashes ✅
- Either symbols display OR graceful empty state ✅
- No console errors ✅

---

### Test 4: Icon Rendering Verification

**Objective:** Verify all 26 symbol icon types render correctly

**Steps:**
1. Create file with diverse symbol types:
```typescript
// Module/Namespace
namespace App {
  // Interface
  interface User {
    id: number;
    name: string;
  }
  
  // Enum
  enum Status {
    Active,
    Inactive
  }
  
  // Class
  class UserService {
    // Property
    private cache: Map<number, User> = new Map();
    
    // Constructor
    constructor() {}
    
    // Method
    getUser(id: number): User | undefined {
      return this.cache.get(id);
    }
  }
  
  // Function
  function createUser(name: string): User {
    return { id: 1, name };
  }
  
  // Variable
  const API_KEY = "test";
}
```
2. Open symbol navigation panel

**Expected Icon Mapping:**
- namespace App → Layers icon
- interface User → Type icon
- enum Status → Hash icon
- class UserService → Box icon
- property cache → CircleDot icon
- constructor → Settings icon
- method getUser → Function icon
- function createUser → Function icon
- const API_KEY → Variable icon

**Pass Criteria:**
- All icons render (no broken images) ✅
- Icons match symbol types ✅
- Icons have orange accent color ✅

---

### Test 5: Navigation Edge Cases

**Objective:** Verify no crashes from zero-based line numbers

**Steps:**
1. Create file with code at very top:
```typescript
const x = 1;
```
2. Open symbol navigation
3. Click symbol "x"
4. Open browser DevTools console

**Expected Results:**
- ✅ No errors about "line 0" or "invalid range"
- ✅ No Monaco Range validation errors
- ✅ Cursor navigates to line 1 correctly

**Pass Criteria:**
- Console is clean ✅
- Navigation works ✅

---

## Bug Reporting Template

If you find issues, report using this format:

```
**Test:** [Test name]
**Step:** [Which step failed]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Console Errors:** [Copy any errors]
**Screenshots:** [Attach if visual issue]
```

## Success Criteria Summary

For 100% production readiness:
- ✅ All 5 tests pass
- ✅ No console errors
- ✅ Icons render correctly
- ✅ Navigation works smoothly
- ✅ Mobile UX is Apple-quality

## Developer Notes

**Code Locations:**
- Component: `client/src/components/mobile/MobileCodeActions.tsx`
- Type Mapping: `client/src/lib/ts-kind-map.ts`
- Icon Helper: `getSymbolIcon()` function (26 icons)
- Range Validation: `createValidRange()` helper (1-based clamping)

**Architecture:**
1. DocumentSymbolProviderRegistry (primary - all languages)
2. TypeScript Worker fallback (TS/JS/TSX/JSX only)
3. Kind mapping (134 TypeScript kinds → Monaco SymbolKind)
4. Icon rendering (26 SymbolKind → Lucide icons)
5. Range validation (prevents zero-based crashes)
