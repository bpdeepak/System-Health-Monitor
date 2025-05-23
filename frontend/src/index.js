import React from 'react';
import ReactDOM from 'react-dom/client';  // new root API in React 18+
import './index.css';                     // global styles
import App from './App';                  // main app component
import reportWebVitals from './reportWebVitals';  // performance measuring tool

// Get the root div from public/index.html and create React root
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the <App /> inside React Strict Mode for highlighting potential issues
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: measure app performance or send results to analytics
reportWebVitals();
