// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the Auth Context
const AuthContext = createContext(null);

// Custom hook to use the Auth Context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  // Initialize token and user role from localStorage if they exist
  const [token, setTokenState] = useState(localStorage.getItem('token'));
  const [userRole, setUserRoleState] = useState(localStorage.getItem('role') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Function to update the token and role in state and localStorage
  const login = useCallback((newToken, role) => {
    setTokenState(newToken);
    setUserRoleState(role);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', role);
  }, []); // Depend on nothing as it's a stable function

  const logout = useCallback(() => {
    setTokenState(null);
    setUserRoleState(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }, []); // Depend on nothing as it's a stable function

  // Re-check authentication status on initial load or if token/role changes unexpectedly
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (storedToken && !token) {
      setTokenState(storedToken);
      setUserRoleState(storedRole);
      setIsAuthenticated(true);
    } else if (!storedToken && token) {
      // If token was in state but not localStorage, clear state
      setTokenState(null);
      setUserRoleState(null);
      setIsAuthenticated(false);
    }
  }, [token]); // Only re-run if local state 'token' changes unexpectedly

  const contextValue = {
    token,
    userRole,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};