// frontend/src/__tests__/Auth.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Auth from '../components/Auth';

jest.mock('axios');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockSetToken = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    setToken: mockSetToken,
  }),
}));

describe('Auth Component', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    axios.post.mockClear();
    mockNavigate.mockClear();
    mockSetToken.mockClear();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: jest.fn(),
        getItem: jest.fn(() => null),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock process.env.REACT_APP_BACKEND_URL for tests
    // This is crucial because your component now relies on it
    process.env.REACT_APP_BACKEND_URL = 'http://test-backend:5000'; // Or any dummy URL for tests
  });

  // afterEach to clean up mocked env var if other tests rely on a clean slate
  afterEach(() => {
    delete process.env.REACT_APP_BACKEND_URL;
  });

  test('renders login form by default', () => {
    render(<Auth />);
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('switches to register form when "Register" link is clicked', async () => {
    render(<Auth />);
    const registerLink = screen.getByText(/Register$/i);
    await user.click(registerLink);

    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    axios.post.mockResolvedValueOnce({ data: { token: 'mock-token' } });
    render(<Auth />);

    await user.type(screen.getByLabelText(/username:/i), 'testuser');
    await user.type(screen.getByLabelText(/password:/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      // --- CORRECTED: Using backticks (`) for template literal in mock expectation ---
      expect(axios.post).toHaveBeenCalledWith(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
        username: 'testuser',
        password: 'password123',
      });
      expect(mockSetToken).toHaveBeenCalledWith('mock-token');
      expect(screen.getByText(/Success! Redirecting.../i)).toBeInTheDocument();
      // Ensure navigate is called with /dashboard, not /
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 2000 });
  });

  test('handles failed login', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { msg: 'Invalid credentials' } },
    });
    render(<Auth />);

    await user.type(screen.getByLabelText(/username:/i), 'wronguser');
    await user.type(screen.getByLabelText(/password:/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      // --- CORRECTED: Using backticks (`) for template literal in mock expectation ---
      expect(axios.post).toHaveBeenCalledWith(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
        username: 'wronguser',
        password: 'wrongpass',
      });
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });

    expect(mockSetToken).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('handles successful registration', async () => {
    axios.post.mockResolvedValueOnce({ data: { msg: 'User registered successfully' } });
    render(<Auth />);

    const registerLink = screen.getByText(/Register$/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'newuser');
    await user.type(screen.getByLabelText(/password:/i), 'newpassword');
    await user.selectOptions(screen.getByLabelText(/role:/i), 'admin');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      // --- CORRECTED: Using backticks (`) for template literal in mock expectation ---
      expect(axios.post).toHaveBeenCalledWith(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
        username: 'newuser',
        password: 'newpassword',
        role: 'admin',
      });
      expect(screen.getByText(/User registered successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });

    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  test('handles failed registration', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { msg: 'Username already exists' } },
    });
    render(<Auth />);

    const registerLink = screen.getByText(/Register$/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'existinguser');
    await user.type(screen.getByLabelText(/password:/i), 'password');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      // --- CORRECTED: Using backticks (`) for template literal in mock expectation ---
      expect(axios.post).toHaveBeenCalledWith(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
        username: 'existinguser',
        password: 'password',
        role: 'user',
      });
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });

    expect(mockSetToken).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});