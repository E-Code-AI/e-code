import { Router } from 'express';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('global-themes');

const editorThemes = [
  {
    id: 'dark-pro',
    name: 'Dark Pro',
    description: 'A professional dark theme with high contrast',
    author: 'E-Code Team',
    official: true,
    preview: { bg: '#1e1e1e', fg: '#d4d4d4', accent: '#569cd6' },
    downloads: 125000,
    rating: 4.9
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'Classic Monokai color scheme',
    author: 'E-Code Team',
    official: true,
    preview: { bg: '#272822', fg: '#f8f8f2', accent: '#f92672' },
    downloads: 98000,
    rating: 4.8
  },
  {
    id: 'one-dark',
    name: 'One Dark',
    description: 'Inspired by Atom\'s One Dark theme',
    author: 'Community',
    official: false,
    preview: { bg: '#282c34', fg: '#abb2bf', accent: '#61afef' },
    downloads: 75000,
    rating: 4.7
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    description: 'Light theme inspired by GitHub',
    author: 'E-Code Team',
    official: true,
    preview: { bg: '#ffffff', fg: '#24292e', accent: '#0366d6' },
    downloads: 45000,
    rating: 4.6
  }
];

const uiThemes = [
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Reduce eye strain with a dark interface',
    preview: { bg: '#0d1117', surface: '#161b22', primary: '#238636' }
  },
  {
    id: 'light',
    name: 'Light Mode',
    description: 'Classic light interface',
    preview: { bg: '#ffffff', surface: '#f6f8fa', primary: '#0969da' }
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blue tones for night coding',
    preview: { bg: '#0a192f', surface: '#112240', primary: '#64ffda' }
  }
];

router.get('/', (req, res) => {
  res.json({
    editor: editorThemes,
    ui: uiThemes,
    includes: ['dark-pro', 'one-dark']
  });
});

router.get('/settings', (req, res) => {
  res.json({
    activeEditorTheme: 'dark-pro',
    systemTheme: 'dark',
    customSettings: {
      fontSize: '14px',
      lineHeight: '1.5',
      tabSize: '2',
      wordWrap: 'on'
    }
  });
});

router.get('/installed', (req, res) => {
  res.json(['dark-pro', 'one-dark', 'monokai']);
});

router.put('/settings', (req, res) => {
  logger.info('Theme settings updated', { body: req.body });
  res.json({
    ...req.body,
    updatedAt: new Date().toISOString()
  });
});

router.post('/install', (req, res) => {
  const { themeId } = req.body;
  logger.info('Theme installed', { themeId });
  res.json({ success: true, themeId, installedAt: new Date().toISOString() });
});

router.post('/create', (req, res) => {
  const theme = req.body;
  logger.info('Custom theme created', { theme });
  res.json({ 
    id: `custom-${Date.now()}`,
    ...theme,
    createdAt: new Date().toISOString()
  });
});

router.get('/export', (req, res) => {
  const settings = {
    activeEditorTheme: 'dark-pro',
    systemTheme: 'dark',
    customSettings: {
      fontSize: '14px',
      lineHeight: '1.5',
      tabSize: '2',
      wordWrap: 'on'
    },
    exportedAt: new Date().toISOString()
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=ecode-theme-settings.json');
  res.json(settings);
});

router.post('/import', (req, res) => {
  const { settings } = req.body;
  logger.info('Theme settings imported', { settings });
  res.json({ success: true, importedAt: new Date().toISOString() });
});

export default router;
