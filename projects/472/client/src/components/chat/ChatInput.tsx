import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  KeyboardEvent,
  ChangeEvent,
  FormEvent,
} from "react";

export type ChatInputAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
};

export type ChatInputConversationOption = {
  id: string;
  label: string;
};

export type ChatInputSubmitPayload = {
  message: string;
  attachments: ChatInputAttachment[];
  conversationId?: string;
};

export type ChatInputProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  enterToSend?: boolean;
  showEnterToSendToggle?: boolean;
  allowAttachments?: boolean;
  maxAttachments?: number;
  maxMessageLength?: number;
  conversationId?: string;
  conversationOptions?: ChatInputConversationOption[];
  showConversationSelector?: boolean;
  autoFocus?: boolean;
  className?: string;
  textareaClassName?: string;
  onChange?: (value: string) => void;
  onSubmit?: (payload: ChatInputSubmitPayload) => void;
  onAttachmentAdd?: (attachments: ChatInputAttachment[]) => void;
  onAttachmentRemove?: (attachmentId: string) => void;
  onConversationChange?: (conversationId: string | undefined) => void;
  onEnterToSendChange?: (enabled: boolean) => void;
};

export type ChatInputHandle = {
  focus: () => void;
  clear: () => void;
  setValue: (value: string) => void;
};

const generateAttachmentId = (): string =>
  `undefined-undefined`;

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  (
    {
      value,
      defaultValue = "",
      placeholder = "Type your message...",
      disabled = false,
      loading = false,
      enterToSend = true,
      showEnterToSendToggle = true,
      allowAttachments = true,
      maxAttachments = 5,
      maxMessageLength,
      conversationId,
      conversationOptions,
      showConversationSelector = false,
      autoFocus = false,
      className = "",
      textareaClassName = "",
      onChange,
      onSubmit,
      onAttachmentAdd,
      onAttachmentRemove,
      onConversationChange,
      onEnterToSendChange,
    },
    ref
  ) => {
    const isControlled = typeof value === "string";
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue || ""
    );
    const [attachments, setAttachments] = useState<ChatInputAttachment[]>([]);
    const [internalConversationId, setInternalConversationId] = useState<
      string | undefined
    >(conversationId);
    const [internalEnterToSend, setInternalEnterToSend] =
      useState<boolean>(enterToSend);

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const currentValue = isControlled ? value ?? "" : internalValue;
    const currentConversationId =
      conversationId !== undefined ? conversationId : internalConversationId;
    const currentEnterToSend =
      typeof enterToSend === "boolean" ? enterToSend : internalEnterToSend;

    useEffect(() => {
      if (conversationId !== undefined) {
        setInternalConversationId(conversationId);
      }
    }, [conversationId]);

    useEffect(() => {
      if (typeof enterToSend === "boolean") {
        setInternalEnterToSend(enterToSend);
      }
    }, [enterToSend]);

    useEffect(() => {
      if (autoFocus && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [autoFocus]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        },
        clear: () => {
          if (!isControlled) {
            setInternalValue("");
          }
        },
        setValue: (val: string) => {
          if (!isControlled) {
            setInternalValue(val);
          }
        },
      }),
      [isControlled]
    );

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>) => {
        let nextValue = event.target.value;
        if (
          typeof maxMessageLength === "number" &&
          maxMessageLength > 0 &&
          nextValue.length > maxMessageLength
        ) {
          nextValue = nextValue.slice(0, maxMessageLength);
        }

        if (!isControlled) {
          setInternalValue(nextValue);
        }
        if (onChange) {
          onChange(nextValue);
        }
      },
      [isControlled, maxMessageLength, onChange]
    );

    const resetInputState = useCallback(() => {
      if (!isControlled) {
        setInternalValue("");
      }
      setAttachments([]);
    }, [isControlled]);

    const emitSubmit = useCallback(() => {
      const trimmed = currentValue.trim();
      if (!trimmed && attachments.length === 0) return;
      if (disabled || loading) return;

      const payload: ChatInputSubmitPayload = {
        message: trimmed,
        attachments,
        conversationId: currentConversationId,
      };

      if (onSubmit) {
        onSubmit(payload);
      }

      resetInputState();
    }, [
      attachments,
      currentConversationId,
      currentValue,
      disabled,
      loading,
      onSubmit,
      resetInputState,
    ]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey && currentEnterToSend) {
          event.preventDefault();
          emitSubmit();
        }
      },
      [currentEnterToSend, emitSubmit]
    );

    const handleFormSubmit = useCallback(
      (event: FormEvent) => {
        event.preventDefault();
        emitSubmit();
      },
      [emitSubmit]
    );

    const handleAttachmentClick = useCallback(() => {
      if (!allowAttachments || disabled || loading) return;
      if (attachments.length >= maxAttachments) return;
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, [allowAttachments, attachments.length, disabled, loading, maxAttachments]);

    const handleFilesSelected = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const remainingSlots = maxAttachments - attachments.length;
        if (remainingSlots <= 0) {
          event.target.value = "";
          return;
        }

        const selectedFiles = Array.from(files).slice(0, remainingSlots);
        const newAttachments: ChatInputAttachment[] = selectedFiles.map(
          (file) => ({
            id: generateAttachmentId(),
            name: file.name,
            size: file.size,
            type: file.type,
            file,
          })
        );

        const updatedAttachments = [...attachments, ...newAttachments];
        setAttachments(updatedAttachments);

        if (onAttachmentAdd) {
          onAttachmentAdd(newAttachments);
        }

        event.target.value = "";
      },
      [attachments, maxAttachments, onAttachmentAdd]
    );

    const handleAttachmentRemoveInternal = useCallback(
      (id: string) => {
        setAttachments((prev) => prev.filter((att) => att.id !== id));
        if (onAttachmentRemove) {
          onAttachmentRemove(id);
        }
      },
      [onAttachmentRemove]
    );

    const handleConversationChangeInternal = useCallback(
      (event: ChangeEvent<HTMLSelectElement>) => {
        const nextId = event.target.value || undefined;
        if (conversationId === undefined) {
          setInternalConversationId(nextId);
        }
        if (onConversationChange) {
          onConversationChange(nextId);
        }
      },
      [conversationId, onConversationChange]
    );

    const handleEnterToSendToggle = useCallback(() => {
      const next = !currentEnterToSend;
      if (typeof enterToSend !== "boolean") {
        setInternalEnterToSend(next);
      }
      if (onEnterToSendChange) {
        onEnterToSendChange(next);
      }
    }, [currentEnterToSend, enterToSend, onEnterToSendChange]);

    const canSend =
      !disabled &&
      !loading &&
      (currentValue.trim().length > 0 || attachments.length > 0);

    return (
      <form
        onSubmit={handleFormSubmit}
        className={`chat-input-container undefined`.trim()}
      >
        {showConversationSelector && conversationOptions && (
          <div className="chat-input-conversation-selector">
            <label className="chat-input-conversation-label">
              Conversation:
            </label>
            <select
              className="chat-input-conversation-select"
              value={currentConversationId ?? ""}
              onChange={handleConversationChangeInternal}
              disabled={disabled || loading}
            >
              <option value="">Select conversation</option>
              {conversationOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>