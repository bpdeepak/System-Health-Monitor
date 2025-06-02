// frontend/src/components/Auth.js
import React, { useState } from 'react'; // Ensure useState is imported
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming this provides setToken

const Auth = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default role for registration
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState(''); // For success messages
  const [error, setError] = useState('');   // For error messages

  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous success messages
    setError('');   // Clear previous error messages

    try {
      let response;
      if (isRegister) {
        response = await axios.post('http://localhost:5000/api/auth/register', { username, password, role });
        // For successful registration:
        // 1. Set a success message for the user.
        // 2. Do NOT set a token unless registration automatically logs them in (which your test implies it doesn't).
        // 3. You might want to switch to the login form after successful registration.
        setMessage('User registered successfully'); // Test expects this
        setIsRegister(false); // Switch to login form
        setUsername(''); // Clear form fields
        setPassword('');
        setRole('user'); // Reset role
      } else { // This is a login attempt
        response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
        setToken(response.data.token); // ONLY set token on successful LOGIN
        setMessage('Success! Redirecting...'); // Test expects this
        setTimeout(() => { navigate('/'); }, 1000); // Navigate to dashboard after delay
      }
    } catch (err) { // Renamed error to err to avoid conflict with 'error' state
      // Set an error message based on API response or a generic one
      if (err.response && err.response.data && err.response.data.message) { // Backend often sends 'message'
        setError(err.response.data.message);
      } else if (err.response && err.response.data && err.response.data.msg) { // Fallback to 'msg'
        setError(err.response.data.msg);
      } else {
        setError(`${isRegister ? 'Registration' : 'Authentication'} failed. Please try again.`);
      }
      // IMPORTANT: Do NOT call setToken(null) here for failed attempts.
      // The test expects mockSetToken NOT to be called AT ALL on failure.
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center' }}>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="username">Username:</label>
          <input
            id="username" // Ensure id is present for accessibility and testing
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password">Password:</label>
          <input
            id="password" // Ensure id is present
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        {isRegister && (
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="role">Role:</label>
            <select
              id="role" // Ensure id is present
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        {/* Render success/error messages */}
        {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        {isRegister ? (
          <>
            Already have an account?{' '}
            <span onClick={() => setIsRegister(false)} style={{ color: '#007bff', cursor: 'pointer' }}>
              Login
            </span>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <span onClick={() => setIsRegister(true)} style={{ color: '#007bff', cursor: 'pointer' }}>
              Register
            </span>
          </>
        )}
      </p>
    </div>
  );
};

export default Auth;