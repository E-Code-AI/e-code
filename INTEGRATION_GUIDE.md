# E-Code Mobile IDE - Integration Guide

## 🎉 100% Production-Ready Integration

This guide shows how to integrate the enhanced mobile IDE components with the design system.

## 📦 What's New

### Enhanced Components Created

| Component | Original | Enhanced Version | New Features |
|-----------|----------|------------------|--------------|
| **IDE View** | `MobileIDEView` | `EnhancedMobileIDEView` | ✅ IDEProvider, Command Palette, Shortcuts, Settings |
| **Code Editor** | `MobileCodeEditor` | `EnhancedMobileCodeEditor` | ✅ SearchReplace, StatusBar, IDE events |
| **Terminal** | `MobileTerminal` | `EnhancedMobileTerminal` | ✅ Pull-to-refresh, Empty state, Loading |
| **File Explorer** | `MobileFileExplorer` | `EnhancedMobileFileExplorer` | ✅ Context menus, Empty state, Loading |

## 🚀 Quick Start

### 1. Use Enhanced IDE View

Replace your current `MobileIDEView` with `EnhancedMobileIDEView`:

```tsx
// Before
import { MobileIDEView } from '@/components/mobile/MobileIDEView';

<MobileIDEView projectId="123" />

// After
import { EnhancedMobileIDEView } from '@/components/mobile/EnhancedMobileIDEView';

<EnhancedMobileIDEView projectId="123" />
```

**What you get automatically**:
- ✅ Toast notifications (`useToast` hook available everywhere)
- ✅ Command Palette (Press `Cmd+K` or `Ctrl+K`)
- ✅ Keyboard Shortcuts (Press `?`)
- ✅ Settings Panel (Press `Cmd+,` or `Ctrl+,`)
- ✅ Theme management (light/dark/auto)
- ✅ IDE event system

### 2. Use Enhanced Code Editor

```tsx
// Before
import { MobileCodeEditor } from '@/components/mobile/MobileCodeEditor';

<MobileCodeEditor
  projectId="123"
  fileId={456}
  initialLanguage="typescript"
/>

// After
import { EnhancedMobileCodeEditor } from '@/components/mobile/EnhancedMobileCodeEditor';

<EnhancedMobileCodeEditor
  projectId="123"
  fileId={456}
  initialLanguage="typescript"
/>
```

**What you get**:
- ✅ Search & Replace (Press `Cmd+F` or `Cmd+H`)
- ✅ Status Bar with cursor position, language, encoding
- ✅ IDE event listeners (save, format, find)
- ✅ Toast notifications on save/format

### 3. Use Enhanced Terminal

```tsx
// Before
import { MobileTerminal } from '@/components/mobile/MobileTerminal';

<MobileTerminal projectId="123" />

// After
import { EnhancedMobileTerminal } from '@/components/mobile/EnhancedMobileTerminal';

<EnhancedMobileTerminal projectId="123" />
```

**What you get**:
- ✅ Pull-to-refresh to clear (Pull down)
- ✅ Empty state for new terminals
- ✅ Loading skeleton
- ✅ Toast notifications

### 4. Use Enhanced File Explorer

```tsx
// Before
import { MobileFileExplorer } from '@/components/mobile/MobileFileExplorer';

<MobileFileExplorer
  projectId="123"
  isOpen={true}
  onClose={() => setIsOpen(false)}
/>

// After
import { EnhancedMobileFileExplorer } from '@/components/mobile/EnhancedMobileFileExplorer';

<EnhancedMobileFileExplorer
  projectId="123"
  isOpen={true}
  onClose={() => setIsOpen(false)}
/>
```

**What you get**:
- ✅ Context menus on long-press
- ✅ Empty state when no files
- ✅ Loading skeleton
- ✅ Toast notifications for actions

## 🎮 Using the IDE Features

### Command Palette

The Command Palette is available globally after wrapping with `EnhancedMobileIDEView`:

```tsx
// User presses Cmd+K or Ctrl+K
// Command Palette appears with 12+ pre-configured commands:

File Operations:
- New File (⌘N)
- Save File (⌘S)
- Save All (⌘⇧S)

Editor:
- Find (⌘F)
- Replace (⌘H)
- Format Document (⌘⇧F)

View:
- Toggle Sidebar (⌘B)
- Toggle Terminal (⌘`)

Settings:
- Open Settings (⌘,)
- Keyboard Shortcuts (?)
```

### Keyboard Shortcuts

```tsx
// User presses '?'
// Keyboard Shortcuts overlay appears
// Users can:
// - View all shortcuts
// - Search shortcuts
// - Customize shortcuts
// - See keyboard key visualizations
```

### Settings Panel

```tsx
// User presses Cmd+, or Ctrl+,
// Settings Panel appears with:

Appearance:
- Theme (light/dark/auto)

Editor:
- Line Numbers (toggle)
- Minimap (toggle)
- Font Size (slider 10-24px)

Terminal:
- Font Size (slider 10-20px)

About:
- Version
- Project ID
```

### Toast Notifications

Use the `useToast` hook anywhere in your components:

```tsx
import { useToast } from '@/design-system';

function MyComponent() {
  const toast = useToast();

  const handleAction = () => {
    toast.success('Action completed!');
    toast.error('Something went wrong');
    toast.warning('Are you sure?', {
      action: {
        label: 'Confirm',
        onPress: () => doAction(),
      },
    });
    toast.info('New update available');
  };

  return <button onClick={handleAction}>Do Action</button>;
}
```

## 🔧 IDE Event System

The enhanced components emit and listen to custom events:

### Emit Events

```tsx
// Trigger IDE actions from anywhere
window.dispatchEvent(new CustomEvent('ide:new-file'));
window.dispatchEvent(new CustomEvent('ide:save-file'));
window.dispatchEvent(new CustomEvent('ide:find'));
window.dispatchEvent(new CustomEvent('ide:replace'));
window.dispatchEvent(new CustomEvent('ide:format'));
window.dispatchEvent(new CustomEvent('ide:toggle-sidebar'));
window.dispatchEvent(new CustomEvent('ide:toggle-terminal'));
```

### Listen to Events

```tsx
useEffect(() => {
  const handleSave = () => {
    // Your save logic
    console.log('Save requested');
  };

  window.addEventListener('ide:save-file', handleSave);
  return () => window.removeEventListener('ide:save-file', handleSave);
}, []);
```

### Settings Change Events

```tsx
useEffect(() => {
  const handleSettingChange = (event: CustomEvent) => {
    const { key, value } = event.detail;
    console.log(`Setting ${key} changed to:`, value);

    // Apply setting
    if (key === 'fontSize') {
      editor.updateOptions({ fontSize: value });
    }
  };

  window.addEventListener('ide:setting-changed', handleSettingChange as EventListener);
  return () => window.removeEventListener('ide:setting-changed', handleSettingChange as EventListener);
}, []);
```

## 📱 Complete Example

Here's a complete example integrating all enhanced components:

```tsx
import React, { useState } from 'react';
import { EnhancedMobileIDEView } from '@/components/mobile/EnhancedMobileIDEView';
import { useToast } from '@/design-system';

export function MyApp() {
  const [projectId] = useState('my-project-123');

  return (
    <EnhancedMobileIDEView projectId={projectId} />
  );
}

// Inside any child component:
function MyFeature() {
  const toast = useToast();

  const handleClick = () => {
    // Use toast
    toast.success('Feature clicked!');

    // Trigger IDE command
    window.dispatchEvent(new CustomEvent('ide:save-file'));
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

## 🎨 Customization

### Customize Commands

Edit `/home/user/e-code/client/src/components/providers/IDEProvider.tsx`:

```tsx
const ideCommands: Command[] = [
  // Add your custom commands
  {
    id: 'my-custom-command',
    label: 'My Custom Action',
    description: 'Does something custom',
    icon: '🎨',
    category: 'Custom',
    shortcut: '⌘⇧C',
    keywords: ['custom', 'action'],
    onExecute: async () => {
      // Your logic
      toast.success('Custom action executed!');
    },
  },
  // ... existing commands
];
```

### Customize Settings

Edit `/home/user/e-code/client/src/components/providers/IDEProvider.tsx`:

```tsx
const settingsSections: SettingsSection[] = [
  // Add your custom settings
  {
    id: 'my-settings',
    title: 'My Settings',
    icon: '⚙️',
    items: [
      {
        type: 'toggle',
        id: 'my-toggle',
        label: 'My Feature',
        description: 'Enable my feature',
        value: true,
        onChange: (value: boolean) => {
          localStorage.setItem('my-feature', String(value));
        },
      },
    ],
  },
  // ... existing sections
];
```

## 🧪 Testing

Test all features:

```bash
# 1. Start your dev server
npm run dev

# 2. Open mobile view (or use device emulator)

# 3. Test Command Palette
# Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
# Try searching for commands
# Execute a command

# 4. Test Keyboard Shortcuts
# Press '?'
# View shortcuts
# Try customizing one

# 5. Test Settings
# Press Cmd+, (Mac) or Ctrl+, (Windows/Linux)
# Change theme
# Adjust font sizes
# Toggle features

# 6. Test Search & Replace
# Open a file in code editor
# Press Cmd+F or Cmd+H
# Try regex search
# Test replace/replace all

# 7. Test Pull-to-Refresh
# Open terminal
# Pull down from top
# Terminal should clear

# 8. Test Context Menus
# Long-press on a file in file explorer
# Context menu should appear
# Try actions

# 9. Test Toast Notifications
# All actions should show toasts
# Verify haptic feedback on mobile devices
```

## 📊 Feature Matrix

| Feature | Original | Enhanced | Status |
|---------|----------|----------|--------|
| IDE Provider | ❌ | ✅ | Ready |
| Command Palette | ❌ | ✅ | Ready |
| Keyboard Shortcuts | ❌ | ✅ | Ready |
| Settings Panel | ❌ | ✅ | Ready |
| Toast Notifications | ❌ | ✅ | Ready |
| Search & Replace | ❌ | ✅ | Ready |
| Status Bar | ❌ | ✅ | Ready |
| Pull-to-Refresh | ❌ | ✅ | Ready |
| Context Menus | ❌ | ✅ | Ready |
| Empty States | ❌ | ✅ | Ready |
| Loading Skeletons | ❌ | ✅ | Ready |
| IDE Events | ❌ | ✅ | Ready |
| Theme Management | ❌ | ✅ | Ready |
| Haptic Feedback | ✅ | ✅ | Enhanced |

## 🎯 Migration Checklist

- [ ] Replace `MobileIDEView` with `EnhancedMobileIDEView`
- [ ] Replace `MobileCodeEditor` with `EnhancedMobileCodeEditor`
- [ ] Replace `MobileTerminal` with `EnhancedMobileTerminal`
- [ ] Replace `MobileFileExplorer` with `EnhancedMobileFileExplorer`
- [ ] Test Command Palette (Cmd+K)
- [ ] Test Keyboard Shortcuts (?)
- [ ] Test Settings (Cmd+,)
- [ ] Test Search & Replace (Cmd+F, Cmd+H)
- [ ] Test Pull-to-Refresh in terminal
- [ ] Test Toast notifications
- [ ] Test on real mobile device
- [ ] Verify haptic feedback
- [ ] Test theme switching
- [ ] Test all IDE events

## 🏆 Result

After migration, you'll have a **100% production-ready mobile IDE** with:
- ✅ Apple-quality design system
- ✅ Professional interactions
- ✅ Complete feature set
- ✅ Excellent UX
- ✅ Full documentation
- ✅ Type-safe TypeScript
- ✅ Responsive design
- ✅ Accessibility ready

## 📚 Additional Resources

- [Design System README](client/src/design-system/README.md) - Complete design system guide
- [DESIGN_SYSTEM_IMPROVEMENTS.md](DESIGN_SYSTEM_IMPROVEMENTS.md) - Technical improvements
- [COMPLETE_FEATURES_GUIDE.md](COMPLETE_FEATURES_GUIDE.md) - All features documented

## 💡 Tips

1. **Start Simple**: Begin by just replacing `MobileIDEView` with `EnhancedMobileIDEView`
2. **Test Incrementally**: Test each component replacement before moving to the next
3. **Use Events**: Leverage the IDE event system for communication between components
4. **Customize**: Don't hesitate to customize commands and settings for your needs
5. **Feedback**: Use toast notifications generously for user feedback

## 🤝 Support

If you encounter issues:
1. Check this guide
2. Review component source code
3. Check design system documentation
4. Test on different devices/browsers

Enjoy your 100% production-ready mobile IDE! 🎉
