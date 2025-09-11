# Responsive & Mobile Utilities

This project includes a custom Tailwind utilities layer providing responsive design helpers and mobile-first utility classes.

## Features

### Touch Target Sizing
- `touch-target` - 44px minimum size (WCAG recommended)
- `touch-target-sm` - 40px minimum size
- `touch-target-lg` - 48px minimum size

### Safe Area Padding
- `safe-area` - Automatic padding for notched devices using `env(safe-area-inset-*)`

### Responsive Spacing
- `px-responsive` - Responsive horizontal padding: px-4 md:px-6 lg:px-8
- `py-responsive` - Responsive vertical padding: py-3 md:py-4 lg:py-6
- `p-responsive` - Responsive padding: p-3 md:p-4 lg:p-6
- `px-container` - Container with responsive horizontal padding and max-width

### Responsive Typography
- `text-responsive-xs` - text-xs md:text-sm
- `text-responsive-sm` - text-sm md:text-base
- `text-responsive-base` - text-base md:text-lg
- `text-responsive-lg` - text-lg md:text-xl
- `text-responsive-xl` - text-xl md:text-2xl

### Visibility Helpers
- `show-mobile` - Visible on mobile only (< 768px)
- `show-desktop` - Visible on desktop only (≥ 768px)

### Interactive Elements
- `replit-card-hover` - Smooth hover transition with shadow

## Mobile Breakpoint

The canonical mobile breakpoint is **768px**. Use the `useIsMobile()` hook from `hooks/useIsMobile.ts` instead of creating ad hoc `window.innerWidth` checks.

```typescript
import { useIsMobile } from '@/hooks/useIsMobile';

function MyComponent() {
  const isMobile = useIsMobile(); // Uses 768px breakpoint
  // or with custom breakpoint:
  const isTablet = useIsMobile(1024);
  
  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {/* Your content */}
    </div>
  );
}
```

## Breakpoints

Standard Tailwind breakpoints are configured:

- `sm`: 640px
- `md`: 768px (mobile breakpoint)
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Adding New Dynamic Classes

If you introduce class names built dynamically (e.g., string concatenation), add explicit entries to the `safelist` in `tailwind.config.ts` to prevent purging.

## Migration Notes

### Deprecated Hooks
- `use-mobile.tsx` and `use-media-query.ts` previously both exported `useIsMobile`
- Use the unified `useIsMobile` from `hooks/useIsMobile.ts` instead
- Other hooks like `useIsTablet` and `useIsDesktop` are still available from `use-media-query.ts`

### Example Usage in Components

```tsx
import { useIsMobile } from '@/hooks/useIsMobile';

export function ResponsiveComponent() {
  const isMobile = useIsMobile();
  
  return (
    <div className="px-responsive py-responsive safe-area">
      <h1 className="text-responsive-xl">Title</h1>
      
      {isMobile && (
        <nav className="touch-target">
          {/* Mobile navigation */}
        </nav>
      )}
      
      <button className="touch-target replit-card-hover">
        Click me
      </button>
    </div>
  );
}
```

## Implementation Files

- `client/src/styles/utilities.css` - Custom utility classes
- `client/src/hooks/useIsMobile.ts` - Unified mobile detection hook
- `tailwind.config.ts` - Breakpoints and safelist configuration