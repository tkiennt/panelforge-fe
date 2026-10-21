import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import App from './App.tsx';
import './styles/index.css';
import { I18nProvider } from './lib/i18n';
import { ConfirmProvider } from './shared/context/ConfirmContext';
import { ToastProvider } from './shared/context/ToastContext';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ConfirmProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ConfirmProvider>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
