// frontend/src/components/AdminPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const { isAuthenticated, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-panel`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.msg || 'Admin data fetched (users list not implemented yet)');
        setUsers([]); // Placeholder for user list
      } else {
        setMessage(data.msg || 'Failed to fetch admin data.');
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setMessage('An error occurred while fetching admin data.');
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (isAuthenticated && userRole === 'admin') {
      fetchUsers();
    } else if (isAuthenticated && userRole !== 'admin') {
        // If authenticated but not admin, redirect or show access denied
        navigate('/dashboard'); // Or a dedicated unauthorized page
        alert('Access Denied: Only administrators can view this page.');
    }
  }, [isAuthenticated, userRole, fetchUsers, navigate]);

  if (!isAuthenticated || userRole !== 'admin') {
    return <div className="unauthorized-container">Unauthorized Access.</div>;
  }

  return (
    <div className="admin-panel-container">
      <h2>Admin Panel</h2>
      {message && <p>{message}</p>}
      {users.length > 0 ? (
        <ul>
          {users.map(user => (
            <li key={user._id}>{user.username} ({user.role})</li>
          ))}
        </ul>
      ) : (
        <p>No user data available (or not implemented).</p>
      )}
    </div>
  );
}

export default AdminPanel;