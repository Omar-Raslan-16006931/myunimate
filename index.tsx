import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import './index.css';
import { App } from './App';
import PasskeyHandoff, { passkeyHandoffFromUrl } from './components/PasskeyHandoff';
import EmailConfirmed, { emailConfirmedFromUrl } from './components/EmailConfirmed';
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
const confirmed = !handoff && emailConfirmedFromUrl();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* every framer-motion animation follows the phone's Reduce Motion setting */}
    <MotionConfig reducedMotion="user">
    {handoff ? <PasskeyHandoff kind={handoff.kind} id={handoff.id} /> : confirmed ? <EmailConfirmed /> : <App />}
    </MotionConfig>
  </React.StrictMode>
);