// frontend/src/components/ReportsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import ReportGenerator from './ReportGenerator'; // Import your existing ReportGenerator component

function ReportsPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [availableHostnames, setAvailableHostnames] = useState(['all']);
  const [error, setError] = useState('');
  const [loadingHostnames, setLoadingHostnames] = useState(true);

  const fetchHostnames = useCallback(async () => {
    setLoadingHostnames(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated. Please log in.');
      logout();
      navigate('/login');
      setLoadingHostnames(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/hosts`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableHostnames(['all', ...data]); // Add 'all' option
      } else {
        setError(data.message || 'Failed to fetch hostnames.');
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching hostnames:', err);
      setError('An error occurred while fetching hostnames.');
    } finally {
      setLoadingHostnames(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHostnames();
    }
  }, [isAuthenticated, fetchHostnames]);

  if (loadingHostnames) {
    return <div className="loading-container">Loading available hosts...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="reports-container">
      <h2>Generate System Health Report</h2>
      <p>Select criteria below to generate a PDF report.</p>
      {/* Render the ReportGenerator component */}
      <ReportGenerator
        token={localStorage.getItem('token')} // Pass token explicitly
        hostnames={availableHostnames}
      />
    </div>
  );
}

export default ReportsPage;