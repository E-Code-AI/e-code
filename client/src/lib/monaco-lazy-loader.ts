type LanguageId = 'javascript' | 'typescript' | 'html' | 'css' | 'json' | 'python' | 'markdown' | 'sql' | 'yaml' | 'xml' | 'go' | 'rust' | 'java' | 'cpp' | 'csharp' | 'php' | 'ruby' | 'shell';

const loadedLanguages = new Set<string>();

export async function loadMonacoLanguage(language: LanguageId): Promise<void> {
  if (loadedLanguages.has(language)) return;
  
  try {
    switch (language) {
      case 'javascript':
      case 'typescript':
        await import('monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution');
        break;
      case 'html':
        await import('monaco-editor/esm/vs/basic-languages/html/html.contribution');
        break;
      case 'css':
        await import('monaco-editor/esm/vs/basic-languages/css/css.contribution');
        break;
      case 'json':
        await import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution');
        break;
      case 'python':
        await import('monaco-editor/esm/vs/basic-languages/python/python.contribution');
        break;
      case 'markdown':
        await import('monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution');
        break;
      case 'sql':
        await import('monaco-editor/esm/vs/basic-languages/sql/sql.contribution');
        break;
      case 'yaml':
        await import('monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution');
        break;
      case 'xml':
        await import('monaco-editor/esm/vs/basic-languages/xml/xml.contribution');
        break;
      case 'go':
        await import('monaco-editor/esm/vs/basic-languages/go/go.contribution');
        break;
      case 'rust':
        await import('monaco-editor/esm/vs/basic-languages/rust/rust.contribution');
        break;
      case 'java':
        await import('monaco-editor/esm/vs/basic-languages/java/java.contribution');
        break;
      case 'cpp':
        await import('monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution');
        break;
      case 'csharp':
        await import('monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution');
        break;
      case 'php':
        await import('monaco-editor/esm/vs/basic-languages/php/php.contribution');
        break;
      case 'ruby':
        await import('monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution');
        break;
      case 'shell':
        await import('monaco-editor/esm/vs/basic-languages/shell/shell.contribution');
        break;
    }
    loadedLanguages.add(language);
  } catch (error) {
    console.warn(`Failed to load Monaco language: ${language}`, error);
  }
}

export function getLanguageFromExtension(filename: string): LanguageId {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, LanguageId> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'css',
    'less': 'css',
    'json': 'json',
    'py': 'python',
    'md': 'markdown',
    'sql': 'sql',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'cpp',
    'h': 'cpp',
    'hpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
  };
  return languageMap[ext] || 'javascript';
}

export async function preloadEssentialLanguages(): Promise<void> {
  const essentialLanguages: LanguageId[] = ['javascript', 'typescript', 'html', 'css', 'json'];
  await Promise.all(essentialLanguages.map(lang => loadMonacoLanguage(lang)));
}
