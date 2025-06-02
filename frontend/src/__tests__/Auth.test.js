// frontend/src/__tests__/Auth.test.js
import React from 'react';
// Keep fireEvent for click, but import waitFor and userEvent
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // <--- NEW: Import userEvent
import Auth from '../components/Auth';
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const mockSetToken = jest.fn();
const mockNavigate = jest.fn();

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the useAuth context
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    setToken: mockSetToken,
  }),
}));

describe('Auth Component', () => {
  beforeEach(() => {
    // Clear mocks before each test
    axios.post.mockClear();
    localStorageMock.clear();
    mockSetToken.mockClear();
    mockNavigate.mockClear();
  });

  test('renders login form by default', () => {
    render(<Auth />);
    expect(screen.getByText(/login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account?/i)).toBeInTheDocument();
  });

  test('switches to register form when "Register" link is clicked', async () => {
    render(<Auth />);
    const registerLink = screen.getByText(/register/i);
    fireEvent.click(registerLink); // fireEvent for click is fine here

    expect(screen.getByText(/register/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    axios.post.mockResolvedValueOnce({ data: { token: 'mock-token' } });
    const user = userEvent.setup(); // <--- NEW: Initialize userEvent

    render(<Auth />);

    await user.type(screen.getByLabelText(/username:/i), 'testuser');
    await user.type(screen.getByLabelText(/password:/i), 'password123');

    await user.click(screen.getByRole('button', { name: /login/i }));

    // Verify axios.post was called with correct data
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/login', {
      username: 'testuser',
      password: 'password123',
    });

    // Verify setToken was called and localStorage was updated
    expect(mockSetToken).toHaveBeenCalledWith('mock-token');
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');

    // <--- NEW: Use waitFor for success message
    await waitFor(() => {
      expect(screen.getByText(/success! redirecting.../i)).toBeInTheDocument();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('handles failed login', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { message: 'Authentication failed' } } });
    const user = userEvent.setup(); // <--- NEW: Initialize userEvent

    render(<Auth />);

    await user.type(screen.getByLabelText(/username:/i), 'wronguser');
    await user.type(screen.getByLabelText(/password:/i), 'wrongpass');

    await user.click(screen.getByRole('button', { name: /login/i }));

    // Verify axios.post was called
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/login', {
      username: 'wronguser',
      password: 'wrongpass',
    });

    // Verify setToken was NOT called (This was the previous failure point)
    expect(mockSetToken).not.toHaveBeenCalled();

    // <--- NEW: Use waitFor for error message
    await waitFor(() => {
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles successful registration', async () => {
    axios.post.mockResolvedValueOnce({ data: { message: 'User registered successfully' } });
    const user = userEvent.setup(); // <--- NEW: Initialize userEvent

    render(<Auth />);
    fireEvent.click(screen.getByText(/register/i)); // Switch to register form

    await user.type(screen.getByLabelText(/username:/i), 'newregisteruser');
    await user.type(screen.getByLabelText(/password:/i), 'registerpass');
    // <--- CHANGE: Use userEvent.selectOptions instead of fireEvent.selectOptions
    await userEvent.selectOptions(screen.getByLabelText(/role:/i), 'user'); // Select user role

    await user.click(screen.getByRole('button', { name: /register/i }));

    // Verify axios.post was called
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/register', {
      username: 'newregisteruser',
      password: 'registerpass',
      role: 'user',
    });

    // <--- NEW: Use waitFor for success message
    await waitFor(() => {
      expect(screen.getByText(/User registered successfully/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled(); // Should not navigate on successful registration immediately
  });

  it('handles failed registration', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { message: 'Registration failed' } } });
    const user = userEvent.setup(); // <--- NEW: Initialize userEvent

    render(<Auth />);
    fireEvent.click(screen.getByText(/register/i)); // Switch to register form

    await user.type(screen.getByLabelText(/username:/i), 'existinguser');
    await user.type(screen.getByLabelText(/password:/i), 'somepass');
    // <--- CHANGE: Use userEvent.selectOptions instead of fireEvent.selectOptions
    await userEvent.selectOptions(screen.getByLabelText(/role:/i), 'user');

    await user.click(screen.getByRole('button', { name: /register/i }));

    // Verify axios.post was called
    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/register', {
      username: 'existinguser',
      password: 'somepass',
      role: 'user',
    });

    // <--- NEW: Use waitFor for error message
    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});