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
  const [selectedDeviceName, setSelectedDeviceName] = useState('all'); // Changed from selectedHostname
  const [availableDeviceNames, setAvailableDeviceNames] = useState(['all']); // Changed from availableHostnames
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

    if (selectedDeviceName && selectedDeviceName !== 'all') {
      params.append('deviceName', selectedDeviceName);
    }

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      params.append('startDate', customStartDate);
      params.append('endDate', customEndDate);
    } else if (timeRange !== 'custom') {
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
  }, [logout, navigate, selectedDeviceName, timeRange, customStartDate, customEndDate]);

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

  const fetchDeviceNames = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/devices`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableDeviceNames(['all', ...data.filter(name => name !== 'all')]);
      } else {
        console.error('Failed to fetch device names:', data.message);
      }
    } catch (err) {
      console.error('Error fetching device names:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
      fetchLatestMetrics();
      fetchDeviceNames();
      // Set up interval for refreshing metrics
      const intervalId = setInterval(() => {
        fetchMetrics();
        fetchLatestMetrics();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(intervalId); // Cleanup on component unmount
    }
  }, [isAuthenticated, fetchMetrics, fetchLatestMetrics, fetchDeviceNames]);

  // Data preparation for charts
  const chartData = useMemo(() => {
    if (!Array.isArray(metrics)) {
      console.warn('Metrics is not an array:', metrics);
      return [];
    }

    // Filter by selected deviceName if not 'all'
    const filteredMetrics = selectedDeviceName === 'all'
      ? metrics
      : metrics.filter(metric => metric.deviceName === selectedDeviceName);

    // Format data for Recharts
    const processedData = filteredMetrics.map(metric => ({
      ...metric,
      timestamp: new Date(metric.timestamp).toLocaleString(),
      cpuUsage: metric.cpuUsage,
      memoryUsage: metric.memoryUsage,
      diskUsage: metric.diskUsage
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return processedData;
  }, [metrics, selectedDeviceName]);

  // --- NEW: Dynamic Y-Axis Domain Calculation ---
  const getYAxisDomain = useCallback((dataKey) => {
    if (!chartData || chartData.length === 0) {
      return [0, 100]; // Default domain if no data
    }
    const maxVal = Math.max(...chartData.map(d => d[dataKey] || 0)); // Get max value for the data key

    if (maxVal < 10) {
      return [0, 15]; // If max is very low, set a slightly higher upper bound
    } else if (maxVal < 50) {
      return [0, Math.min(100, Math.ceil(maxVal / 5) * 5 + 5)]; // Round up to nearest 5, add a buffer, max 100
    } else {
      return [0, 100]; // If high usage, keep it 0-100%
    }
  }, [chartData]);

  const cpuDomain = useMemo(() => getYAxisDomain('cpuUsage'), [getYAxisDomain]);
  const memoryDomain = useMemo(() => getYAxisDomain('memoryUsage'), [getYAxisDomain]);
  const diskDomain = useMemo(() => getYAxisDomain('diskUsage'), [getYAxisDomain]);
  // --- END NEW: Dynamic Y-Axis Domain Calculation ---


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

      const cpuUsage = metric.cpuUsage ?? 0;
      const memoryUsage = metric.memoryUsage ?? 0;
      const diskUsage = metric.diskUsage ?? 0;
      const uptime = metric.uptime ?? 0;
      const os = metric.os ?? 'N/A';
      const deviceName = metric.deviceName ?? 'N/A';

      return {
        deviceName: deviceName,
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
        <div className="filters card">
          <div className="filter-group">
            <label htmlFor="device-select">Device Name:</label>
            <select
              id="device-select"
              value={selectedDeviceName}
              onChange={(e) => setSelectedDeviceName(e.target.value)}
            >
              {availableDeviceNames.map((name) => (
                <option key={name} value={name}>
                  {name === 'all' ? 'All Devices' : name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
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

      <div className="latest-metrics-summary card">
        <h3>Latest System Metrics Summary</h3>
        {latestMetricsDisplay.length > 0 ? (
          <table className="latest-metrics-table">
            <thead>
              <tr>
                <th>Device Name</th>
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
                  <td>{metric.deviceName}</td>
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
          <p>No latest metrics available. Ensure agents are running and devices are added.</p>
        )}
      </div>

      <div className="charts-container">
        <div className="chart-card card">
          <h3>CPU Usage Over Time ({selectedDeviceName === 'all' ? 'All Devices' : selectedDeviceName})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" />
              {/* --- NEW: Dynamic YAxis domain for CPU --- */}
              <YAxis domain={cpuDomain} label={{ value: 'CPU (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" />
              <Tooltip />
              <Legend />
              {selectedDeviceName === 'all' ? (
                [...new Set(metrics.map(m => m.deviceName))].map((deviceName, index) => (
                  <Area
                    key={`cpu-${deviceName}`}
                    type="monotone"
                    dataKey="cpuUsage"
                    name={`${deviceName} CPU`}
                    stroke={getChartColor(index)}
                    fill={getChartColor(index)}
                    fillOpacity={0.3}
                    dot={false}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="cpuUsage" stroke={CHART_LINE_COLORS[0]} fill={CHART_LINE_COLORS[0]} fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Memory Usage Over Time ({selectedDeviceName === 'all' ? 'All Devices' : selectedDeviceName})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" />
              {/* --- NEW: Dynamic YAxis domain for Memory --- */}
              <YAxis domain={memoryDomain} label={{ value: 'Memory (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" />
              <Tooltip />
              <Legend />
              {selectedDeviceName === 'all' ? (
                [...new Set(metrics.map(m => m.deviceName))].map((deviceName, index) => (
                  <Area
                    key={`mem-${deviceName}`}
                    type="monotone"
                    dataKey="memoryUsage"
                    name={`${deviceName} Memory`}
                    stroke={getChartColor(index + 1)}
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

        <div className="chart-card card">
          <h3>Disk Usage Over Time ({selectedDeviceName === 'all' ? 'All Devices' : selectedDeviceName})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" />
              {/* --- NEW: Dynamic YAxis domain for Disk --- */}
              <YAxis domain={diskDomain} label={{ value: 'Disk (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" />
              <Tooltip />
              <Legend />
              {selectedDeviceName === 'all' ? (
                [...new Set(metrics.map(m => m.deviceName))].map((deviceName, index) => (
                  <Area
                    key={`disk-${deviceName}`}
                    type="monotone"
                    dataKey="diskUsage"
                    name={`${deviceName} Disk`}
                    stroke={getChartColor(index + 2)}
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