// frontend/src/components/PrivateRoute.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (roles && !roles.includes(userRole)) {
      navigate('/'); // Redirect to home or unauthorized page
      alert('Access Denied: You do not have the necessary permissions.');
    }
  }, [isAuthenticated, userRole, roles, navigate]);

  // Render children only if authenticated and has required roles
  return isAuthenticated && (roles ? roles.includes(userRole) : true) ? children : null;
};

export default PrivateRoute;