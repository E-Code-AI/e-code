# 📱 Mobile Workspace Implementation Plan

## Executive Summary
**Goal:** Complete the mobile IDE experience with functional editor, terminal, file tree, and FAB  
**Current Status:** 25% Foundation Complete (routing, navigation, gestures only - core IDE features missing)  
**Priority:** CRITICAL - Blocks mobile IDE functionality and tablet completion  
**Timeline:** 3-4 weeks implementation  
**Last Updated:** November 7, 2025

**CRITICAL NOTE:** Mobile editor and terminal are currently placeholder "Coming soon" screens. Tablet workspace depends on shared mobile components (MobileCodeEditor, MobileTerminal) which are also placeholders. Until mobile core is functional, tablet should be considered incomplete for production use despite layout being ready.

---

## 🎯 Implementation Priorities

### **Phase 1: Mobile Monaco Editor** (Week 1)
**Priority:** CRITICAL - Core functionality blocker

#### Current State
- `MobileIDEView.tsx` shows placeholder "Coming soon" message
- No Monaco editor instance for mobile viewport
- Editor panel structure exists but not wired

#### Implementation Tasks

1. **Create MobileMonacoEditor Component**
   ```typescript
   // client/src/components/mobile/MobileMonacoEditor.tsx
   interface MobileMonacoEditorProps {
     file: FileItem;
     onSave: (content: string) => void;
     readOnly?: boolean;
   }
   
   export function MobileMonacoEditor({ file, onSave, readOnly }: MobileMonacoEditorProps) {
     const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
     const containerRef = useRef<HTMLDivElement>(null);
     
     // Mobile-optimized Monaco configuration
     const editorOptions = {
       fontSize: 14, // Larger for mobile
       lineHeight: 20,
       minimap: { enabled: false }, // Disable minimap on mobile
       scrollbar: {
         vertical: 'auto',
         horizontal: 'auto',
         verticalScrollbarSize: 14, // Larger touch targets
         horizontalScrollbarSize: 14,
       },
       glyphMargin: false, // Save horizontal space
       folding: false, // Simplify mobile UI
       lineNumbers: 'on',
       renderLineHighlight: 'all',
       automaticLayout: true,
       wordWrap: 'on', // Prevent horizontal scroll on mobile
     };
   }
   ```

2. **Mobile Editor Toolbar**
   ```typescript
   // Floating toolbar with essential controls
   <div className="fixed bottom-20 left-0 right-0 bg-surface border-t border-border p-2 safe-area-bottom">
     <div className="flex items-center justify-between">
       <Button variant="ghost" size="sm" onClick={handleUndo}>
         <Undo className="h-5 w-5" />
       </Button>
       <Button variant="ghost" size="sm" onClick={handleRedo}>
         <Redo className="h-5 w-5" />
       </Button>
       <Button variant="ghost" size="sm" onClick={handleFormat}>
         <Code className="h-5 w-5" />
       </Button>
       <Button variant="ghost" size="sm" onClick={handleFind}>
         <Search className="h-5 w-5" />
       </Button>
       <Button variant="default" size="sm" onClick={handleSave}>
         <Save className="h-5 w-5" />
       </Button>
     </div>
   </div>
   ```

3. **Touch Optimization**
   - Disable pinch-to-zoom in editor (CSS)
   - Adjust touch event thresholds for Monaco
   - Haptic feedback on cursor movement
   - Virtual keyboard optimization

4. **Integration with MobileWorkspace**
   ```typescript
   // client/src/pages/MobileWorkspace.tsx
   const renderTabContent = (tabId: string) => {
     switch (tabId) {
       case 'editor':
         return activeFile ? (
           <MobileMonacoEditor 
             file={activeFile}
             onSave={handleFileSave}
           />
         ) : (
           <EmptyEditorState />
         );
     }
   };
   ```

#### Success Criteria
- [ ] Monaco editor loads on mobile (<768px)
- [ ] Touch gestures work (scroll, select, cursor placement)
- [ ] Floating toolbar controls functional
- [ ] Auto-save on blur
- [ ] Syntax highlighting works
- [ ] Keyboard doesn't obscure code (safe-area-inset-bottom)

---

### **Phase 2: Mobile Terminal** (Week 1-2)
**Priority:** CRITICAL - Essential development tool

#### Current State
- `MobileTerminal.tsx` exists but shows placeholder content
- No WebSocket connection to backend terminal
- Shell structure scaffolded only

#### Backend Dependencies to Verify
- [ ] Check if `/api/terminal/ws` WebSocket endpoint exists
- [ ] Verify terminal backend supports mobile connections
- [ ] Confirm authentication requirements for terminal access
- [ ] Test terminal backend with curl/wscat before frontend integration

#### Implementation Tasks

1. **Wire xterm.js for Mobile**
   ```typescript
   // client/src/components/mobile/MobileTerminal.tsx
   import { Terminal } from 'xterm';
   import { FitAddon } from 'xterm-addon-fit';
   import { WebLinksAddon } from 'xterm-addon-web-links';
   
   export function MobileTerminal({ projectId }: { projectId: string }) {
     const terminalRef = useRef<Terminal>();
     const fitAddon = useRef(new FitAddon());
     
     useEffect(() => {
       const terminal = new Terminal({
         fontSize: 14,
         lineHeight: 1.4,
         fontFamily: 'IBM Plex Mono, monospace',
         theme: {
           background: 'var(--ecode-surface)',
           foreground: 'var(--ecode-text)',
         },
         cursorBlink: true,
         cursorStyle: 'block',
         scrollback: 1000,
         rows: 24, // Mobile-optimized height
       });
       
       terminal.loadAddon(fitAddon.current);
       terminal.loadAddon(new WebLinksAddon());
       
       // Connect to backend WebSocket
       const ws = new WebSocket(`${WS_URL}/api/terminal/ws`);
       ws.onmessage = (event) => terminal.write(event.data);
       terminal.onData((data) => ws.send(data));
       
       terminalRef.current = terminal;
     }, [projectId]);
   }
   ```

2. **Mobile Terminal Sheet (Slide-Up Drawer)**
   ```typescript
   // Use existing drawer/sheet component
   <Sheet open={terminalOpen} onOpenChange={setTerminalOpen}>
     <SheetContent side="bottom" className="h-[60vh]">
       <SheetHeader>
         <SheetTitle>Terminal</SheetTitle>
       </SheetHeader>
       <div className="h-full">
         <MobileTerminal projectId={projectId} />
       </div>
     </SheetContent>
   </Sheet>
   ```

3. **Keyboard Accessory for Terminal**
   - Tab button above keyboard
   - Ctrl/Cmd modifier keys
   - Arrow keys for history
   - Clear/Exit buttons

4. **Snap Points**
   - Minimized: 60px (header visible)
   - Half: 50% screen height
   - Full: 90% screen height (safe area)

#### Success Criteria
- [ ] Terminal connects to backend shell
- [ ] Keyboard input works correctly
- [ ] Slide-up gesture smooth (60 FPS)
- [ ] Terminal history persists
- [ ] Safe area insets respected
- [ ] Haptic feedback on snap points

---

### **Phase 3: Touch-Optimized File Tree** (Week 2)
**Priority:** HIGH - Navigation essential

#### Current State
- No mobile-specific file tree implementation
- Desktop `FileExplorer` not touch-optimized
- Tap targets too small (<44px)

#### Implementation Tasks

1. **Create VirtualFileTree for Mobile**
   ```typescript
   // client/src/components/mobile/VirtualFileTree.tsx
   export function VirtualFileTree({ files, onFileSelect }: Props) {
     return (
       <div className="h-full overflow-y-auto">
         {files.map(file => (
           <div
             key={file.id}
             className="flex items-center gap-2 p-3 tap-target-44px border-b border-border"
             onClick={() => onFileSelect(file)}
           >
             <FileIcon type={file.extension} className="h-5 w-5 flex-shrink-0" />
             <span className="text-sm truncate">{file.name}</span>
             {file.isDirectory && <ChevronRight className="ml-auto h-5 w-5" />}
           </div>
         ))}
       </div>
     );
   }
   ```

2. **Gestures for File Actions**
   - Swipe right → Open file
   - Swipe left → Delete file (with confirmation)
   - Long-press → Context menu (rename, delete, copy path)
   - Haptic feedback on all gestures

3. **Collapsible Folders**
   - Tap to expand/collapse
   - Indentation for nested files
   - Breadcrumb at top for deep paths

4. **Search Integration**
   - Fuzzy file search input
   - Filter as you type
   - Recent files shortcut

#### Success Criteria
- [ ] All tap targets ≥44x44px
- [ ] Swipe gestures work smoothly
- [ ] Long-press context menu functional
- [ ] File icons render correctly
- [ ] Search filters files in real-time

---

### **Phase 4: Floating Action Button (FAB)** (Week 2-3)
**Priority:** HIGH - Quick access to Run

#### Implementation Tasks

1. **Create FAB Component**
   ```typescript
   // client/src/components/mobile/MobileFAB.tsx
   export function MobileFAB({ onRun, onShare, onDeploy }: Props) {
     const [expanded, setExpanded] = useState(false);
     
     return (
       <div className="fixed bottom-20 right-4 z-50">
         {expanded && (
           <div className="flex flex-col gap-2 mb-2">
             <Button 
               size="icon" 
               variant="secondary"
               className="h-12 w-12 rounded-full shadow-lg"
               onClick={onShare}
             >
               <Share2 className="h-6 w-6" />
             </Button>
             <Button 
               size="icon" 
               variant="secondary"
               className="h-12 w-12 rounded-full shadow-lg"
               onClick={onDeploy}
             >
               <Rocket className="h-6 w-6" />
             </Button>
           </div>
         )}
         
         <Button
           size="icon"
           className="h-14 w-14 rounded-full bg-accent shadow-lg"
           onClick={expanded ? onRun : () => setExpanded(!expanded)}
         >
           {expanded ? <Play className="h-6 w-6" /> : <MoreVertical className="h-6 w-6" />}
         </Button>
       </div>
     );
   }
   ```

2. **Haptic Feedback**
   - Vibrate on FAB tap
   - Different vibration for expand vs run
   - Use navigator.vibrate() API

3. **Material Design Elevation**
   - Shadow changes based on scroll position
   - Smooth scale animation on press
   - Ripple effect

#### Success Criteria
- [ ] FAB visible on all mobile pages
- [ ] Expand animation smooth
- [ ] Run action triggers project execution
- [ ] Haptic feedback functional
- [ ] Safe area inset respected (bottom-20 + safe-area-bottom)

---

### **Phase 5: Gesture-Based Tab Switching** (Week 3)
**Priority:** MEDIUM - UX enhancement

#### Implementation Tasks

1. **Swipe to Switch Tabs**
   ```typescript
   // Use react-swipeable
   const handlers = useSwipeable({
     onSwipedLeft: () => setActiveTab(getNextTab(activeTab)),
     onSwipedRight: () => setActiveTab(getPrevTab(activeTab)),
     trackMouse: false,
     trackTouch: true,
     delta: 50, // Minimum swipe distance
   });
   
   <div {...handlers} className="h-full">
     {renderTabContent(activeTab)}
   </div>
   ```

2. **Visual Feedback**
   - Bottom tab indicator slides
   - Haptic feedback on tab change
   - Transition animation (slide left/right)

3. **Tab Bar Highlights**
   - Active tab highlighted
   - Badge counts for notifications
   - Smooth transitions

#### Success Criteria
- [ ] Swipe left/right changes tabs
- [ ] Haptic feedback on swipe
- [ ] Tab indicator animates
- [ ] No accidental tab switches

---

## 📊 Progress Tracking

### Milestones
- [ ] **Milestone 1:** Mobile editor functional (Week 1)
- [ ] **Milestone 2:** Terminal + file tree working (Week 2)
- [ ] **Milestone 3:** FAB + gestures complete (Week 3)
- [ ] **Milestone 4:** Polish + performance optimization (Week 4)

### Success Metrics
- [ ] First Contentful Paint <1.5s on 3G
- [ ] Time to Interactive <3s
- [ ] 60 FPS animations
- [ ] Touch targets ≥44x44px
- [ ] Lighthouse mobile score >90

---

## 🧪 Testing Strategy

### Device Testing Matrix
| Device | OS | Screen | Orientation | Priority |
|--------|-----|--------|-------------|----------|
| iPhone 15 Pro | iOS 17 | 1179×2556 | Portrait | P0 |
| iPhone 15 Pro Max | iOS 17 | 1290×2796 | Landscape | P0 |
| Pixel 8 | Android 14 | 1080×2400 | Portrait | P0 |
| Galaxy S23 | Android 14 | 1080×2340 | Both | P1 |

### E2E Tests (Playwright)
```typescript
test.describe('Mobile Workspace', () => {
  test('Mobile editor loads and edits file', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/editor/project-id');
    
    // Wait for mobile workspace
    await expect(page.locator('[data-testid="mobile-bottom-tabs"]')).toBeVisible();
    
    // Switch to editor tab
    await page.click('[data-testid="tab-editor"]');
    
    // Verify Monaco loads
    await expect(page.locator('.monaco-editor')).toBeVisible();
    
    // Type in editor
    await page.click('.monaco-editor');
    await page.keyboard.type('console.log("Hello Mobile");');
    
    // Verify content
    const content = await page.textContent('.monaco-editor');
    expect(content).toContain('Hello Mobile');
  });
  
  test('Terminal connects and executes commands', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/editor/project-id');
    
    // Open terminal
    await page.click('[data-testid="tab-console"]');
    await expect(page.locator('[data-testid="mobile-terminal"]')).toBeVisible();
    
    // Type command
    await page.keyboard.type('echo "test"');
    await page.keyboard.press('Enter');
    
    // Verify output
    await expect(page.locator('[data-testid="mobile-terminal"]')).toContainText('test');
  });
  
  test('FAB triggers run action', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/editor/project-id');
    
    // Click FAB
    await page.click('[data-testid="mobile-fab"]');
    
    // Verify run started
    await expect(page.locator('[data-testid="run-status"]')).toContainText('Running');
  });
});
```

---

## 🚀 Deployment Checklist

### Before Production
- [ ] Test on real devices (not emulators)
- [ ] Verify safe area insets on notched devices
- [ ] Test with virtual keyboard open
- [ ] Verify haptic feedback works
- [ ] Performance audit (Lighthouse mobile >90)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser (Safari, Chrome mobile)

### Launch
- [ ] Enable mobile routes
- [ ] Monitor error rates by device
- [ ] Track performance metrics
- [ ] A/B test FAB vs top toolbar

---

## 📚 Technical References

### Monaco Editor Mobile
- [Monaco ESM Integration](https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md)
- [Touch Events API](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

### Terminal (xterm.js)
- [xterm.js Documentation](https://xtermjs.org/)
- [WebSocket Integration](https://xtermjs.org/docs/guides/using-addons/)

### Gestures
- [react-swipeable](https://github.com/FormidableLabs/react-swipeable)
- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)

---

**Status:** READY FOR IMPLEMENTATION  
**Next Step:** Begin Phase 1 - Mobile Monaco Editor  
**Owner:** Engineering Team  
**Updated:** November 7, 2025
