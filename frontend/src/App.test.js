// frontend/src/App.test.js

// Add this line at the very top of your test file to mock 'recharts'
jest.mock('recharts');

import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App'; // Assuming App.js is in the same directory

// Mock react-router-dom hooks as they are used in App.js
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ children }) => <div>{children}</div>,
}));

// Mock the AuthContext
// This now accurately reflects the 'token' and 'setToken' provided by AuthContext.js
jest.mock('../context/AuthContext', () => ({
  // Mock the useAuth hook to return a mock context value
  useAuth: jest.fn(),
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(() => null),
    removeItem: jest.fn(),
  },
  writable: true,
});

// Mock process.env.REACT_APP_BACKEND_URL
process.env.REACT_APP_BACKEND_URL = 'http://test-backend:5000';


describe('App component', () => {
  // Get the mocked useAuth for individual test case manipulation
  const { useAuth } = require('../context/AuthContext');

  beforeEach(() => {
    // Reset mocks before each test
    useAuth.mockClear();
    localStorage.clear(); // Clear localStorage mock as well
  });

  // Test case for unauthenticated user (should render Auth component/Login)
  test('renders login page if not authenticated', () => {
    // Set useAuth to return an unauthenticated state (no token)
    useAuth.mockImplementation(() => ({
      token: null, // No token means unauthenticated
      setToken: jest.fn(),
    }));

    render(<App />);
    // Assuming your Auth component (Login form) has a heading like "Login"
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  // Test case for authenticated user (should render Dashboard)
  test('renders Dashboard if authenticated', () => {
    // Set useAuth to return an authenticated state (with a token)
    useAuth.mockImplementation(() => ({
      token: 'mock-auth-token', // A valid token means authenticated
      setToken: jest.fn(),
    }));

    render(<App />);
    // Assuming your Dashboard component has a heading or distinct text like "System Monitoring Dashboard"
    expect(screen.getByRole('heading', { name: /System Monitoring Dashboard/i })).toBeInTheDocument();
  });

  // Add more tests for other routes or authenticated scenarios if needed
});