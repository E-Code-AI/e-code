# Responsive Utilities Documentation

This document describes the responsive design system implemented in E-Code, including breakpoints, hooks, utilities, and accessibility guidelines.

## Breakpoint System

Our responsive design follows a mobile-first approach with three main breakpoints aligned with Tailwind CSS:

| Breakpoint | Range | Description | Tailwind Classes |
|------------|-------|-------------|------------------|
| **Mobile** | < 640px | Smartphones and small devices | Default styles, `mobile:` prefix |
| **Tablet** | 640px - 1023px | Tablets and small laptops | `sm:`, `md:`, `tablet:` prefix |
| **Desktop** | ≥ 1024px | Laptops and desktops | `lg:`, `xl:`, `2xl:`, `desktop:` prefix |

### Exact Boundary Values
- **639px**: Last mobile pixel
- **640px**: First tablet pixel  
- **1023px**: Last tablet pixel
- **1024px**: First desktop pixel

## Hooks

### `useBreakpoint()`

The primary hook for responsive logic that returns comprehensive breakpoint information.

```typescript
import { useBreakpoint } from '@/hooks'

function MyComponent() {
  const { width, isMobile, isTablet, isDesktop } = useBreakpoint()
  
  return (
    <div>
      <p>Window width: {width}px</p>
      {isMobile && <MobileLayout />}
      {isTablet && <TabletLayout />}
      {isDesktop && <DesktopLayout />}
    </div>
  )
}
```

**Return Type:**
```typescript
interface BreakpointState {
  width: number      // Current window width
  isMobile: boolean  // true if width < 640px
  isTablet: boolean  // true if 640px ≤ width < 1024px  
  isDesktop: boolean // true if width ≥ 1024px
}
```

### `useIsMobile()` (Backward Compatible)

Simplified hook that returns only mobile detection.

```typescript
import { useIsMobile } from '@/hooks'

function MobileSpecificComponent() {
  const isMobile = useIsMobile()
  
  if (!isMobile) return null
  
  return <MobileOnlyFeature />
}
```

**Note:** This hook uses the new unified breakpoint system but maintains the same API for backward compatibility.

## Responsive Utility Classes

### Spacing Classes

```css
/* Responsive padding */
.px-responsive     /* px-4 sm:px-6 lg:px-8 */
.py-responsive     /* py-4 sm:py-6 lg:py-8 */
.p-responsive      /* p-4 sm:p-6 lg:p-8 */

/* Tablet-specific */
.tablet:px-responsive  /* tablet:px-6 */
.tablet:py-responsive  /* tablet:py-6 */
```

### Typography Classes

```css
.text-responsive-xs    /* text-xs sm:text-sm */
.text-responsive-sm    /* text-sm sm:text-base */
.text-responsive-base  /* text-base sm:text-lg */
.text-responsive-lg    /* text-lg sm:text-xl lg:text-2xl */
.text-responsive-xl    /* text-xl sm:text-2xl lg:text-3xl */
.text-responsive-2xl   /* text-2xl sm:text-3xl lg:text-4xl */
```

### Layout Classes

```css
/* Responsive grids */
.grid-responsive    /* grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 */
.grid-responsive-2  /* grid grid-cols-1 md:grid-cols-2 */
.grid-responsive-3  /* grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 */

/* Visibility utilities */
.mobile-only        /* block sm:hidden */
.desktop-only       /* hidden sm:block */

/* Containers */
.container-responsive  /* container mx-auto px-4 sm:px-6 lg:px-8 */
.max-w-responsive     /* max-w-full sm:max-w-xl ... xl:max-w-6xl */
```

## Recommended Responsive Patterns

### 1. Mobile-First Component Design

```typescript
function ResponsiveCard() {
  const { isMobile, isTablet } = useBreakpoint()
  
  return (
    <div className={cn(
      "rounded-lg border p-4",
      isMobile ? "w-full" : "max-w-md",
      isTablet && "mx-auto"
    )}>
      <h3 className="text-responsive-lg">Card Title</h3>
      <p className="text-responsive-sm">Card content</p>
    </div>
  )
}
```

### 2. Responsive Navigation

```typescript
function Navigation() {
  const { isDesktop } = useBreakpoint()
  
  return (
    <>
      {isDesktop ? <DesktopNav /> : <MobileNav />}
    </>
  )
}
```

### 3. Conditional Rendering vs CSS

**Preferred for small changes:**
```css
.my-component {
  @apply px-4 sm:px-6 lg:px-8;
}
```

**Preferred for major layout differences:**
```typescript
const { isMobile } = useBreakpoint()
return isMobile ? <MobileLayout /> : <DesktopLayout />
```

## Accessibility Guidelines

### Touch Targets

All interactive elements must meet minimum touch target requirements:

```css
/* Ensure minimum 44x44px touch targets */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}
```

**Usage:**
```typescript
<Button className="touch-target">
  Click me
</Button>
```

### Focus Management

All interactive elements must have visible focus states:

```css
/* Applied automatically to buttons and links */
.focus-visible:outline-2 
.focus-visible:outline-primary 
.focus-visible:outline-offset-2
```

### Skip Links

For keyboard navigation, include skip links:

```css
.sr-only-focusable {
  @apply sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50;
}
```

**Usage:**
```typescript
<a href="#main-content" className="sr-only-focusable">
  Skip to content
</a>
```

### ARIA Labels

Mobile navigation elements should include proper ARIA labels:

```typescript
<nav role="navigation" aria-label="Mobile navigation">
  <Button aria-label="Go back to previous page">
    <ChevronLeft aria-hidden="true" />
  </Button>
</nav>
```

### Screen Reader Support

Use `aria-hidden="true"` for decorative icons:

```typescript
<Button aria-label="Home">
  <Home aria-hidden="true" />
</Button>
```

## Dark Mode Support

### CSS Variables

Our design system uses CSS variables that automatically adapt to dark mode:

```css
/* These automatically switch between light/dark values */
background: "hsl(var(--background))"
foreground: "hsl(var(--foreground))"
border: "hsl(var(--border))"
```

### Custom Dark Mode Styles

For components that need specific dark mode adjustments:

```css
.my-component {
  @apply bg-background text-foreground;
}

/* Custom dark mode override if needed */
.dark .my-component {
  /* specific dark mode styles */
}
```

### Contrast Requirements

All text and interactive elements must meet WCAG AA contrast ratios:
- **Normal text**: 4.5:1 minimum
- **Large text** (18pt+): 3:1 minimum
- **Interactive elements**: 3:1 minimum

## Testing Responsive Components

### Manual Testing Checklist

- [ ] **Mobile (< 640px)**: Navigation works, touch targets are adequate
- [ ] **Tablet (640-1023px)**: Layout is stable, no awkward breakpoints
- [ ] **Desktop (≥ 1024px)**: Existing functionality unchanged
- [ ] **Edge cases**: Test exact boundary values (639, 640, 1023, 1024px)
- [ ] **Dark mode**: No contrast regressions
- [ ] **Keyboard navigation**: Skip links and focus states work
- [ ] **Screen readers**: ARIA labels are descriptive

### Unit Testing

```typescript
import { renderHook } from '@testing-library/react'
import { useBreakpoint } from '@/hooks'

test('should detect mobile breakpoint correctly', () => {
  // Mock window.innerWidth = 500
  const { result } = renderHook(() => useBreakpoint())
  expect(result.current.isMobile).toBe(true)
})
```

## Migration Guide

### From Legacy Hooks

**Old:**
```typescript
import { useIsMobile } from '@/hooks/use-mobile'
import { useIsTablet } from '@/hooks/use-media-query'
```

**New:**
```typescript
import { useBreakpoint } from '@/hooks'
// or for backward compatibility:
import { useIsMobile } from '@/hooks'
```

### From Hardcoded Breakpoints

**Old:**
```css
@media (max-width: 768px) {
  /* mobile styles */
}
```

**New:**
```css
@media (max-width: 639px) {
  /* mobile styles */  
}
/* or use Tailwind classes: */
.sm:hidden .lg:block
```

## Performance Considerations

- Use `useBreakpoint()` sparingly in components that re-render frequently
- Prefer CSS responsive utilities over JavaScript when possible
- The hook is optimized with proper cleanup and minimal re-renders
- All utility classes are safelisted in Tailwind config for optimal purging

## Browser Support

- **Modern browsers**: Full support with `window.matchMedia`
- **Legacy browsers**: Graceful degradation to desktop layout
- **SSR**: Safe defaults prevent hydration mismatches