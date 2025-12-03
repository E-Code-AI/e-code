import { lazy, Suspense, ComponentProps } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import markdown from 'react-syntax-highlighter/dist/esm/languages/hljs/markdown';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import csharp from 'react-syntax-highlighter/dist/esm/languages/hljs/csharp';
import php from 'react-syntax-highlighter/dist/esm/languages/hljs/php';
import ruby from 'react-syntax-highlighter/dist/esm/languages/hljs/ruby';
import yaml from 'react-syntax-highlighter/dist/esm/languages/hljs/yaml';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('js', js);
SyntaxHighlighter.registerLanguage('jsx', js);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('tsx', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('py', python);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('sh', bash);
SyntaxHighlighter.registerLanguage('shell', bash);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('html', xml);
SyntaxHighlighter.registerLanguage('xml', xml);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('md', markdown);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('golang', go);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('rs', rust);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('c++', cpp);
SyntaxHighlighter.registerLanguage('c', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('cs', csharp);
SyntaxHighlighter.registerLanguage('php', php);
SyntaxHighlighter.registerLanguage('ruby', ruby);
SyntaxHighlighter.registerLanguage('rb', ruby);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.registerLanguage('yml', yaml);

interface LightSyntaxHighlighterProps {
  language: string;
  children: string;
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
