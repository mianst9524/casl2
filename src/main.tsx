import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { MachineProvider } from './ui/machine/MachineContext';
import './ui/styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MachineProvider>
      <App />
    </MachineProvider>
  </StrictMode>,
);
