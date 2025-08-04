import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Leads } from './pages/Leads';
import { Deals } from './pages/Deals';
import { Tasks } from './pages/Tasks';
import { Pipeline } from './pages/Pipeline';
import { Layout } from './components/Layout';
import { useAuthStore } from './stores/authStore';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="leads" element={<Leads />} />
            <Route path="deals" element={<Deals />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="tasks" element={<Tasks />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;