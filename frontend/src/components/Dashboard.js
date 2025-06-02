// frontend/src/components/Dashboard.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function Dashboard() {
  const { isAuthenticated, logout } = useAuth();
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
      logout();
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
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('An error occurred while fetching metrics.');
    } finally {
      setLoading(false);
    }
  }, [logout, navigate, selectedHostname, timeRange, customStartDate, customEndDate]);


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
    if (isAuthenticated) {
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
  }, [isAuthenticated, fetchMetrics, fetchLatestMetrics, fetchHostnames]);

  // Data preparation for charts
  const chartData = useMemo(() => {
    const grouped = metrics.reduce((acc, metric) => {
      const hostname = metric.hostname || 'unknown';
      if (!acc[hostname]) {
        acc[hostname] = [];
      }
      acc[hostname].push({
        ...metric,
        timestamp: new Date(metric.timestamp).toLocaleString(),
        cpuUsage: metric.cpu,
        memoryUsage: metric.memory,
        diskUsage: metric.disk
      });
      return acc;
    }, {});

    Object.keys(grouped).forEach(hostname => {
      grouped[hostname].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });

    if (selectedHostname === 'all' && Object.keys(grouped).length > 0) {
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

  const latestMetricsDisplay = useMemo(() => {
    if (!Array.isArray(latestMetrics)) {
      console.warn('latestMetrics is not an array:', latestMetrics);
      return [];
    }

    return latestMetrics.map(metric => {
      if (!metric) {
        console.warn('Found an undefined or null metric in latestMetrics array. Skipping.');
        return null;
      }

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
    }).filter(Boolean);
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
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`cpu-${hostname}`}
                    type="monotone"
                    dataKey="cpuUsage"
                    name={`${hostname} CPU`}
                    stroke={`hsl(${index * 137}, 70%, 50%)`}
                    fill={`hsl(${index * 137}, 70%, 50%)`}
                    fillOpacity={0.3}
                    dot={false}
                    data={metrics.filter(m => m.hostname === hostname).map(m => ({
                      ...m,
                      timestamp: new Date(m.timestamp).toLocaleString(),
                      cpuUsage: m.cpu,
                    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
                  />
                ))
              ) : (
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

export default Dashboard;