import type { Meta, StoryObj } from '@storybook/react';
import { colors, radii, shadows, spacing, typography } from './index.js';

function TokensStory() {
  return (
    <div style={{ display: 'grid', gap: 32, color: 'hsl(var(--ecode-fg))', fontFamily: typography.fontSans }}>
      <section>
        <h2>Palette</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, minmax(56px, 1fr))', gap: 8 }}>
          {Object.entries(colors.neutral).map(([step, value]) => (
            <div key={step}>
              <div style={{ height: 48, borderRadius: 8, background: value, border: '1px solid hsl(var(--ecode-border))' }} />
              <small>{step}</small>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Typography</h2>
        {Object.entries(typography.scale).map(([name, [fontSize, lineHeight]]) => (
          <p key={name} style={{ fontSize, lineHeight, margin: '8px 0' }}>{name} - The quick brown fox builds reliable software.</p>
        ))}
      </section>
      <section>
        <h2>Spacing</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          {Object.entries(spacing).map(([name, value]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <code style={{ width: 32 }}>{name}</code>
              <div style={{ width: value, height: 12, background: colors.brand.primary, borderRadius: 4 }} />
              <code>{value}</code>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Radii & Shadows</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {Object.entries(radii).map(([name, value]) => (
            <div key={name} style={{ width: 96, height: 64, borderRadius: value, boxShadow: shadows.md, background: 'hsl(var(--ecode-elevated))', border: '1px solid hsl(var(--ecode-border))', display: 'grid', placeItems: 'center' }}>{name}</div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof TokensStory> = {
  title: 'Tokens/Overview',
  component: TokensStory,
};

export default meta;
export const Overview: StoryObj<typeof TokensStory> = {};
