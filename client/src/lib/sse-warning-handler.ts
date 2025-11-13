/**
 * SSE Warning Handler
 * Centralizes handling of Server-Sent Events warning messages from AI streaming.
 * Used to notify users when context truncation occurs due to provider limits.
 */

export interface SSEWarningData {
  message: string;
  droppedCount: number;
  originalSize: number;
  finalSize: number;
}

export interface SSEWarningHandlerOptions {
  toast: (options: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  }) => void;
  addSystemMessage: (content: string) => void;
}

/**
 * Handles SSE warning events by:
 * 1. Showing a toast notification (transient alert)
 * 2. Adding a system message to the conversation (persistent audit trail)
 * 
 * This dual approach ensures users are notified immediately while maintaining
 * a visible history of truncation events in the chat.
 */
export function handleSSEWarning(
  data: SSEWarningData,
  options: SSEWarningHandlerOptions
): void {
  const { toast, addSystemMessage } = options;
  
  // Show toast notification for immediate awareness
  toast({
    title: '⚠️ Context Truncated',
    description: `${data.message} (${data.droppedCount} messages removed)`,
    variant: 'default'
  });
  
  // Add system message to conversation for audit trail
  const systemMessageContent = `⚠️ **Context Truncation Notice**

Due to AI model limits, ${data.droppedCount} older message${data.droppedCount > 1 ? 's were' : ' was'} removed from the conversation history.

- **Original size**: ${formatBytes(data.originalSize)}
- **Reduced to**: ${formatBytes(data.finalSize)}
- **Removed**: ${data.droppedCount} message${data.droppedCount > 1 ? 's' : ''}

Recent messages are preserved. The AI can still access your latest context.`;
  
  addSystemMessage(systemMessageContent);
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
