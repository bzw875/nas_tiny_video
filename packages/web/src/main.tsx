import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { MonitorErrorBoundary } from './components/MonitorErrorBoundary';
import { setupMonitor } from './lib/monitor';
import './index.css';
import './novel.css';

setupMonitor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MonitorErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MonitorErrorBoundary>
  </StrictMode>,
);
