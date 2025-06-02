// frontend/src/App.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
// NO LONGER IMPORT BrowserRouter here, as App itself provides it
// import { BrowserRouter as Router } from 'react-router-dom';

// Import the actual AuthProvider to wrap App in tests
import { AuthProvider } from '../context/AuthContext';

import App from './App';

// Mock the environment variable (crucial for API calls in components)
process.env.REACT_APP_BACKEND_URL = 'http://localhost:5000';

// Mock localStorage for tests, as AuthContext relies on it for initial state
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace the global localStorage with our mock for testing environment
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch for Dashboard/Reports/AdminPanel components to prevent actual network calls
global.fetch = jest.fn((url) => {
  if (url.includes('/api/metrics')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ metrics: [{ hostname: 'host1', cpu_usage: 10, memory_usage: 20, timestamp: new Date().toISOString() }], summary: {} }),
    });
  }
  if (url.includes('/api/hosts')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(['host1', 'host2']),
    });
  }
  if (url.includes('/api/admin-panel')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ users: [] }), // Empty array for admin panel users
    });
  }
  if (url.includes('/api/reports/generate')) {
    return Promise.resolve({
      ok: true,
      blob: () => Promise.resolve(new Blob(['mock PDF content'], { type: 'application/pdf' })),
    });
  }
  // Default for unhandled URLs
  return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
});


describe('App component', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Reset path before each test to ensure tests are isolated
    window.history.pushState({}, 'Test page', '/');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders login page if not authenticated (default route)', async () => {
    localStorage.clear();

    render(
      <AuthProvider> {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
  });

  test('renders Dashboard if authenticated (default route)', async () => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('role', 'user');

    render(
      <AuthProvider> {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
    );

    expect(await screen.findByRole('heading', { name: /System Monitoring Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Latest System Metrics Summary/i)).toBeInTheDocument();
  });

  test('redirects to login on root path if not authenticated (alternative initial path)', async () => {
    localStorage.clear();

    render(
      <AuthProvider> {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
  });

  test('renders Admin Panel if authenticated as admin and navigates to /admin', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem('role', 'admin');

    // For testing specific routes directly when App uses BrowserRouter internally,
    // you can mock window.location or use MemoryRouter if your App component
    // is structured to accept a router prop or similar.
    // Given App uses BrowserRouter, we'll simulate the navigation and then check.
    // Or, for direct route testing, we can use MemoryRouter from react-router-dom/server
    // to set initial entries. Let's use the actual MemoryRouter import for clarity.

    // Using MemoryRouter for direct path testing in App.test.js
    const { MemoryRouter } = jest.requireActual('react-router-dom');

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Admin Panel/i })).toBeInTheDocument();
    expect(screen.getByText(/No user data available./i)).toBeInTheDocument();
  });
});