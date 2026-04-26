export const MODERN_DESIGN_SYSTEM_PROMPT = `
Build latest-generation product UI, not a generic template.

Requirements:
- React + TypeScript + Tailwind.
- Use shadcn/ui-style primitives and Framer Motion for meaningful motion.
- Motion must be purposeful: entrance transitions, layout transitions, hover emphasis, and reduced-motion-safe behavior.
- Prefer HSL token palette and semantic CSS variables.
- The first screen must look like a finished app, not a starter scaffold.
- Include polished empty states, error states, loading states, and responsive behavior.
- Avoid stock “Welcome” copy. Use prompt-derived product naming and product-specific content.
- For dashboard/productivity apps, bias toward cards, sidebars, filters, stats, recent activity, and real controls.
- For consumer apps, bias toward immersive hero, strong onboarding cues, and visually rich cards.
- Keep generated code easy to extend by later agent passes.
`;
