// frontend/src/App.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import './App.css';

// Mock Auth Context - Replace with actual context/state management for real app
const AuthContext = React.createContext(null);

function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || null);

  const login = (token, role) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
    setUserRole(null);
  };

  return { isAuthenticated, userRole, login, logout };
}

// Private Route Component (similar to your authorize middleware)
const PrivateRoute = ({ children, roles }) => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate('/login');
    } else if (roles && !roles.includes(auth.userRole)) {
      navigate('/'); // Redirect to home or unauthorized page
      alert('Access Denied: You do not have the necessary permissions.');
    }
  }, [auth.isAuthenticated, auth.userRole, roles, navigate]);

  return auth.isAuthenticated && (roles ? roles.includes(auth.userRole) : true) ? children : null;
};

// Login Component
function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        auth.login(data.token, data.user ? data.user.role : 'user'); // Assuming role comes with user
        navigate('/dashboard');
      } else {
        setError(data.msg || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error-message">{error}</p>}
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
        <button type="submit" className="btn-primary">Login</button>
      </form>
      <p>Don't have an account? <Link to="/register">Register here</Link></p>
    </div>
  );
}

// Register Component
function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default role
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.msg || 'Registration successful! You can now log in.');
        navigate('/login'); // Redirect to login after successful registration
      } else {
        setError(data.msg || (data.errors && data.errors.length > 0 ? data.errors.join(', ') : 'Registration failed'));
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred during registration. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <h2>Register</h2>
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
        <div className="form-group">
          <label>Role:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Login here</Link></p>
    </div>
  );
}

// Dashboard Component
function Dashboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([]);
  const [latestMetrics, setLatestMetrics] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedHostname, setSelectedHostname] = useState('all');
  const [availableHostnames, setAvailableHostnames] = useState(['all']);
  const [timeRange, setTimeRange] = useState('24h'); // Default time range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated. Please log in.');
      auth.logout();
      navigate('/login');
      setLoading(false);
      return;
    }

    let url = `${process.env.REACT_APP_BACKEND_URL}/api/metrics`;
    const params = new URLSearchParams();

    if (selectedHostname && selectedHostname !== 'all') {
      params.append('hostname', selectedHostname);
    }

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      params.append('startDate', customStartDate);
      params.append('endDate', customEndDate);
    } else {
      params.append('timeRange', timeRange);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setMetrics(data);
      } else {
        setError(data.message || 'Failed to fetch metrics.');
        if (response.status === 401 || response.status === 403) {
          auth.logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('An error occurred while fetching metrics.');
    } finally {
      setLoading(false);
    }
  }, [auth, navigate, selectedHostname, timeRange, customStartDate, customEndDate]);


  const fetchLatestMetrics = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/metrics/latest`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setLatestMetrics(data);
      } else {
        console.error('Failed to fetch latest metrics:', data.message);
      }
    } catch (err) {
      console.error('Error fetching latest metrics:', err);
    }
  }, []);

  const fetchHostnames = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/hosts`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableHostnames(data);
      } else {
        console.error('Failed to fetch hostnames:', data.message);
      }
    } catch (err) {
      console.error('Error fetching hostnames:', err);
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchMetrics();
      fetchLatestMetrics();
      fetchHostnames();
      // Set up interval for refreshing metrics
      const intervalId = setInterval(() => {
        fetchMetrics();
        fetchLatestMetrics();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(intervalId); // Cleanup on component unmount
    }
  }, [auth.isAuthenticated, fetchMetrics, fetchLatestMetrics, fetchHostnames]);

  // Data preparation for charts
  const chartData = useMemo(() => {
    // Group metrics by hostname and sort by timestamp
    const grouped = metrics.reduce((acc, metric) => {
      const hostname = metric.hostname || 'unknown';
      if (!acc[hostname]) {
        acc[hostname] = [];
      }
      acc[hostname].push({
        ...metric,
        timestamp: new Date(metric.timestamp).toLocaleString(), // Format for display
        cpuUsage: metric.cpu,    // Standardize key names for Recharts
        memoryUsage: metric.memory,
        diskUsage: metric.disk
      });
      return acc;
    }, {});

    // Sort each host's metrics by timestamp
    Object.keys(grouped).forEach(hostname => {
      grouped[hostname].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });

    // If 'all' hostnames are selected, flatten the data for a single chart
    // Otherwise, return grouped data for individual host charts (or handle differently)
    if (selectedHostname === 'all' && Object.keys(grouped).length > 0) {
      // For 'all', we might want to show averages or combined data,
      // but for simplicity, let's just return the full, unsorted list of metrics.
      // This will plot all data points together.
      return metrics.map(metric => ({
        ...metric,
        timestamp: new Date(metric.timestamp).toLocaleString(),
        cpuUsage: metric.cpu,
        memoryUsage: metric.memory,
        diskUsage: metric.disk
      })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    return grouped[selectedHostname] || [];
  }, [metrics, selectedHostname]);

  // This part calculates average CPU, memory, disk for each hostname
  const latestMetricsDisplay = useMemo(() => {
    // Ensure latestMetrics is an array before mapping
    if (!Array.isArray(latestMetrics)) {
      console.warn('latestMetrics is not an array:', latestMetrics);
      return []; // Return empty array to prevent errors
    }

    return latestMetrics.map(metric => {
      // Check if the individual 'metric' object is defined and not null
      if (!metric) {
        console.warn('Found an undefined or null metric in latestMetrics array. Skipping.');
        return null; // Return null for invalid entries
      }

      // Use nullish coalescing (??) to provide a default value (0 or 'N/A')
      // if the property is null or undefined.
      const cpuUsage = metric.cpu ?? 0;
      const memoryUsage = metric.memory ?? 0;
      const diskUsage = metric.disk ?? 0;
      const uptime = metric.uptime ?? 0;
      const os = metric.os ?? 'N/A';
      const hostname = metric.hostname ?? 'N/A';

      return {
        hostname: hostname,
        cpuUsage: cpuUsage,
        memoryUsage: memoryUsage,
        diskUsage: diskUsage,
        uptime: uptime,
        os: os
      };
    }).filter(Boolean); // Filter out any null entries that resulted from undefined/null metrics
  }, [latestMetrics]);


  if (loading && metrics.length === 0) {
    return <div className="loading-container">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>System Monitoring Dashboard</h2>
        <div className="filters">
          <label htmlFor="hostname-select">Hostname:</label>
          <select
            id="hostname-select"
            value={selectedHostname}
            onChange={(e) => setSelectedHostname(e.target.value)}
          >
            {availableHostnames.map((host) => (
              <option key={host} value={host}>
                {host === 'all' ? 'All Hosts' : host}
              </option>
            ))}
          </select>

          <label htmlFor="time-range-select">Time Range:</label>
          <select
            id="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {timeRange === 'custom' && (
            <>
              <label htmlFor="start-date">Start Date:</label>
              <input
                type="datetime-local"
                id="start-date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <label htmlFor="end-date">End Date:</label>
              <input
                type="datetime-local"
                id="end-date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </>
          )}
          <button onClick={fetchMetrics} className="btn-primary">Apply Filters</button>
        </div>
      </div>

      <div className="latest-metrics-summary card">
        <h3>Latest System Metrics Summary</h3>
        {latestMetricsDisplay.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>CPU Usage (%)</th>
                <th>Memory Usage (%)</th>
                <th>Disk Usage (%)</th>
                <th>Uptime (s)</th>
                <th>OS</th>
              </tr>
            </thead>
            <tbody>
              {latestMetricsDisplay.map((metric, index) => (
                <tr key={index}>
                  <td>{metric.hostname}</td>
                  <td className={metric.cpuUsage > 80 ? 'critical' : ''}>{metric.cpuUsage.toFixed(2)}</td>
                  <td className={metric.memoryUsage > 80 ? 'critical' : ''}>{metric.memoryUsage.toFixed(2)}</td>
                  <td className={metric.diskUsage > 80 ? 'critical' : ''}>{metric.diskUsage.toFixed(2)}</td>
                  <td>{metric.uptime}</td>
                  <td>{metric.os}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No latest metrics available.</p>
        )}
      </div>

      <div className="charts-container">
        <div className="chart-card card">
          <h3>CPU Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} label={{ value: 'CPU (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                // When 'all' is selected, plot lines for each unique hostname dynamically
                // This requires iterating over all unique hostnames present in chartData
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`cpu-${hostname}`}
                    type="monotone"
                    dataKey="cpuUsage"
                    name={`${hostname} CPU`}
                    stroke={`hsl(${index * 137}, 70%, 50%)`} // Dynamic color
                    fill={`hsl(${index * 137}, 70%, 50%)`}
                    fillOpacity={0.3}
                    dot={false}
                    // Filter data for this specific hostname
                    data={metrics.filter(m => m.hostname === hostname).map(m => ({
                      ...m,
                      timestamp: new Date(m.timestamp).toLocaleString(),
                      cpuUsage: m.cpu,
                    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
                  />
                ))
              ) : (
                // When a specific hostname is selected, plot a single line
                <Area type="monotone" dataKey="cpuUsage" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Memory Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} label={{ value: 'Memory (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`mem-${hostname}`}
                    type="monotone"
                    dataKey="memoryUsage"
                    name={`${hostname} Memory`}
                    stroke={`hsl(${index * 137 + 50}, 70%, 50%)`}
                    fill={`hsl(${index * 137 + 50}, 70%, 50%)`}
                    fillOpacity={0.3}
                    dot={false}
                    data={metrics.filter(m => m.hostname === hostname).map(m => ({
                      ...m,
                      timestamp: new Date(m.timestamp).toLocaleString(),
                      memoryUsage: m.memory,
                    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="memoryUsage" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Disk Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} label={{ value: 'Disk (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`disk-${hostname}`}
                    type="monotone"
                    dataKey="diskUsage"
                    name={`${hostname} Disk`}
                    stroke={`hsl(${index * 137 + 100}, 70%, 50%)`}
                    fill={`hsl(${index * 137 + 100}, 70%, 50%)`}
                    fillOpacity={0.3}
                    dot={false}
                    data={metrics.filter(m => m.hostname === hostname).map(m => ({
                      ...m,
                      timestamp: new Date(m.timestamp).toLocaleString(),
                      diskUsage: m.disk,
                    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="diskUsage" stroke="#ffc658" fill="#ffc658" fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Reports Component
function Reports() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [selectedHostname, setSelectedHostname] = useState('all');
  const [availableHostnames, setAvailableHostnames] = useState(['all']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchHostnames = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/hosts`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableHostnames(data);
      } else {
        console.error('Failed to fetch hostnames:', data.message);
      }
    } catch (err) {
      console.error('Error fetching hostnames:', err);
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      fetchHostnames();
    }
  }, [auth.isAuthenticated, fetchHostnames]);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated. Please log in.');
      auth.logout();
      navigate('/login');
      setLoading(false);
      return;
    }

    let url = `${process.env.REACT_APP_BACKEND_URL}/api/reports/generate?`;
    const params = new URLSearchParams();

    if (selectedHostname && selectedHostname !== 'all') {
      params.append('hostname', selectedHostname);
    }
    if (startDate) {
      params.append('startDate', startDate);
    }
    if (endDate) {
      params.append('endDate', endDate);
    }

    url += params.toString();

    try {
      const response = await fetch(url, {
        headers: {
          'x-auth-token': token,
          'Accept': 'application/pdf' // Request PDF
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system_health_report_${selectedHostname}_${startDate}_${endDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        setError(errorData.msg || 'Failed to generate report.');
        if (response.status === 401 || response.status === 403) {
          auth.logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error generating report:', err);
      setError('An error occurred while generating the report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-container">
      <h2>Generate System Health Report</h2>
      {error && <p className="error-message">{error}</p>}
      <div className="filters">
        <label htmlFor="hostname-select">Hostname:</label>
        <select
          id="hostname-select"
          value={selectedHostname}
          onChange={(e) => setSelectedHostname(e.target.value)}
        >
          {availableHostnames.map((host) => (
            <option key={host} value={host}>
              {host === 'all' ? 'All Hosts' : host}
            </option>
          ))}
        </select>

        <label htmlFor="start-date">Start Date:</label>
        <input
          type="datetime-local"
          id="start-date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <label htmlFor="end-date">End Date:</label>
        <input
          type="datetime-local"
          id="end-date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button onClick={handleGenerateReport} disabled={loading} className="btn-primary">
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </div>
  );
}

// Navbar Component
function Navbar() {
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">System Monitor</Link>
      </div>
      <ul className="navbar-nav">
        {auth.isAuthenticated ? (
          <>
            <li className="nav-item">
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link to="/reports">Reports</Link>
            </li>
            {auth.userRole === 'admin' && (
              <li className="nav-item">
                <Link to="/admin">Admin Panel</Link>
              </li>
            )}
            <li className="nav-item">
              <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li className="nav-item">
              <Link to="/login">Login</Link>
            </li>
            <li className="nav-item">
              <Link to="/register">Register</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

// Admin Panel Component (Placeholder)
function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      auth.logout();
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-panel`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        // Assuming your /api/admin-panel returns user list, otherwise adjust
        // For now, let's just log and show a dummy message if not implemented
        setMessage(data.msg || 'Admin data fetched (users list not implemented yet)');
        setUsers([]); // Clear any previous dummy data
      } else {
        setMessage(data.msg || 'Failed to fetch admin data.');
        if (response.status === 401 || response.status === 403) {
          auth.logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setMessage('An error occurred while fetching admin data.');
    }
  }, [auth, navigate]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.userRole === 'admin') {
      fetchUsers();
    }
  }, [auth.isAuthenticated, auth.userRole, fetchUsers]);

  return (
    <div className="admin-panel-container">
      <h2>Admin Panel</h2>
      {message && <p>{message}</p>}
      {/* Admin functionalities like user management can go here */}
      {users.length > 0 ? (
        <ul>
          {users.map(user => (
            <li key={user._id}>{user.username} ({user.role})</li>
          ))}
        </ul>
      ) : (
        <p>No user data available (or not implemented).</p>
      )}
    </div>
  );
}

// Main App Component
function App() {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <Router>
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminPanel /></PrivateRoute>} />
            <Route path="/" element={auth.isAuthenticated ? <Dashboard /> : <LoginPage />} />
            {/* Redirect any other path to dashboard if authenticated, or login if not */}
            <Route path="*" element={auth.isAuthenticated ? <Dashboard /> : <LoginPage />} />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;