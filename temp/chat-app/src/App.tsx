import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ChatInterface } from './components/ChatInterface';
import { Login } from './components/Login';
import { useAuthStore } from './stores/authStore';
import { SocketProvider } from './contexts/SocketContext';

const queryClient = new QueryClient();

function App() {
  const { user, token } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-gray-50">
        {user && token ? (
          <SocketProvider token={token}>
            <ChatInterface />
          </SocketProvider>
        ) : (
          <Login />
        )}
      </div>
    </QueryClientProvider>
  );
}

export default App;