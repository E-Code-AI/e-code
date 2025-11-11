# Theme Token Mapping - Fortune 500 Standard

## ✅ IMPLEMENTATION: Tailwind Theme Extension (NOT Custom CSS)

All semantic colors are configured in `tailwind.config.ts` using:
```typescript
status: {
  critical: 'var(--ecode-danger)',  // Red for errors
  success: 'var(--ecode-green)',    // Green for success
  warning: 'var(--ecode-warning)',  // Orange for warnings
  info: 'var(--ecode-info)',        // Blue for info
}
```

This approach supports **ALL Tailwind modifiers**:
- Opacity: `bg-status-critical/10`, `bg-status-warning/20`
- Hover: `hover:bg-status-info`, `hover:text-status-success`
- Gradients: `from-status-critical`, `to-status-success`
- Dark mode: Handled automatically via CSS variables

## Allowed Hardcoded Colors
**ONLY in these files:**
- `client/src/styles/replit-theme.css` (theme definitions)
- `client/tailwind.config.ts` (Tailwind theme extension)
- Third-party configs (Monaco, xterm.js, chart libraries)

## Mandatory Replacement Mapping

### Background Colors
| Hardcoded | Theme Token | Use Case |
|-----------|-------------|----------|
| `bg-white` | `bg-background` | Main surfaces |
| `bg-black` | `bg-background` | Main surfaces (dark mode auto-switches) |
| `bg-gray-50` | `bg-muted` | Secondary surfaces |
| `bg-gray-100` | `bg-muted` | Secondary surfaces |
| `bg-gray-200` | `bg-muted` | Secondary surfaces |
| `bg-[#ffffff]` | `bg-background` | Main surfaces |
| `bg-[#000000]` | `bg-background` | Main surfaces |
| `bg-[#0e1525]` | `bg-background` | Dark backgrounds |
| `bg-[#1e1e1e]` | `bg-background` | Dark backgrounds |
| `bg-[#252525]`, `bg-[#252526]` | `bg-muted` | Muted surfaces |
| `bg-[#1a1f2e]`, `bg-[#2A2D2E]` | `bg-muted` | Muted surfaces |
| `bg-[#3C3C3C]`, `bg-[#3c3c3c]` | `bg-muted` | Muted surfaces |
| `bg-[#f6f6f6]` | `bg-muted` | Light muted |
| `bg-[#F26207]` | `bg-primary` | Brand color |
| `bg-zinc-*` | `bg-background` or `bg-muted` | Grays |
| `bg-slate-*` | `bg-background` or `bg-muted` | Grays |
| `bg-stone-*` | `bg-background` or `bg-muted` | Grays |
| `bg-neutral-*` | `bg-background` or `bg-muted` | Grays |

### Text Colors
| Hardcoded | Theme Token | Use Case |
|-----------|-------------|----------|
| `text-black` | `text-foreground` | Primary text |
| `text-white` | `text-foreground` | Primary text (dark mode auto-switches) |
| `text-gray-900`, `text-gray-800`, `text-gray-700` | `text-foreground` | Primary text |
| `text-gray-600`, `text-gray-500`, `text-gray-400` | `text-muted-foreground` | Secondary text |
| `text-gray-300`, `text-gray-200`, `text-gray-100` | `text-muted-foreground` | Muted text |
| `text-[#000000]` | `text-foreground` | Primary text |
| `text-[#ffffff]` | `text-foreground` | Primary text |
| `text-[#CCCCCC]`, `text-[#cccccc]` | `text-foreground` | Light text |
| `text-[#858585]` | `text-muted-foreground` | Muted text |
| `text-zinc-*` | `text-foreground` or `text-muted-foreground` | Grays |
| `text-slate-*` | `text-foreground` or `text-muted-foreground` | Grays |

### Border Colors
| Hardcoded | Theme Token | Use Case |
|-----------|-------------|----------|
| `border-gray-200`, `border-gray-300` | `border-border` | Standard borders |
| `border-gray-100`, `border-gray-400` | `border-border` | Standard borders |
| `border-[#e1e4e8]`, `border-[#e0e0e0]` | `border-border` | Light borders |
| `border-[#1a1f2e]`, `border-[#2D2D2D]` | `border-border` | Dark borders |
| `border-[#3c3c3c]` | `border-border` | Dark borders |
| `border-zinc-*` | `border-border` | Grays |
| `border-slate-*` | `border-border` | Grays |

### Hover States
| Hardcoded | Theme Token | Use Case |
|-----------|-------------|----------|
| `hover:bg-gray-50`, `hover:bg-gray-100` | `hover:bg-accent` | Interactive elements |
| `hover:bg-[#1a1f2e]`, `hover:bg-[#2A2D2E]` | `hover:bg-accent` | Interactive elements |
| `hover:bg-[#3c3c3c]` | `hover:bg-accent` | Interactive elements |
| `hover:text-gray-200` | `hover:text-foreground` | Text hover states |

## Audit Scripts

### Find all hardcoded hex colors:
```bash
rg -n "#[0-9a-fA-F]{3,6}" client/src --glob '!*.css' --glob '!THEME_TOKEN_MAPPING.md'
```

### Find all Tailwind gray/black/white classes:
```bash
rg -n "(text|bg|border|hover:bg|hover:text)-(black|white|gray|zinc|slate|stone|neutral)-[0-9]+" client/src --glob '*.tsx' --glob '*.ts'
```

### Verify zero violations:
```bash
# Should return 0 or only allowlisted files
rg "#[0-9a-fA-F]{3,6}" client/src --glob '!*.css' --glob '!THEME_TOKEN_MAPPING.md' | wc -l
```

## Exception Handling

### Valid Exceptions (must be documented):
1. **xterm.js theme config** - If can't use CSS vars, document in code
2. **SVG fill colors** - Only if dynamic theming not possible
3. **Third-party library configs** - Only if no token alternative
4. **Animation keyframes** - Only for specific brand effects

### How to Document Exceptions:
```typescript
// THEME_EXCEPTION: xterm.js doesn't support CSS variables
const xtermTheme = { background: '#1e1e1e' };
```

## Testing Checklist

- [ ] Run audit scripts - 0 violations in components
- [ ] Light mode visual check - all IDE panels consistent
- [ ] Dark mode visual check - all IDE panels consistent
- [ ] Toggle light/dark - smooth transition, no flashing
- [ ] Check all tool panels (Console, Terminal, Git, etc.)
- [ ] Verify no `bg-muted0` or other typos
- [ ] CI check passes (if implemented)
