// frontend/src/__tests__/Auth.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from '../components/Auth';

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }) => <a href={to}>{children}</a>, // Mock Link component
}));

// Mock AuthContext's useAuth hook
const mockLogin = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    // Add other context values if Auth component were to use them, e.g., logout
  }),
}));

describe('Auth Component', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockNavigate.mockClear();
    mockLogin.mockClear();

    // Mock global fetch
    // Reset fetch mock before each test to ensure a clean slate
    global.fetch = jest.fn((url, options) => {
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-token', user: { role: 'user' } }),
        });
      } else if (url.includes('/api/auth/register')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ msg: 'Registration successful!' }),
        });
      }
      return Promise.reject(new Error('Unknown fetch call'));
    });

    // Mock process.env.REACT_APP_BACKEND_URL for tests
    process.env.REACT_APP_BACKEND_URL = 'http://test-backend:5000';
  });

  afterEach(() => {
    // Clean up mocked env var
    delete process.env.REACT_APP_BACKEND_URL;
    // Clear fetch mocks
    jest.clearAllMocks();
  });

  test('renders login form by default', () => {
    render(<Auth />);
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('switches to register form when "Register here" link is clicked', async () => {
    render(<Auth />);
    const registerLink = screen.getByText(/Register here/i);
    await user.click(registerLink);

    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    render(<Auth />);

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
      // Ensure mockLogin was called with the token and role
      expect(mockLogin).toHaveBeenCalledWith('mock-token', 'user');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('handles failed login', async () => {
    // Adjust fetch mock for this specific test case
    global.fetch.mockImplementationOnce((url, options) => {
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ msg: 'Invalid credentials' }),
        });
      }
      return Promise.reject(new Error('Unknown fetch call'));
    });

    render(<Auth />);

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

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('handles successful registration', async () => {
    render(<Auth />);

    const registerLink = screen.getByText(/Register here/i);
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
      expect(screen.getByText(/Registration successful! You can now log in./i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument(); // Should switch back to login
    });

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('handles failed registration', async () => {
    // Adjust fetch mock for this specific test case
    global.fetch.mockImplementationOnce((url, options) => {
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ msg: 'Username already exists' }),
        });
      }
      return Promise.reject(new Error('Unknown fetch call'));
    });

    render(<Auth />);

    const registerLink = screen.getByText(/Register here/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'existinguser');
    await user.type(screen.getByLabelText(/password:/i), 'password');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'existinguser', password: 'password', role: 'user' }), // Default role
        })
      );
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });

    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});