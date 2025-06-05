import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../context/AuthContext'; // Import useAuth

// --- Define a consistent color palette for charts ---
const CHART_LINE_COLORS = [
  '#3498db', // Accent blue
  '#2ecc71', // Success green
  '#e74c3c', // Danger red
  '#f39c12', // Warning orange
  '#9b59b6', // Amethyst purple
  '#1abc9c', // Turquoise
  '#f1c40f', // Sunflower yellow
  '#34495e', // Primary dark blue-grey
  '#7f8c8d', // Wet asphalt grey
  '#d35400'  // Pumpkin orange
];

// Helper function to get a color from the palette
const getChartColor = (index) => CHART_LINE_COLORS[index % CHART_LINE_COLORS.length];
// --- END NEW ---

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
    } else if (timeRange !== 'custom') { // Only append timeRange if not custom
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
        // Ensure 'all' option is always present and at the beginning
        setAvailableHostnames(['all', ...data.filter(host => host !== 'all')]);
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
    // If 'all' is selected, we need to process data for all hosts.
    // Recharts expects an array of objects for the `data` prop.
    // When displaying multiple lines, each line's data should be part of these objects.
    // For "all hosts", we'll return a flat array where each object contains
    // the metric for a specific timestamp and hostname, allowing Recharts
    // to draw separate lines based on the `dataKey` and `name` in Area/Line.
    if (selectedHostname === 'all') {
      const allMetricsProcessed = metrics.map(metric => ({
        ...metric,
        timestamp: new Date(metric.timestamp).toLocaleString(),
        cpuUsage: metric.cpu,
        memoryUsage: metric.memory,
        diskUsage: metric.disk
      }));
      // Sort by timestamp to ensure proper chart rendering
      return allMetricsProcessed.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else {
      // If a specific hostname is selected, filter and format
      return metrics
        .filter(metric => metric.hostname === selectedHostname)
        .map(metric => ({
          ...metric,
          timestamp: new Date(metric.timestamp).toLocaleString(),
          cpuUsage: metric.cpu,
          memoryUsage: metric.memory,
          diskUsage: metric.disk
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
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
    // Apply styling to loading container
    return <div className="loading-container">Loading dashboard data...</div>;
  }

  if (error) {
    // Apply styling to error container
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>System Monitoring Dashboard</h2>
        {/* --- NEW: Add 'card' class to filters div for consistent styling --- */}
        <div className="filters card">
          <div className="filter-group"> {/* Wrap each filter in a group for better styling */}
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
          </div>

          <div className="filter-group"> {/* Wrap each filter in a group for better styling */}
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
          </div>

          {timeRange === 'custom' && (
            <>
              <div className="filter-group">
                <label htmlFor="start-date">Start Date:</label>
                <input
                  type="datetime-local"
                  id="start-date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label htmlFor="end-date">End Date:</label>
                <input
                  type="datetime-local"
                  id="end-date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
          <button onClick={fetchMetrics} className="btn-primary">Apply Filters</button>
        </div>
      </div>

      <div className="latest-metrics-summary card"> {/* Already has 'card' */}
        <h3>Latest System Metrics Summary</h3>
        {latestMetricsDisplay.length > 0 ? (
          <table className="latest-metrics-table"> {/* NEW: Add class for table styling */}
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
                  {/* Apply .metric-value and status classes based on thresholds */}
                  <td className={`metric-value ${metric.cpuUsage > 80 ? 'critical' : metric.cpuUsage > 60 ? 'warning' : 'normal'}`}>{metric.cpuUsage.toFixed(2)}</td>
                  <td className={`metric-value ${metric.memoryUsage > 80 ? 'critical' : metric.memoryUsage > 60 ? 'warning' : 'normal'}`}>{metric.memoryUsage.toFixed(2)}</td>
                  <td className={`metric-value ${metric.diskUsage > 80 ? 'critical' : metric.diskUsage > 60 ? 'warning' : 'normal'}`}>{metric.diskUsage.toFixed(2)}</td>
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

      <div className="charts-container"> {/* NEW: Consider grid layout for charts if needed */}
        <div className="chart-card card"> {/* Already has 'card' */}
          <h3>CPU Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /> {/* Use border variable */}
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" /> {/* Use text variable */}
              <YAxis domain={[0, 100]} label={{ value: 'CPU (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" /> {/* Use text variable */}
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                // When 'all' is selected, render an Area for each unique hostname.
                // The dataKey should remain 'cpuUsage' as it's consistent across all objects in chartData.
                // The 'name' prop of Area will be used in the legend.
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`cpu-${hostname}`}
                    type="monotone"
                    dataKey="cpuUsage"
                    name={`${hostname} CPU`}
                    stroke={getChartColor(index)} // Use new color palette
                    fill={getChartColor(index)}    // Use new color palette
                    fillOpacity={0.3}
                    dot={false}
                    // No need to pass data prop here when chartData already contains all data
                  />
                ))
              ) : (
                // When a specific hostname is selected, render a single Area.
                <Area type="monotone" dataKey="cpuUsage" stroke={CHART_LINE_COLORS[0]} fill={CHART_LINE_COLORS[0]} fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card"> {/* Already has 'card' */}
          <h3>Memory Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /> {/* Use border variable */}
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" /> {/* Use text variable */}
              <YAxis domain={[0, 100]} label={{ value: 'Memory (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" /> {/* Use text variable */}
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`mem-${hostname}`}
                    type="monotone"
                    dataKey="memoryUsage"
                    name={`${hostname} Memory`}
                    stroke={getChartColor(index + 1)} // Use new color palette (offset by 1 to get a different color)
                    fill={getChartColor(index + 1)}
                    fillOpacity={0.3}
                    dot={false}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="memoryUsage" stroke={CHART_LINE_COLORS[1]} fill={CHART_LINE_COLORS[1]} fillOpacity={0.3} dot={false} /> 
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card"> {/* Already has 'card' */}
          <h3>Disk Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /> {/* Use border variable */}
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" /> {/* Use text variable */}
              <YAxis domain={[0, 100]} label={{ value: 'Disk (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" /> {/* Use text variable */}
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`disk-${hostname}`}
                    type="monotone"
                    dataKey="diskUsage"
                    name={`${hostname} Disk`}
                    stroke={getChartColor(index + 2)} // Use new color palette (offset by 2)
                    fill={getChartColor(index + 2)}
                    fillOpacity={0.3}
                    dot={false}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="diskUsage" stroke={CHART_LINE_COLORS[3]} fill={CHART_LINE_COLORS[3]} fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;