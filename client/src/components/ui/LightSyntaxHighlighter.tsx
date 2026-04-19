import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/cjs/styles/hljs';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import java from 'highlight.js/lib/languages/java';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import yaml from 'highlight.js/lib/languages/yaml';

const _registeredLangs = new Set<string>();
function safeRegister(name: string, lang: any) {
  if (_registeredLangs.has(name)) return;
  try {
    SyntaxHighlighter.registerLanguage(name, lang);
    _registeredLangs.add(name);
  } catch {
    _registeredLangs.add(name);
  }
}

safeRegister('javascript', javascript);
safeRegister('js', javascript);
safeRegister('jsx', javascript);
safeRegister('typescript', typescript);
safeRegister('ts', typescript);
safeRegister('tsx', typescript);
safeRegister('python', python);
safeRegister('py', python);
safeRegister('css', css);
safeRegister('json', json);
safeRegister('bash', bash);
safeRegister('sh', bash);
safeRegister('shell', bash);
safeRegister('sql', sql);
safeRegister('html', xml);
safeRegister('xml', xml);
safeRegister('markdown', markdown);
safeRegister('md', markdown);
safeRegister('java', java);
safeRegister('go', go);
safeRegister('golang', go);
safeRegister('rust', rust);
safeRegister('rs', rust);
safeRegister('cpp', cpp);
safeRegister('c++', cpp);
safeRegister('c', cpp);
safeRegister('csharp', csharp);
safeRegister('cs', csharp);
safeRegister('php', php);
safeRegister('ruby', ruby);
safeRegister('rb', ruby);
safeRegister('yaml', yaml);
safeRegister('yml', yaml);

interface LightSyntaxHighlighterProps {
  language: string;
  children: string;
  style?: any;
  customStyle?: React.CSSProperties;
}

export function LightCodeBlock({ 
  language, 
  children, 
  customStyle = { margin: '1em 0', borderRadius: '0.375rem' }
}: LightSyntaxHighlighterProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={vs2015}
      customStyle={customStyle}
    >
      {children}
    </SyntaxHighlighter>
  );
}

export { SyntaxHighlighter as LightSyntaxHighlighter, vs2015 as darkStyle };
