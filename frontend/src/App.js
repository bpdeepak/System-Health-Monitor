// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'; // Your global styles
import { useAuth } from './context/AuthContext'; // Import useAuth

// Import modularized components
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ReportsPage from './components/ReportsPage';
import AdminPanel from './components/AdminPanel';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
// import Home from './components/Home'; // Commented out as Dashboard is likely the main authenticated view
import Devices from './components/Devices'; // Import your new Devices component


function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Navbar /> {/* Your existing Navbar component */}
      <div className="container">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminPanel /></PrivateRoute>} />
          
          {/* NEW ROUTE FOR DEVICES */}
          {/* Ensure this is a PrivateRoute if only authenticated users can manage devices */}
          <Route path="/devices" element={<PrivateRoute><Devices /></PrivateRoute>} /> 
          
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