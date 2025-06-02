// frontend/src/App.test.js
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import the actual AuthProvider to wrap App in tests
import { AuthProvider } from '../context/AuthContext';

import App from './App';
import axios from 'axios'; // Import axios
jest.mock('axios'); // Mock axios completely

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

describe('App component', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Reset path before each test to ensure tests are isolated
    window.history.pushState({}, 'Test page', '/');

    // Mock axios responses for various endpoints
    axios.get.mockImplementation((url) => {
      // More precise URL matching to ensure the correct mock is hit
      if (url === `${process.env.REACT_APP_BACKEND_URL}/api/metrics`) {
        return Promise.resolve({
          data: { metrics: [{ hostname: 'host1', cpu_usage: 10, memory_usage: 20, timestamp: new Date().toISOString() }], summary: {} },
        });
      }
      if (url === `${process.env.REACT_APP_BACKEND_URL}/api/hosts`) {
        return Promise.resolve({ data: ['host1', 'host2'] });
      }
      if (url === `${process.env.REACT_APP_BACKEND_URL}/api/admin-panel`) {
        return Promise.resolve({ data: { users: [] } }); // Empty array for admin panel users
      }
      // Fallback for unmocked routes
      return Promise.reject(new Error(`Unhandled axios GET request for URL: ${url}`));
    });

    axios.post.mockImplementation((url, data) => {
        if (url === `${process.env.REACT_APP_BACKEND_URL}/api/reports/generate`) {
            return Promise.resolve({
                data: new Blob(['mock PDF content'], { type: 'application/pdf' }),
                headers: { 'content-type': 'application/pdf' }
            });
        }
        return Promise.reject(new Error(`Unhandled axios POST request for URL: ${url}`));
    });
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

    // Wrap render in act to ensure all async effects are processed
    await act(async () => {
      render(
        <AuthProvider> {/* Wrap App with AuthProvider */}
          <App />
        </AuthProvider>
      );
    });

    // Use findByRole and findByText as these elements appear after async operations
    expect(await screen.findByRole('heading', { name: /System Monitoring Dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText(/Latest System Metrics Summary/i)).toBeInTheDocument();
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

    await act(async () => {
      // Simulate navigation to /admin before rendering App
      window.history.pushState({}, 'Test page', '/admin');
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );
    });

    expect(await screen.findByRole('heading', { name: /Admin Panel/i })).toBeInTheDocument();
    // Assuming "No user data available." is rendered if user list is empty
    expect(screen.getByText(/No user data available./i)).toBeInTheDocument();
  });
});