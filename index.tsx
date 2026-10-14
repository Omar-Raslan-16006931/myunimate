import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';
import PasskeyHandoff, { passkeyHandoffFromUrl } from './components/PasskeyHandoff';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA
registerSW({ immediate: true });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// the app's in-app Safari sheet opens this same site with ?pk=...&h=... for the Face ID step
const handoff = passkeyHandoffFromUrl();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {handoff ? <PasskeyHandoff kind={handoff.kind} id={handoff.id} /> : <App />}
  </React.StrictMode>
);