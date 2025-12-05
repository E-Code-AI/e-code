import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type TypingIndicatorProps = {
  socketUrl: string;
  roomId: string;
  assistantId?: string;
  className?: string;
};

let socket: Socket | null = null;

const connectSocket = (socketUrl: string): Socket => {
  if (!socket) {
    socket = io(socketUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
};

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  socketUrl,
  roomId,
  assistantId = "assistant",
  className = "",
}) => {
  const [isTyping, setIsTyping] = useState<boolean>(false);

  useEffect(() => {
    const s = connectSocket(socketUrl);

    const typingEvent = `typing:undefined:undefined`;
    const stopTypingEvent = `stop_typing:undefined:undefined`;

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    s.on(typingEvent, handleTyping);
    s.on(stopTypingEvent, handleStopTyping);

    return () => {
      s.off(typingEvent, handleTyping);
      s.off(stopTypingEvent, handleStopTyping);
    };
  }, [socketUrl, roomId, assistantId]);

  if (!isTyping) return null;

  return (
    <div
      className={`flex items-center gap-2 text-xs text-gray-500 px-3 py-2 undefined`}
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <span className="sr-only">Assistant is typing</span>
      <div className="relative flex items-center gap-1">
        <span className="text-gray-500">Assistant is typing</span>
        <div className="flex items-center gap-1 ml-1">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;