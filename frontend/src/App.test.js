// frontend/src/App.test.js

// Add this line at the very top of your test file to mock 'recharts'
// This line was removed in the previous step, confirm it's still removed
// as it's handled by craco.config.js moduleNameMapper
// jest.mock('recharts'); // <--- ENSURE THIS LINE IS ABSENT


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

// Mock the AuthContext (this will now be resolved by moduleNameMapper)
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock localStorage - ADDED clear: jest.fn()
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(() => null),
    removeItem: jest.fn(),
    clear: jest.fn(), // <--- ADD THIS LINE
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

  test('renders login page if not authenticated', () => {
    useAuth.mockImplementation(() => ({
      token: null,
      setToken: jest.fn(),
    }));

    render(<App />);
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  test('renders Dashboard if authenticated', () => {
    useAuth.mockImplementation(() => ({
      token: 'mock-auth-token',
      setToken: jest.fn(),
    }));

    render(<App />);
    expect(screen.getByRole('heading', { name: /System Monitoring Dashboard/i })).toBeInTheDocument();
  });
});