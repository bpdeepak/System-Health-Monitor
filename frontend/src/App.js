// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'; // Your global styles
import { useAuth } from './context/AuthContext'; // Import useAuth

// Import modularized components
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ReportsPage from './components/ReportsPage'; // Renamed to avoid conflict if ReportGenerator exists
import AdminPanel from './components/AdminPanel';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminPanel /></PrivateRoute>} />
          {/* Default route based on authentication status */}
          <Route path="/" element={isAuthenticated ? <Dashboard /> : <Auth />} />
          {/* Redirect any other path to dashboard if authenticated, or login if not */}
          <Route path="*" element={isAuthenticated ? <Dashboard /> : <Auth />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;