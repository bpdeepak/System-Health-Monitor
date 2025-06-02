// src/__tests__/Auth.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Auth from '../components/Auth';
import { AuthProvider } from '../context/AuthContext'; // Import AuthProvider
import { BrowserRouter as Router } from 'react-router-dom'; // Import Router for tests that use navigation

// Mock environment variables for fetch
process.env.REACT_APP_BACKEND_URL = 'http://localhost:5000';

// Mock localStorage if AuthContext uses it
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch API for all tests
global.fetch = jest.fn();

describe('Auth Component', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear(); // Clear localStorage before each test
    jest.clearAllMocks(); // Clear fetch mock calls
  });

  // Helper function to render Auth component with AuthProvider and Router
  const renderAuth = () => {
    return render(
      <Router>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </Router>
    );
  };

  test('renders login form by default', () => {
    renderAuth();
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('switches to register form when "Register here" link is clicked', async () => {
    renderAuth();
    const registerLink = screen.getByText(/register here/i);
    await user.click(registerLink);

    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'fake-token', user: { role: 'user' } }),
    });

    renderAuth();

    await user.type(screen.getByLabelText(/username:/i), 'testuser');
    await user.type(screen.getByLabelText(/password:/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
        })
      );
    });

    // Check if token and role are set in localStorage
    expect(localStorage.getItem('token')).toBe('fake-token');
    expect(localStorage.getItem('role')).toBe('user');

    // Check for navigation to dashboard (mocking navigate)
    // Note: To properly test navigation, you might need to mock `useNavigate`
    // or use MemoryRouter in specific tests. For now, we'll check token/role.
  });

  test('handles failed login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ msg: 'Invalid credentials' }),
    });

    renderAuth();

    await user.type(screen.getByLabelText(/username:/i), 'wronguser');
    await user.type(screen.getByLabelText(/password:/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'wronguser', password: 'wrongpass' }),
        })
      );
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('handles successful registration', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ msg: 'Registration successful!' }), // Backend likely returns this
    });

    renderAuth();

    const registerLink = screen.getByText(/register here/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'newuser');
    await user.type(screen.getByLabelText(/password:/i), 'newpassword');
    await user.selectOptions(screen.getByLabelText(/role:/i), 'admin');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'newuser', password: 'newpassword', role: 'admin' }),
        })
      );
      // Adjusted expectation to match the likely actual message from backend/component
      expect(screen.getByText(/Registration successful!/i)).toBeInTheDocument();
      // Ensure it switches back to login form after successful registration
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });
  });

  test('handles failed registration', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ msg: 'Username already exists' }),
    });

    renderAuth();

    const registerLink = screen.getByText(/register here/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'existinguser');
    await user.type(screen.getByLabelText(/password:/i), 'password');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'existinguser', password: 'password', role: 'user' }), // Default role for registration
        })
      );
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });
  });
});