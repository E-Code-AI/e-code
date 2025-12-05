import React, { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export type MessageRole = "user" | "assistant" | "system";

export interface Citation {
  id: string;
  title?: string;
  snippet?: string;
  url?: string;
  source?: string;
  score?: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt?: string | number | Date;
  citations?: Citation[];
  isStreaming?: boolean;
  error?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  onCitationClick?: (citation: Citation, message: Message) => void;
  className?: string;
}

const formatTimestamp = (value?: string | number | Date): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  onCitationClick,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isUserNearBottomRef = useRef<boolean>(true);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const threshold = 80;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isUserNearBottomRef.current = distanceToBottom < threshold;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!bottomRef.current || !containerRef.current) return;
    if (!isUserNearBottomRef.current && !isStreaming) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => {
        const isUser = message.role === "user";
        const isAssistant = message.role === "assistant";
        const timestamp = formatTimestamp(message.createdAt);

        return (
          <div
            key={message.id}
            className={`mb-4 flex undefined`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm undefined undefined`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {isUser ? "You" : isAssistant ? "Assistant" : "System"}
                </span>
                {timestamp && (
                  <span
                    className={`text-[10px] opacity-60 undefined`}
                  >
                    {timestamp}
                  </span>
                )}
              </div>

              <div
                className={`prose prose-sm max-w-none break-words undefined`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({
                      node,
                      inline,
                      className: codeClassName,
                      children,
                      ...props
                    }) {
                      const match = /language-(\w+)/.exec(
                        codeClassName || ""
                      );
                      if (!inline && match) {
                        return (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: "0.5rem 0",
                              borderRadius: "0.375rem",
                              fontSize: "0.8rem",
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        );
                      }
                      return (
                        <code
                          className={`rounded bg-black/10 px-1 py-0.5 text-[0.8em] undefined`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    a({ children, href, ...props }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={
                            isUser
                              ? "text-blue-200 underline hover:text-blue-100"
                              : "text-blue-600 underline hover:text-blue-500"
                          }
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                    p({ children, ...props }) {
                      return (
                        <p className="mb-1 last:mb-0" {...props}>
                          {children}
                        </p>
                      );
                    },
                    ul({ children, ...props }) {
                      return (
                        <ul className="mb-1 list-disc pl-5 last:mb-0" {...props}>
                          {children}
                        </ul>
                      );
                    },
                    ol({ children, ...props }) {
                      return (
                        <ol className="mb-1 list-decimal pl-5 last:mb-0" {...props}>
                          {children}
                        </ol>
                      );
                    },
                    blockquote({ children, ...props }) {
                      return (
                        <blockquote
                          className={`border-l-2 pl-3 italic undefined`}
                          {...props}
                        >
                          {children}
                        </blockquote>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>

              {message.citations && message.citations.length > 0 && (
                <div
                  className={`mt-2 flex flex-wrap gap-1 border-t pt-2 text-[11px] undefined`}
                >
                  {message.citations.map((citation, index) => {
                    const label =
                      citation.title ||
                      citation.source ||
                      citation.url ||
                      `Source undefined`;
                    const clickable = Boolean(onCitationClick || citation.url);
                    const handleClick = () => {
                      if (onCitationClick) {
                        onCitationClick(citation, message);
                      } else if (citation.url) {
                        window.open(citation.url, "_blank", "noopener,noreferrer");
                      }
                    };
                    return (
                      <button
                        key={citation.id || `undefined-cit-undefined`}
                        type="button"
                        onClick={clickable ? handleClick : undefined}
                        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 undefined undefined`}
                      >
                        <span className="font-mono text-[10px]">[{index + 1}]</span>
                        <span className="line-clamp-1 max-w-[140px] text-left">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {message.error && (
                <div className="mt-1 text-[11px] text-red-200">
                  There was an error generating this response.
                </div>
              )}

              {message.isStreaming && (
                <span
                  className={`mt-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full undefined`}
                />
              )}
            </div>
          </div>
        );
      }),
    [messages, onCitationClick]
  );

  return (
    <div
      ref={containerRef}
      className={`flex h-full flex-col overflow-y-auto px-3 py-4 undefined`}
    >
      {renderedMessages}
      {isStreaming && (
        <div className="mb-4