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
  useAuth: jest.fn(),
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

  // This test will now implicitly start at the root path (/) and rely on App.js's routing logic
  test('renders login page if not authenticated (default route)', async () => {
    useAuth.mockImplementation(() => ({
      token: null, // Unauthenticated
      // As AuthContext.js does not expose isAuthenticated directly, we mock it based on token
      isAuthenticated: false,
      setToken: jest.fn(),
    }));

    render(<App />); // Render App directly, as it contains BrowserRouter

    // Assuming App.js will redirect to /login or render LoginPage component on unauthenticated default route
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  // This test will now implicitly start at the root path (/) and rely on App.js's routing logic
  test('renders Dashboard if authenticated (default route)', async () => {
    useAuth.mockImplementation(() => ({
      token: 'mock-auth-token', // Authenticated
      // As AuthContext.js does not expose isAuthenticated directly, we mock it based on token
      isAuthenticated: true,
      setToken: jest.fn(),
    }));

    render(<App />); // Render App directly

    // Assuming App.js will redirect to /dashboard or render Dashboard component on authenticated default route
    expect(await screen.findByRole('heading', { name: /System Monitoring Dashboard/i })).toBeInTheDocument();
  });

  // This test essentially covers the same scenario as the first test if App.js redirects '/' to '/login'
  test('redirects to login on root path if not authenticated (alternative initial path)', async () => {
    useAuth.mockImplementation(() => ({
      token: null, // Unauthenticated
      isAuthenticated: false,
      setToken: jest.fn(),
    }));

    // Rendering <App /> will default to the '/' path.
    // If your app automatically redirects to /login from '/', this test passes.
    render(<App />);
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });
});