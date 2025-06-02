// frontend/src/App.test.js

// Ensure this line is still present and the file is in frontend/__mocks__/recharts.js
// No explicit jest.mock('recharts'); needed here due to craco.config.js
import React from 'react';
import { render, screen } from '@testing-library/react';
// Import MemoryRouter to simulate browser routing in tests
import { MemoryRouter } from 'react-router-dom';
import App from './App'; // Assuming App.js is in the same directory

// Mock react-router-dom hooks (useNavigate, Link) but NOT the routing components (BrowserRouter, Routes, Route)
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Keep actual implementations for components
  useNavigate: jest.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  // REMOVE BROWSERROUTER, ROUTES, ROUTE MOCKS HERE
  // BrowserRouter: ({ children }) => <div>{children}</div>,
  // Routes: ({ children }) => <div>{children}</div>,
  // Route: ({ children }) => <div>{children}</div>,
}));

// Mock the AuthContext (as previously configured)
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock localStorage (as previously configured)
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

  test('renders login page if not authenticated and on /login route', async () => {
    useAuth.mockImplementation(() => ({
      token: null, // Unauthenticated
      setToken: jest.fn(),
    }));

    render(
      <MemoryRouter initialEntries={['/login']}> {/* Simulate starting at /login */}
        <App />
      </MemoryRouter>
    );

    // Use findByRole because rendering might be asynchronous due to routing
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  test('renders Dashboard if authenticated and on /dashboard route', async () => {
    useAuth.mockImplementation(() => ({
      token: 'mock-auth-token', // Authenticated
      setToken: jest.fn(),
    }));

    render(
      <MemoryRouter initialEntries={['/dashboard']}> {/* Simulate starting at /dashboard */}
        <App />
      </MemoryRouter>
    );

    // Use findByRole because rendering might be asynchronous due to routing
    expect(await screen.findByRole('heading', { name: /System Monitoring Dashboard/i })).toBeInTheDocument();
  });

  // You might want a test for the root path '/' when unauthenticated,
  // expecting it to redirect to /login or render the Auth component directly.
  test('redirects to login on root path if not authenticated', async () => {
    useAuth.mockImplementation(() => ({
      token: null, // Unauthenticated
      setToken: jest.fn(),
    }));

    render(
      <MemoryRouter initialEntries={['/']}> {/* Simulate starting at / */}
        <App />
      </MemoryRouter>
    );
    // Since App.js likely uses <Navigate to="/login" /> or similar,
    // it should eventually render the login page.
    expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  });
});