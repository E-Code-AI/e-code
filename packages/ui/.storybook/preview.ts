import type { Preview } from '@storybook/react';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    a11y: {
      element: '#storybook-root',
      config: {},
      options: {},
    },
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: 'hsl(var(--ecode-bg))' },
        { name: 'elevated', value: 'hsl(var(--ecode-elevated))' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'E-code theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'black', title: 'True Black' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme;
      return Story();
    },
  ],
};

export default preview;
