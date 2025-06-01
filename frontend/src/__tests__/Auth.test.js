import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom'; // For extended DOM matchers
import Auth from '../components/Auth'; // Adjust path as needed
import axios from 'axios';

// Mock axios post requests to prevent actual HTTP calls during tests
jest.mock('axios');

describe('Auth Component', () => {
  const mockSetToken = jest.fn(); // Mock function for setToken prop

  beforeEach(() => {
    // Clear all mocks before each test to ensure test isolation
    jest.clearAllMocks();
    axios.post.mockClear();
  });

  it('renders login form by default', () => {
    render(<Auth setToken={mockSetToken} />);

    // Check for login form elements
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();

    // Ensure register specific elements are not present
    expect(screen.queryByLabelText(/role:/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
  });

  it('switches to register form when "Register" link is clicked', () => {
    render(<Auth setToken={mockSetToken} />);

    fireEvent.click(screen.getByText(/register/i)); // Click the "Register" link

    // Check for register form elements
    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/role:/i)).toBeInTheDocument(); // Role select should appear
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();

    // Ensure login specific elements are not present
    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument();
  });

  it('handles successful login', async () => {
    // Mock a successful axios response for login
    axios.post.mockResolvedValueOnce({ data: { token: 'mock-jwt-token-123', msg: 'Logged in successfully' } });
    const user = userEvent.setup(); // Setup user-event for typing

    render(<Auth setToken={mockSetToken} />);

    // Type into username and password fields
    await user.type(screen.getByLabelText(/username:/i), 'testuser');
    await user.type(screen.getByLabelText(/password:/i), 'password123');

    // Click the login button
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Wait for axios.post to be called and for the message to appear
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
    });

    // Verify setToken was called with the mock token
    expect(mockSetToken).toHaveBeenCalledTimes(1);
    expect(mockSetToken).toHaveBeenCalledWith('mock-jwt-token-123');

    // Verify success message is displayed
    expect(screen.getByText(/success! redirecting.../i)).toBeInTheDocument();
  });

  it('handles failed login', async () => {
    // Mock a failed axios response for login
    axios.post.mockRejectedValueOnce({ response: { data: { msg: 'Invalid Credentials' } } });
    const user = userEvent.setup();

    render(<Auth setToken={mockSetToken} />);

    await user.type(screen.getByLabelText(/username:/i), 'wronguser');
    await user.type(screen.getByLabelText(/password:/i), 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    // Verify setToken was NOT called
    expect(mockSetToken).not.toHaveBeenCalled();

    // Verify error message is displayed
    expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
  });

  it('handles successful registration', async () => {
    axios.post.mockResolvedValueOnce({ data: { token: 'mock-jwt-token-reg', msg: 'User registered successfully' } });
    const user = userEvent.setup();

    render(<Auth setToken={mockSetToken} />);
    fireEvent.click(screen.getByText(/register/i)); // Switch to register form

    await user.type(screen.getByLabelText(/username:/i), 'newregisteruser');
    await user.type(screen.getByLabelText(/password:/i), 'registerpass');
    fireEvent.selectOptions(screen.getByLabelText(/role:/i), 'user'); // Select user role

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/register', {
        username: 'newregisteruser',
        password: 'registerpass',
        role: 'user',
      });
    });

    expect(mockSetToken).toHaveBeenCalledWith('mock-jwt-token-reg');
    expect(screen.getByText(/registration successful! redirecting.../i)).toBeInTheDocument();
  });

  it('handles failed registration', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { msg: 'User already exists' } } });
    const user = userEvent.setup();

    render(<Auth setToken={mockSetToken} />);
    fireEvent.click(screen.getByText(/register/i));

    await user.type(screen.getByLabelText(/username:/i), 'existinguser');
    await user.type(screen.getByLabelText(/password:/i), 'somepass');
    fireEvent.selectOptions(screen.getByLabelText(/role:/i), 'user');

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledTimes(1);
    });

    expect(mockSetToken).not.toHaveBeenCalled();
    expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
  });
});