import type { LanguageSupport } from '@codemirror/language';

type LanguageLoader = () => Promise<LanguageSupport>;

const languageCache = new Map<string, LanguageSupport>();

const languageLoaders: Record<string, LanguageLoader> = {
  javascript: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript();
  },
  jsx: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: true });
  },
  typescript: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ typescript: true });
  },
  tsx: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: true, typescript: true });
  },
  python: async () => {
    const { python } = await import('@codemirror/lang-python');
    return python();
  },
  json: async () => {
    const { json } = await import('@codemirror/lang-json');
    return json();
  },
  html: async () => {
    const { html } = await import('@codemirror/lang-html');
    return html();
  },
  css: async () => {
    const { css } = await import('@codemirror/lang-css');
    return css();
  },
  scss: async () => {
    const { css } = await import('@codemirror/lang-css');
    return css();
  },
  sass: async () => {
    const { css } = await import('@codemirror/lang-css');
    return css();
  },
  less: async () => {
    const { css } = await import('@codemirror/lang-css');
    return css();
  },
  markdown: async () => {
    const { markdown } = await import('@codemirror/lang-markdown');
    return markdown();
  },
  sql: async () => {
    const { sql } = await import('@codemirror/lang-sql');
    return sql();
  },
  rust: async () => {
    const { rust } = await import('@codemirror/lang-rust');
    return rust();
  },
  java: async () => {
    const { java } = await import('@codemirror/lang-java');
    return java();
  },
  cpp: async () => {
    const { cpp } = await import('@codemirror/lang-cpp');
    return cpp();
  },
  c: async () => {
    const { cpp } = await import('@codemirror/lang-cpp');
    return cpp();
  },
  php: async () => {
    const { php } = await import('@codemirror/lang-php');
    return php();
  },
  xml: async () => {
    const { xml } = await import('@codemirror/lang-xml');
    return xml();
  },
  yaml: async () => {
    const { yaml } = await import('@codemirror/lang-yaml');
    return yaml();
  },
  yml: async () => {
    const { yaml } = await import('@codemirror/lang-yaml');
    return yaml();
  },
  shell: async () => {
    const { StreamLanguage } = await import('@codemirror/language');
    const { shell } = await import('@codemirror/legacy-modes/mode/shell');
    return new (await import('@codemirror/language')).LanguageSupport(
      StreamLanguage.define(shell)
    );
  },
  bash: async () => {
    const { StreamLanguage, LanguageSupport } = await import('@codemirror/language');
    const { shell } = await import('@codemirror/legacy-modes/mode/shell');
    return new LanguageSupport(StreamLanguage.define(shell));
  },
  sh: async () => {
    const { StreamLanguage, LanguageSupport } = await import('@codemirror/language');
    const { shell } = await import('@codemirror/legacy-modes/mode/shell');
    return new LanguageSupport(StreamLanguage.define(shell));
  },
};

const extensionToLanguage: Record<string, string> = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.pyw': 'python',
  '.pyi': 'python',
  '.json': 'json',
  '.jsonc': 'json',
  '.json5': 'json',
  '.html': 'html',
  '.htm': 'html',
  '.xhtml': 'html',
  '.vue': 'html',
  '.svelte': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdx': 'markdown',
  '.sql': 'sql',
  '.rs': 'rust',
  '.java': 'java',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.hxx': 'cpp',
  '.h': 'c',
  '.c': 'c',
  '.php': 'php',
  '.phtml': 'php',
  '.php3': 'php',
  '.php4': 'php',
  '.php5': 'php',
  '.php7': 'php',
  '.phps': 'php',
  '.xml': 'xml',
  '.xsl': 'xml',
  '.xslt': 'xml',
  '.svg': 'xml',
  '.wsdl': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'shell',
  '.bash': 'bash',
  '.zsh': 'shell',
  '.fish': 'shell',
  '.ksh': 'shell',
  '.bashrc': 'bash',
  '.zshrc': 'shell',
  '.profile': 'shell',
};

const filenameToLanguage: Record<string, string> = {
  Dockerfile: 'shell',
  Makefile: 'shell',
  '.bashrc': 'bash',
  '.bash_profile': 'bash',
  '.zshrc': 'shell',
  '.profile': 'shell',
  '.gitignore': 'shell',
  '.env': 'shell',
  '.env.local': 'shell',
  '.env.development': 'shell',
  '.env.production': 'shell',
  'package.json': 'json',
  'tsconfig.json': 'json',
  'jsconfig.json': 'json',
};

export async function loadLanguage(language: string): Promise<LanguageSupport | null> {
  const normalizedLanguage = language.toLowerCase().trim();

  if (languageCache.has(normalizedLanguage)) {
    return languageCache.get(normalizedLanguage)!;
  }

  const loader = languageLoaders[normalizedLanguage];
  if (!loader) {
    console.warn(`Language "${language}" is not supported`);
    return null;
  }

  try {
    const languageSupport = await loader();
    languageCache.set(normalizedLanguage, languageSupport);
    return languageSupport;
  } catch (error) {
    console.error(`Failed to load language "${language}":`, error);
    return null;
  }
}

export function getLanguageFromFilename(filename: string): string | null {
  const basename = filename.split('/').pop() || filename;

  if (filenameToLanguage[basename]) {
    return filenameToLanguage[basename];
  }

  const lastDotIndex = basename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return null;
  }

  const extension = basename.slice(lastDotIndex).toLowerCase();
  return extensionToLanguage[extension] || null;
}

export async function loadLanguageForFile(filename: string): Promise<LanguageSupport | null> {
  const language = getLanguageFromFilename(filename);
  if (!language) {
    return null;
  }
  return loadLanguage(language);
}

export function getSupportedLanguages(): string[] {
  return Object.keys(languageLoaders);
}

export function getSupportedExtensions(): string[] {
  return Object.keys(extensionToLanguage);
}

export function isLanguageSupported(language: string): boolean {
  return language.toLowerCase() in languageLoaders;
}

export function isExtensionSupported(extension: string): boolean {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return ext.toLowerCase() in extensionToLanguage;
}

export function clearLanguageCache(): void {
  languageCache.clear();
}

export function preloadLanguages(languages: string[]): Promise<(LanguageSupport | null)[]> {
  return Promise.all(languages.map((lang) => loadLanguage(lang)));
}

export function preloadCommonLanguages(): Promise<(LanguageSupport | null)[]> {
  const commonLanguages = ['javascript', 'typescript', 'html', 'css', 'json', 'markdown'];
  return preloadLanguages(commonLanguages);
}
