import React, { useState } from 'react';
import { Search, Circle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Contact {
  id: string;
  username: string;
  avatar: string;
  status: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface ContactListProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
}

export function ContactList({ contacts, selectedContact, onSelectContact }: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter((contact) =>
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Search Bar */}
      <div className="p-3 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-whatsapp-green"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            onClick={() => onSelectContact(contact)}
            className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
              selectedContact?.id === contact.id ? 'bg-gray-100' : ''
            }`}
          >
            <div className="relative">
              <img
                src={contact.avatar}
                alt={contact.username}
                className="w-12 h-12 rounded-full"
              />
              {contact.isOnline && (
                <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-current" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className="font-semibold text-gray-800">{contact.username}</h3>
              <p className="text-sm text-gray-500 truncate">
                {contact.isOnline
                  ? 'Online'
                  : `Last seen ${formatDistanceToNow(new Date(contact.lastSeen))} ago`}
              </p>
            </div>
          </div>
        ))}
        {filteredContacts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No contacts found
          </div>
        )}
      </div>
    </div>
  );
}