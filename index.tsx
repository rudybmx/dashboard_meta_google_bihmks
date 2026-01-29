import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './src/auth/AuthProvider';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Explicitly disabled as requested for stability
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      retry: 1
    }
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento root não encontrado');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);