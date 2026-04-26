export const DESIGN_SYSTEM_PROMPT = `
Use a modern application design system with these non-negotiable rules:

- Use Tailwind CSS with HSL color tokens in :root and .dark.
- Prefer shadcn/ui-style component structure:
  - \`components/ui/button.tsx\`
  - \`components/ui/card.tsx\`
  - \`lib/utils.ts\`
- Use semantic tokens such as \`--background\`, \`--foreground\`, \`--primary\`, \`--muted\`, \`--border\`, \`--ring\`.
- Default to dark-mode support with a visible theme toggle when a user-facing app is generated.
- Use clean spacing, strong typography hierarchy, restrained gradients, and dense but readable layouts.
- Interactive elements must have hover, focus-visible, disabled, loading, and empty states.
- Never generate one-off random inline colors when a reusable token can be used.
- Prefer composable cards, tabs, sections, dialogs, sheets, command menus, and toasts over custom ad-hoc widgets.
- Generated code must be production-grade, accessible, and maintainable.
`;
