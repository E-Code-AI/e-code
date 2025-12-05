import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";

export type MessageRole = "user" | "assistant" | "system";

export interface MessageItemProps {
  id: string;
  role: MessageRole;
  content: string;
  createdAt?: Date | string | number;
  isStreaming?: boolean;
  isLast?: boolean;
  showActions?: boolean;
  showAvatar?: boolean;
  showSenderLabel?: boolean;
  onCopy?: (messageId: string, content: string) => void;
  onRegenerate?: (messageId: string) => void;
  onStopStreaming?: (messageId: string) => void;
  className?: string;
  avatarUrl?: string;
  senderName?: string;
}

const formatTimestamp = (value?: Date | string | number): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getDefaultSenderName = (role: MessageRole): string => {
  switch (role) {
    case "user":
      return "You";
    case "assistant":
      return "Assistant";
    case "system":
      return "System";
    default:
      return "Unknown";
  }
};

const getRoleColorClasses = (role: MessageRole): string => {
  switch (role) {
    case "user":
      return "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-50 border-blue-100 dark:border-blue-900";
    case "assistant":
      return "bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border-slate-100 dark:border-slate-800";
    case "system":
      return "bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-50 border-amber-100 dark:border-amber-900";
    default:
      return "bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 border-slate-100 dark:border-slate-800";
  }
};

const getAvatarFallback = (role: MessageRole): string => {
  switch (role) {
    case "user":
      return "U";
    case "assistant":
      return "A";
    case "system":
      return "S";
    default:
      return "?";
  }
};

const useStreamingCursor = (isStreaming?: boolean, isLast?: boolean): boolean => {
  const [showCursor, setShowCursor] = useState<boolean>(false);

  useEffect(() => {
    if (!isStreaming || !isLast) {
      setShowCursor(false);
      return;
    }

    setShowCursor(true);
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 600);

    return () => clearInterval(interval);
  }, [isStreaming, isLast]);

  return showCursor;
};

const MessageItem: React.FC<MessageItemProps> = ({
  id,
  role,
  content,
  createdAt,
  isStreaming = false,
  isLast = false,
  showActions = true,
  showAvatar = true,
  showSenderLabel = true,
  onCopy,
  onRegenerate,
  onStopStreaming,
  className,
  avatarUrl,
  senderName,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const messageRef = useRef<HTMLDivElement | null>(null);
  const showCursor = useStreamingCursor(isStreaming, isLast);

  const timestamp = useMemo(() => formatTimestamp(createdAt), [createdAt]);
  const displaySenderName = useMemo(
    () => senderName || getDefaultSenderName(role),
    [senderName, role]
  );

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (onCopy) onCopy(id, content);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [content, id, onCopy]);

  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate(id);
    }
  }, [id, onRegenerate]);

  const handleStopStreaming = useCallback(() => {
    if (onStopStreaming) {
      onStopStreaming(id);
    }
  }, [id, onStopStreaming]);

  const isUser = role === "user";
  const isAssistant = role === "assistant";

  const containerClasses = classNames(
    "w-full flex gap-3 py-3 px-4 border-b border-slate-100 dark:border-slate-800",
    {
      "bg-white dark:bg-slate-950": isUser,
      "bg-slate-50/60 dark:bg-slate-900/60": isAssistant || role === "system",
    },
    className
  );

  const bubbleClasses = classNames(
    "relative max-w-full rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm",
    getRoleColorClasses(role)
  );

  const actionsVisible = showActions && (onCopy || (onRegenerate && isAssistant) || (onStopStreaming && isStreaming));

  return (
    <div className={containerClasses} data-message-id={id}>
      {showAvatar && (
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displaySenderName}
              className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div
              className={classNames(
                "h-8 w-8 flex items-center justify-center rounded-full text-xs font-semibold border",
                {
                  "bg-blue-600 text-white border-blue-700": isUser,
                  "bg-slate-800 text-slate-50 border-slate-900": isAssistant,
                  "bg-amber-600 text-amber-50 border-amber-700": role === "system",
                }
              )}
            >
              {getAvatarFallback(role)}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            {showSenderLabel && (
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {displaySenderName}
              </span>
            )}
            {timestamp && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {timestamp}
              </span>
            )}
          </div>
        </div>

        <div className="group relative">
          <div ref={messageRef} className={bubbleClasses}>
            <div className="whitespace-pre-wrap break-words">
              {content}
              {showCursor && (
                <span className="inline-block w-[7px] h-[15px] align-baseline bg-slate-500/80 ml-[1px] rounded-sm" />
              )}
            </div>
          </div>

          {actionsVisible && (
            <div className="absolute -top-2 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onStopStreaming && isStreaming && (
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 border border-red-100 dark:border-red-900 px-2 py-[2px] text-[10px] font-medium hover:bg-red-100 dark:hover:bg-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                >
                  Stop
                </button>
              )}

              {onRegenerate && isAssistant && !isStreaming && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-2 py-[2px] text-[10px] font-medium hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60"
                >
                  Regenerate
                </button>