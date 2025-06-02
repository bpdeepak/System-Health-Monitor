// src/App.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App'; // Make sure this path is correct

// Mock the environment variable if it's used in App.js
process.env.REACT_APP_BACKEND_URL = 'http://localhost:5000';

// Mock localStorage for tests
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

// Replace the global localStorage with our mock
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App component', () => {
  beforeEach(() => {
    // Clear localStorage before each test to ensure isolation
    localStorage.clear();
    // Reset any mocks if necessary (though the above handles it for localStorage)
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  test('renders login page if not authenticated (default route)', async () => {
    // Ensure localStorage is empty for this test
    localStorage.clear();

    render(<App />);

    // Expect the Login page to be rendered
    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account?/i)).toBeInTheDocument();
  });

  test('renders Dashboard if authenticated (default route)', async () => {
    // Set localStorage items *before* rendering the App component
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('role', 'user');

    render(<App />);

    // Wait for the Dashboard content to appear, as fetching data might be async
    expect(await screen.findByRole('heading', { name: /System Monitoring Dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/Latest System Metrics Summary/i)).toBeInTheDocument();
  });

  test('redirects to login on root path if not authenticated (alternative initial path)', async () => {
    // Ensure localStorage is empty for this test
    localStorage.clear();

    // We don't need to navigate explicitly, as the App component handles the root path
    render(<App />);

    // It should redirect to login, so we expect login specific content
    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
  });
});