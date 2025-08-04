import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useSocket } from '../contexts/SocketContext';
import { useAuthStore } from '../stores/authStore';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Mic, 
  MoreVertical,
  Image,
  File,
  Camera,
  CheckCheck,
  Check
} from 'lucide-react';
import { format } from 'date-fns';

interface Contact {
  id: string;
  username: string;
  avatar: string;
  status: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface Message {
  id: string;
  from: string;
  to: string;
  type: 'text' | 'image' | 'file' | 'voice';
  message?: string;
  content?: any;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
}

interface ChatWindowProps {
  contact: Contact;
}

export function ChatWindow({ contact }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [contactTyping, setContactTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user, token } = useAuthStore();
  const { socket, onlineUsers } = useSocket();

  const { data: messages = [], refetch } = useQuery<Message[]>(
    ['messages', contact.id],
    async () => {
      const response = await fetch(
        `http://localhost:3001/api/messages/${contact.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.json();
    }
  );

  const sendMessageMutation = useMutation(
    async (messageData: Partial<Message>) => {
      socket?.emit('sendMessage', {
        to: contact.id,
        ...messageData,
      });
    },
    {
      onSuccess: () => {
        refetch();
      },
    }
  );

  const uploadFileMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      return response.json();
    },
    {
      onSuccess: (data) => {
        sendMessageMutation.mutate({
          type: file.type.startsWith('image/') ? 'image' : 'file',
          content: data,
          message: data.originalName,
        });
      },
    }
  );

  useEffect(() => {
    if (!socket) return;

    socket.on('messageSent', () => {
      refetch();
    });

    socket.on('receiveMessage', (message: Message) => {
      if (message.from === contact.id) {
        refetch();
        // Mark as read
        socket.emit('markAsRead', {
          messageId: message.id,
          conversationWith: contact.id,
        });
      }
    });

    socket.on('userTyping', ({ from, isTyping }: { from: string; isTyping: boolean }) => {
      if (from === contact.id) {
        setContactTyping(isTyping);
      }
    });

    return () => {
      socket.off('messageSent');
      socket.off('receiveMessage');
      socket.off('userTyping');
    };
  }, [socket, contact.id, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit('typing', { to: contact.id, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit('typing', { to: contact.id, isTyping: false });
    }, 1000);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessageMutation.mutate({
        type: 'text',
        message: message.trim(),
      });
      setMessage('');
      setIsTyping(false);
      socket?.emit('typing', { to: contact.id, isTyping: false });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate(file);
    }
  };

  const renderMessage = (msg: Message) => {
    const isOwnMessage = msg.from === user?.id;

    return (
      <div
        key={msg.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[70%] ${
            isOwnMessage
              ? 'bg-whatsapp-light rounded-l-2xl rounded-tr-sm'
              : 'bg-white rounded-r-2xl rounded-tl-sm'
          } p-3 shadow-sm`}
        >
          {msg.type === 'text' && (
            <p className="text-gray-800">{msg.message}</p>
          )}
          
          {msg.type === 'image' && (
            <div>
              <img
                src={`http://localhost:3001${msg.content.url}`}
                alt={msg.content.originalName}
                className="max-w-full rounded-lg mb-2"
              />
              <p className="text-sm text-gray-600">{msg.content.originalName}</p>
            </div>
          )}
          
          {msg.type === 'file' && (
            <a
              href={`http://localhost:3001${msg.content.url}`}
              download={msg.content.originalName}
              className="flex items-center space-x-2 text-blue-600 hover:underline"
            >
              <File className="w-5 h-5" />
              <span>{msg.content.originalName}</span>
            </a>
          )}
          
          <div className="flex items-center justify-end space-x-1 mt-1">
            <span className="text-xs text-gray-500">
              {format(new Date(msg.timestamp), 'HH:mm')}
            </span>
            {isOwnMessage && (
              msg.read ? (
                <CheckCheck className="w-4 h-4 text-blue-500" />
              ) : msg.delivered ? (
                <CheckCheck className="w-4 h-4 text-gray-400" />
              ) : (
                <Check className="w-4 h-4 text-gray-400" />
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={contact.avatar}
            alt={contact.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold text-gray-800">{contact.username}</h3>
            <p className="text-sm text-gray-500">
              {onlineUsers.includes(contact.id) ? (
                contactTyping ? (
                  <span className="text-whatsapp-green">typing...</span>
                ) : (
                  'Online'
                )
              ) : (
                `Last seen ${formatDistanceToNow(new Date(contact.lastSeen))} ago`
              )}
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <MoreVertical className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGklEQVQYlWPY96+SgQiAOVFGowqpb6FFlQAAjMgDxOJcKaQAAAAASUVORK5CYII=')]">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 flex items-center space-x-2">
        <div className="relative">
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
          
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg p-2 space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded w-full"
              >
                <Image className="w-5 h-5 text-purple-600" />
                <span>Image</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded w-full"
              >
                <File className="w-5 h-5 text-blue-600" />
                <span>File</span>
              </button>
              <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded w-full">
                <Camera className="w-5 h-5 text-red-600" />
                <span>Camera</span>
              </button>
            </div>
          )}
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <Smile className="w-5 h-5 text-gray-600" />
        </button>
        
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          placeholder="Type a message"
          className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-whatsapp-green"
        />
        
        {message ? (
          <button
            onClick={handleSendMessage}
            className="p-2 bg-whatsapp-green hover:bg-whatsapp-teal rounded-full transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        ) : (
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Mic className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}