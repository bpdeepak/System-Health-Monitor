// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the Auth Context
const AuthContext = createContext(null);

// Custom hook to use the Auth Context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  // Initialize token from localStorage if it exists
  const [token, setTokenState] = useState(localStorage.getItem('token'));

  // Function to update the token in state and localStorage
  const setToken = (newToken) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  // You might want to add more context here, e.g., user info, isLoggedIn status

  const contextValue = {
    token,
    setToken,
    // Add other values/functions needed across the app
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};