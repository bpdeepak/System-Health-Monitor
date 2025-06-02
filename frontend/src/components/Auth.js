// frontend/src/components/Auth.js (assuming the relevant JSX)

import React, { useState } from 'react';
import axios from 'axios';

function Auth({ setToken }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default role
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    try {
      let response;
      if (isRegister) {
        response = await axios.post('http://localhost:5000/api/auth/register', { username, password, role });
        setMessage('Registration successful! Redirecting...');
      } else {
        response = await axios.post('http://localhost:5000/api/auth/login', { username, password });
        setMessage('Success! Redirecting...');
      }
      setToken(response.data.token);
      // In a real app, you'd redirect here, e.g., using react-router-dom
      // setTimeout(() => { window.location.href = '/dashboard'; }, 1000);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.msg) {
        setMessage(`${isRegister ? 'Registration' : 'Authentication'} failed: ${error.response.data.msg}`);
      } else {
        setMessage(`${isRegister ? 'Registration' : 'Authentication'} failed. Please try again.`);
      }
      setToken(null); // Clear token on failure
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center' }}>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          {/* Add htmlFor and id for accessibility */}
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username" // ADD THIS LINE
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          {/* Add htmlFor and id for accessibility */}
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password" // ADD THIS LINE
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        {isRegister && (
          <div style={{ marginBottom: '15px' }}>
            {/* Add htmlFor and id for accessibility */}
            <label htmlFor="role">Role:</label>
            <select
              id="role" // ADD THIS LINE
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        <button
          type="submit"
          style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        {isRegister ? "Already have an account?" : "Don't have an account?"}{' '}
        <span
          onClick={() => setIsRegister(!isRegister)}
          style={{ color: '#007bff', cursor: 'pointer' }}
        >
          {isRegister ? 'Login' : 'Register'}
        </span>
      </p>
      {message && <p style={{ textAlign: 'center', color: message.includes('failed') ? 'red' : 'green' }}>{message}</p>}
    </div>
  );
}

export default Auth;