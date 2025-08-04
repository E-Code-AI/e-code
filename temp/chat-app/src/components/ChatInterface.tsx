import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSocket } from '../contexts/SocketContext';
import { useAuthStore } from '../stores/authStore';
import { ContactList } from './ContactList';
import { ChatWindow } from './ChatWindow';
import { AIAssistant } from './AIAssistant';
import { Bot, LogOut } from 'lucide-react';

interface Contact {
  id: string;
  username: string;
  avatar: string;
  status: string;
  isOnline: boolean;
  lastSeen: Date;
}

export function ChatInterface() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { user, logout } = useAuthStore();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const { data: contacts = [] } = useQuery<Contact[]>(
    'contacts',
    async () => {
      const response = await fetch('http://localhost:3001/api/contacts', {
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
      });
      return response.json();
    },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  useEffect(() => {
    if (!socket) return;

    socket.on('receiveMessage', () => {
      queryClient.invalidateQueries(['messages']);
    });

    return () => {
      socket.off('receiveMessage');
    };
  }, [socket, queryClient]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="bg-whatsapp-teal p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={user?.avatar}
              alt={user?.username}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h2 className="font-semibold text-white">{user?.username}</h2>
              <p className="text-xs text-whatsapp-light">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className="p-2 hover:bg-whatsapp-dark rounded-full transition-colors"
              title="AI Assistant"
            >
              <Bot className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-whatsapp-dark rounded-full transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Contact List */}
        <ContactList
          contacts={contacts}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex">
        {selectedContact ? (
          <ChatWindow contact={selectedContact} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Bot className="w-24 h-24 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Welcome to WhatsApp++
              </h3>
              <p className="text-gray-500">
                Select a contact to start chatting or use the AI Assistant
              </p>
            </div>
          </div>
        )}

        {/* AI Assistant Panel */}
        {showAIAssistant && (
          <AIAssistant onClose={() => setShowAIAssistant(false)} />
        )}
      </div>
    </div>
  );
}