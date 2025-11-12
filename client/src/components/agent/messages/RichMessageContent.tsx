/**
 * Rich Message Content - Markdown parsing with Replit-style formatting
 * Supports: Headers, bullets, bold, italic, code, emojis, tables, syntax highlighting
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface RichMessageContentProps {
  content: string;
  className?: string;
}

export function RichMessageContent({ content, className }: RichMessageContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ description: "Code copied to clipboard" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with emoji support
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-[var(--ecode-text)] mt-4 mb-2 flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-[var(--ecode-text)] mt-3 mb-2 flex items-center gap-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-[var(--ecode-text)] mt-2 mb-1 flex items-center gap-2">
              {children}
            </h3>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="text-sm text-[var(--ecode-text)] leading-relaxed my-2">
              {children}
            </p>
          ),
          
          // Lists with styled bullets
          ul: ({ children }) => (
            <ul className="list-none space-y-1 my-2 pl-0">
              {children}
            </ul>
          ),
          li: ({ children }) => (
            <li className="text-sm text-[var(--ecode-text)] flex items-start gap-2">
              <span className="text-violet-500 mt-1">•</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          
          // Ordered lists
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-sm text-[var(--ecode-text)]">
              {children}
            </ol>
          ),
          
          // Bold and italic
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--ecode-text)]">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[var(--ecode-text-secondary)]">
              {children}
            </em>
          ),
          
          // Inline code
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-[var(--ecode-surface)] text-violet-500 font-mono text-xs">
                  {children}
                </code>
              );
            }
            
            // Code block with syntax highlighting
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const codeString = String(children).replace(/\n$/, '');
            const isCopied = copiedCode === codeString;
            
            return (
              <div className="relative group my-3">
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border border-[var(--ecode-border)] rounded-t-lg">
                  {language && (
                    <span className="text-xs font-mono text-gray-400 uppercase">
                      {language}
                    </span>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyCode(codeString)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isCopied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="border border-t-0 border-[var(--ecode-border)] rounded-b-lg overflow-hidden">
                  <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '12px',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      background: '#1e1e1e'
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Menlo, Consolas, "Liberation Mono", monospace'
                      }
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          },
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-violet-500 pl-4 py-2 my-2 bg-violet-50 dark:bg-violet-950/10">
              <div className="text-sm text-[var(--ecode-text-secondary)]">
                {children}
              </div>
            </blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-[var(--ecode-border)] rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--ecode-surface)]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--ecode-text)] border-b border-[var(--ecode-border)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-[var(--ecode-text)] border-b border-[var(--ecode-border)]">
              {children}
            </td>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-500 hover:text-violet-600 underline underline-offset-2"
            >
              {children}
            </a>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-4 border-t border-[var(--ecode-border)]" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
