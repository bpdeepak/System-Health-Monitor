// frontend/src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming useAuth is correctly imported

const PrivateRoute = ({ children }) => {
  const { token } = useAuth(); // Get the token from your AuthContext
  return token ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;