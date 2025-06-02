// frontend/src/index.js (Example - adjust imports/structure as needed)
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Your main CSS file
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* Wrap your App with AuthProvider */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);