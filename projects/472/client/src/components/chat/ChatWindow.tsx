import React, {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  KeyboardEvent,
  UIEvent,
  MouseEvent,
} from "react";
import classNames from "classnames";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string | number | Date;
  pending?: boolean;
  error?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeenAt?: string | number | Date;
}

export interface ChatWindowProps {
  conversationId: string;
  title?: string;
  subtitle?: string;
  messages: ChatMessage[];
  participant?: ChatParticipant;
  isLoadingHistory?: boolean;
  hasMoreHistory?: boolean;
  isSending?: boolean;
  isReadOnly?: boolean;
  inputPlaceholder?: string;
  initialInputValue?: string;
  autoFocusInput?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  showScrollToBottom?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  onSendMessage?: (content: string) => Promise<void> | void;
  onLoadMoreHistory?: () => Promise<void> | void;
  onRetryMessage?: (messageId: string) => Promise<void> | void;
  onCancelPending?: (messageId: string) => Promise<void> | void;
  onClearConversation?: () => Promise<void> | void;
  onClose?: () => void;
  onScroll?: (payload: {
    conversationId: string;
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
    isAtBottom: boolean;
    isAtTop: boolean;
  }) => void;
  renderMessage?: (message: ChatMessage, index: number, messages: ChatMessage[]) => React.ReactNode;
  renderHeaderActions?: () => React.ReactNode;
  renderFooterExtras?: () => React.ReactNode;
}

const SCROLL_BOTTOM_THRESHOLD_PX = 64;
const SCROLL_TOP_THRESHOLD_PX = 32;

const formatTimestamp = (value: string | number | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const isNearBottom = (el: HTMLElement | null): boolean => {
  if (!el) return true;
  const { scrollTop, scrollHeight, clientHeight } = el;
  return scrollHeight - (scrollTop + clientHeight) <= SCROLL_BOTTOM_THRESHOLD_PX;
};

const isNearTop = (el: HTMLElement | null): boolean => {
  if (!el) return false;
  return el.scrollTop <= SCROLL_TOP_THRESHOLD_PX;
};

const ChatWindow: FC<ChatWindowProps> = ({
  conversationId,
  title,
  subtitle,
  messages,
  participant,
  isLoadingHistory = false,
  hasMoreHistory = false,
  isSending = false,
  isReadOnly = false,
  inputPlaceholder = "Type a message…",
  initialInputValue = "",
  autoFocusInput = true,
  showHeader = true,
  showFooter = true,
  showScrollToBottom = true,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  onSendMessage,
  onLoadMoreHistory,
  onRetryMessage,
  onCancelPending,
  onClearConversation,
  onClose,
  onScroll,
  renderMessage,
  renderHeaderActions,
  renderFooterExtras,
}) => {
  const [inputValue, setInputValue] = useState<string>(initialInputValue);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState<boolean>(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastMessageCountRef = useRef<number>(messages.length);
  const lastScrollHeightRef = useRef<number>(0);

  const canSend = useMemo(
    () => !isReadOnly && !isSending && inputValue.trim().length > 0,
    [isReadOnly, isSending, inputValue]
  );

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsAutoScrolling(true);
    el.scrollTo({ top: el.scrollHeight, behavior });
    window.setTimeout(() => setIsAutoScrolling(false), 200);
  }, []);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const el = event.currentTarget;
      const atBottom = isNearBottom(el);
      const atTop = isNearTop(el);

      if (!isAutoScrolling) {
        setIsUserScrolledUp(!atBottom);
      }

      if (onScroll) {
        onScroll({
          conversationId,
          scrollTop: el.scrollTop,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          isAtBottom: atBottom,
          isAtTop: atTop,
        });
      }

      if (atTop && hasMoreHistory && !isLoadingHistory && onLoadMoreHistory) {
        const previousScrollHeight = el.scrollHeight;
        const maybePromise = onLoadMoreHistory();
        if (maybePromise && typeof (maybePromise as Promise<void>).then === "function") {
          (maybePromise as Promise<void>).then(() => {
            const newScrollHeight = el.scrollHeight;
            const delta = newScrollHeight - previousScrollHeight;
            el.scrollTop = el.scrollTop + delta;
          });
        }
      }
    },
    [conversationId, hasMoreHistory, isLoadingHistory, isAutoScrolling, onLoadMoreHistory, onScroll]
  );

  const handleSend = useCallback(async () => {
    if (!canSend || !onSendMessage) return;
    const content = inputValue.trim();
    if (!content) return;
    setInputValue("");
    try {
      await onSendMessage(content);
    } catch (error) {
      setInputValue((prev) => (prev ? `undefined\nundefined` : content));
      // In production, you might log this error or surface a toast.
      // Intentionally silent here to keep component generic.
    } finally {
      scrollToBottom("smooth");
    }
  }, [canSend, inputValue, onSendMessage, scrollToBottom]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void handleSend();
      }
    },
    [handleSend]
  );

  const handleScrollToBottomClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      scrollToBottom("smooth");
    },
    [scrollToBottom]
  );

  const handleRetryClick = useCallback(
    (messageId: string) => {
      if (!onRetryMessage) return;
      void onRetryMessage(messageId);
    },
    [onRetryMessage]
  );

  const handleCancelPendingClick = useCallback(
    (messageId: string) => {
      if (!onCancelPending) return;
      void onCancelPending(messageId);
    },
    [onCancelPending]
  );

  const handleClearConversationClick = useCallback(() => {
    if (!onClearConversation) return;
    void onClearConversation();
  }, [onClearConversation]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const messageCountChanged = messages.length !== lastMessageCountRef.current;
    const wasAtBottom = isNearBottom(el);

    if (messageCountChanged) {
      if (wasAtBottom || messages.length < lastMessageCountRef.current) {
        scrollToBottom(messages.length < lastMessageCountRef.current ? "auto" : "smooth");
        setIsUserScrolledUp(false);
      }
      lastMessageCountRef.current = messages.length;
      lastScrollHeightRef.current = el.scrollHeight;
      return;
    }

    const previousScrollHeight = lastScrollHeightRef.current;
    if (previousScrollHeight && el.scrollHeight !== previousScrollHeight && wasAtBottom) {
      scrollToBottom("auto");
    }
    lastScrollHeightRef.current = el.scrollHeight;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (autoFocusInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocusInput]);

  const renderDefaultMessage = useCallback(
    (message: ChatMessage, index: number) => {
      const isUser = message.role === "user";
      const isAssistant = message.role === "assistant";
      const isSystem = message.role === "system";

      return (
        <div
          key={message.id}
          className={classNames("chat-message",