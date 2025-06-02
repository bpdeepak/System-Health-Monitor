// frontend/src/App.test.js

// No jest.mock('recharts'); needed here due to craco.config.js

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
// MemoryRouter is NOT imported here because App.js provides its own Router
import App from './App'; // Assuming App.js is in the same directory

// Mock react-router-dom hooks (useNavigate, Link) but NOT the routing components (Router, Routes, Route)
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Keep actual implementations for components
  useNavigate: jest.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

// Mock the AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(), // This will be implemented in each test
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(() => null),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Mock process.env.REACT_APP_BACKEND_URL
process.env.REACT_APP_BACKEND_URL = 'http://test-backend:5000';


describe('App component', () => {
  const { useAuth } = require('../context/AuthContext');

  beforeEach(() => {
    useAuth.mockClear();
    localStorage.clear();
  });

  test('renders login page if not authenticated (default route)', async () => {
    useAuth.mockImplementation(() => ({
      token: null,
      // --- ADD THIS LINE BACK ---
      isAuthenticated: false, // Explicitly set isAuthenticated for App.js's logic
      setToken: jest.fn(),
    }));

    render(<App />); // Render App directly, as it contains BrowserRouter

    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  test('renders Dashboard if authenticated (default route)', async () => {
    useAuth.mockImplementation(() => ({
      token: 'mock-auth-token', // Authenticated
      // --- ADD THIS LINE BACK ---
      isAuthenticated: true, // Explicitly set isAuthenticated for App.js's logic
      setToken: jest.fn(),
    }));

    render(<App />); // Render App directly

    expect(await screen.findByRole('heading', { name: /System Monitoring Dashboard/i })).toBeInTheDocument();
  });

  test('redirects to login on root path if not authenticated (alternative initial path)', async () => {
    useAuth.mockImplementation(() => ({
      token: null,
      // --- ADD THIS LINE BACK ---
      isAuthenticated: false, // Explicitly set isAuthenticated for App.js's logic
      setToken: jest.fn(),
    }));

    render(<App />);
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });
});