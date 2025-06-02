import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Ensure userEvent is imported
import axios from 'axios';
import Auth from '../components/Auth'; // Correct path to Auth component

// Mock axios
jest.mock('axios');

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the useAuth context
// Ensure useAuth returns an object with setToken, even if it's a mock
const mockSetToken = jest.fn();
jest.mock('../context/AuthContext', () => ({
  // The named export 'useAuth' from AuthContext
  useAuth: () => ({
    setToken: mockSetToken,
    // If your AuthContext provides other values (like 'token' state directly),
    // you might need to mock them here too if your component uses them.
    // For now, assuming only setToken is strictly required by Auth.js directly.
  }),
  // If AuthProvider is imported in test files (e.g., App.test.js), it might need a mock here too.
  // For Auth.test.js specifically, we directly mock `useAuth`.
}));

describe('Auth Component', () => {
  let user; // Declare user globally for userEvent setup

  beforeEach(() => {
    user = userEvent.setup(); // Setup userEvent before each test to handle user interactions correctly
    // Clear all mocks before each test to ensure a clean state
    axios.post.mockClear();
    mockNavigate.mockClear();
    mockSetToken.mockClear();

    // Mock localStorage for each test to track interactions
    // This allows us to assert if setItem/removeItem were called
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: jest.fn(),
        getItem: jest.fn(() => null), // Default to returning null for getItem unless specifically overridden
        removeItem: jest.fn(),
      },
      writable: true, // Make it writable so Jest can mock it
    });
  });

  // Test case 1: renders login form by default
  test('renders login form by default', () => {
    render(<Auth />);
    // Use getByRole with name option to differentiate between heading and button
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  // Test case 2: switches to register form when "Register" link is clicked
  test('switches to register form when "Register" link is clicked', async () => {
    render(<Auth />);
    // Target the "Register" link specifically (it's in a <p> tag as a <span>)
    const registerLink = screen.getByText(/Register$/i); // Using $ to match end of string
    await user.click(registerLink);

    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role:/i)).toBeInTheDocument(); // Role select should appear
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account?/i)).toBeInTheDocument(); // Verify back-to-login link
  });

  // Test case 3: handles successful login
  test('handles successful login', async () => {
    axios.post.mockResolvedValueOnce({ data: { token: 'mock-token' } });
    render(<Auth />);

    await user.type(screen.getByLabelText(/username:/i), 'testuser');
    await user.type(screen.getByLabelText(/password:/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
    });

    // Verify setToken was called and localStorage.setItem was called
    expect(mockSetToken).toHaveBeenCalledWith('mock-token');
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
    expect(mockNavigate).toHaveBeenCalledWith('/'); // Ensure navigation happened

    await waitFor(() => {
      expect(screen.getByText(/Success! Redirecting.../i)).toBeInTheDocument();
    });
  });

  // Test case 4: handles failed login
  test('handles failed login', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { msg: 'Invalid credentials' } },
    });
    render(<Auth />);

    await user.type(screen.getByLabelText(/username:/i), 'wronguser');
    await user.type(screen.getByLabelText(/password:/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/login', {
        username: 'wronguser',
        password: 'wrongpass',
      });
    });

    // Verify setToken and localStorage.setItem were NOT called on failure
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Authentication failed: Invalid credentials/i)).toBeInTheDocument();
    });
  });

  // Test case 5: handles successful registration
  test('handles successful registration', async () => {
    axios.post.mockResolvedValueOnce({ data: { msg: 'User registered successfully' } });
    render(<Auth />);

    // Switch to register form
    const registerLink = screen.getByText(/Register$/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'newuser');
    await user.type(screen.getByLabelText(/password:/i), 'newpassword');
    await user.selectOptions(screen.getByLabelText(/role:/i), 'admin'); // Select 'admin' role
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/register', {
        username: 'newuser',
        password: 'newpassword',
        role: 'admin', // Should be 'admin' due to selection
      });
    });

    // For successful registration, setToken and navigate should NOT be called
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled(); // No token set for registration

    await waitFor(() => {
      expect(screen.getByText(/User registered successfully/i)).toBeInTheDocument();
      // After successful registration, it should switch back to login form (as per Auth.js logic)
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });
  });

  // Test case 6: handles failed registration
  test('handles failed registration', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { msg: 'Username already exists' } },
    });
    render(<Auth />);

    // Switch to register form
    const registerLink = screen.getByText(/Register$/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'existinguser');
    await user.type(screen.getByLabelText(/password:/i), 'password');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/register', {
        username: 'existinguser',
        password: 'password',
        role: 'user', // Default role if not explicitly selected
      });
    });

    // Verify setToken, localStorage.setItem, and navigate were NOT called on failure
    expect(mockSetToken).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Registration failed: Username already exists/i)).toBeInTheDocument();
    });
  });
});