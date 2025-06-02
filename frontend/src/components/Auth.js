// frontend/src/components/Auth.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default role for registration
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login } = useAuth(); // Use the login function from AuthContext
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let response;
      if (isRegister) {
        response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role }),
        });
        const data = await response.json();
        if (response.ok) {
          setSuccess(data.msg || 'Registration successful! You can now log in.');
          setIsRegister(false); // Switch to login form
          setUsername(''); // Clear form fields
          setPassword('');
          setRole('user'); // Reset role
        } else {
          setError(data.msg || (data.errors && data.errors.length > 0 ? data.errors.join(', ') : 'Registration failed'));
        }
      } else { // Login
        response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
          login(data.token, data.user ? data.user.role : 'user'); // Use login from context
          navigate('/dashboard');
        } else {
          setError(data.msg || 'Login failed');
        }
      }
    } catch (err) {
      console.error(`${isRegister ? 'Registration' : 'Login'} error:`, err);
      setError(`An error occurred during ${isRegister ? 'registration' : 'login'}. Please try again.`);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {isRegister && (
          <div className="form-group">
            <label>Role:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        <button type="submit" className="btn-primary">{isRegister ? 'Register' : 'Login'}</button>
      </form>
      <p>
        {isRegister ? (
          <>
            Already have an account? <span onClick={() => setIsRegister(false)} className="link-style">Login here</span>
          </>
        ) : (
          <>
            Don't have an account? <span onClick={() => setIsRegister(true)} className="link-style">Register here</span>
          </>
        )}
      </p>
    </div>
  );
};

export default Auth;