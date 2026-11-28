import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './styles/index.css';
import { I18nProvider } from './lib/i18n';
import { isReaderMockEnabled, syncReaderMockFlagFromUrl } from './mocks/reader/config';

const queryClient = new QueryClient();

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <App />
        </I18nProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

// Dữ liệu mẫu khu độc giả: chỉ nạp module mock khi được bật, bản build thường không kéo theo.
syncReaderMockFlagFromUrl();
if (isReaderMockEnabled()) {
  import('./mocks/reader').then((m) => m.installReaderMock()).finally(render);
} else {
  render();
}
