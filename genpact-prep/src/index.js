import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './AuthContext';
import App from './GenpactPrep';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);