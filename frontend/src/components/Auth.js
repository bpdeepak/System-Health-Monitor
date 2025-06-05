// frontend/src/components/Auth.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default role for registration
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // Only need login from context here
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin ? { username, password } : { username, password, role };

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          login(data.token, data.user.role); // Use the login function from context
          setMessage('Success! Redirecting...');
          // Redirect to dashboard or appropriate page after successful login
          navigate('/dashboard');
        } else {
          setMessage(data.msg || 'Registration successful! You can now log in.');
          setIsLogin(true); // Switch to login form after successful registration
        }
      } else {
        setError(data.msg || `Failed to ${isLogin ? 'login' : 'register'}.`);
      }
    } catch (err) {
      console.error(`Error during ${isLogin ? 'login' : 'registration'}:`, err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form className="auth-form" onSubmit={handleAuth}>
        <div className="form-group">
          <label htmlFor="username">Username:</label> {/* Added htmlFor */}
          <input
            type="text"
            id="username" // Added id
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-label="Username" // Added for better accessibility
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label> {/* Added htmlFor */}
          <input
            type="password"
            id="password" // Added id
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password" // Added for better accessibility
          />
        </div>
        {!isLogin && (
          <div className="form-group">
            <label htmlFor="role">Role:</label> {/* Added htmlFor */}
            <select
              id="role" // Added id
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Role" // Added for better accessibility
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
        </button>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <p>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span className="link-style" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Register here' : 'Login here'}
        </span>
      </p>
    </div>
  );
}

export default Auth;