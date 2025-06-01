import React, { useState } from 'react';
    import axios from 'axios';

    function Auth({ setToken }) {
      const [isRegister, setIsRegister] = useState(false);
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [role, setRole] = useState('user'); // For registration
      const [message, setMessage] = useState('');

      const handleSubmit = async (e) => {
        e.preventDefault();
        try {
          const url = isRegister ? 'http://localhost:5000/api/auth/register' : 'http://localhost:5000/api/auth/login';
          const payload = isRegister ? { username, password, role } : { username, password };
          const response = await axios.post(url, payload);
          setToken(response.data.token);
          setMessage('Success! Redirecting...');
          // Redirect or update UI to show dashboard
        } catch (err) {
          setMessage(err.response?.data?.msg || 'Authentication failed');
        }
      };

      return (
        <div style={{ maxWidth: 400, margin: '50px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
          <h2 style={{ textAlign: 'center' }}>{isRegister ? 'Register' : 'Login'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 15 }}>
              <label>Username:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 5 }}
              />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 5 }}
              />
            </div>
            {isRegister && (
              <div style={{ marginBottom: 15 }}>
                <label>Role:</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 5 }}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
            <button type="submit" style={{ width: '100%', padding: 10, backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
              {isRegister ? 'Register' : 'Login'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 15 }}>
            {isRegister ? 'Already have an account?' : 'Don\'t have an account?'}{' '}
            <span onClick={() => setIsRegister(!isRegister)} style={{ color: '#007bff', cursor: 'pointer' }}>
              {isRegister ? 'Login' : 'Register'}
            </span>
          </p>
          {message && <p style={{ textAlign: 'center', color: message.includes('Success') ? 'green' : 'red', marginTop: 10 }}>{message}</p>}
        </div>
      );
    }

    export default Auth;