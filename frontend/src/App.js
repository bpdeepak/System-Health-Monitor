// frontend/src/App.js

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Import your authentication and report generator components
import Auth from './components/Auth';
import ReportGenerator from './components/ReportGenerator';
// --- NEW IMPORTS FOR REACT ROUTER AND PRIVATE ROUTE ---
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Make sure this is imported if useAuth is used directly in App
import PrivateRoute from './components/PrivateRoute'; // Import the new PrivateRoute component
// --- END NEW IMPORTS ---

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// --- Utility Functions (Keep as is or refine) ---
function formatUptime(seconds) {
  if (seconds === undefined || seconds === null) return 'N/A';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

// Styles (Ensure these are correctly applied, or move to App.css)
const styles = {
    container: {
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: '#f4f7f6',
        minHeight: '100vh',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    heading: {
        margin: 0,
        fontSize: '2em',
    },
    logoutButton: {
        padding: '10px 20px',
        fontSize: '1em',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
    },
    filtersContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        marginBottom: '20px',
        alignItems: 'center',
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    filterLabel: {
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#333',
    },
    input: {
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        fontSize: '1em',
        minWidth: '150px',
    },
    select: {
        padding: '10px 15px',
        borderRadius: '8px',
        border: '1px solid #ccc',
        backgroundColor: 'white',
        fontSize: '1em',
        minWidth: '150px',
    },
    loadingSpinner: {
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
        margin: '50px auto',
    },
    errorMessage: {
        color: '#dc3545',
        textAlign: 'center',
        fontSize: '1.1em',
        padding: '15px',
        backgroundColor: '#ffe3e6',
        borderRadius: '8px',
        border: '1px solid #dc3545',
    },
    noDataMessage: {
        color: '#6c757d',
        textAlign: 'center',
        fontSize: '1.1em',
        padding: '15px',
        backgroundColor: '#e9ecef',
        borderRadius: '8px',
    },
    chartContainer: {
      marginBottom: '20px',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    },
    metricCardsContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginTop: '20px',
    },
    metricCard: {
        backgroundColor: '#e9f7ef',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        textAlign: 'center',
    },
    metricName: {
        fontSize: '1.1em',
        fontWeight: 'bold',
        color: '#28a745',
        marginBottom: '5px',
    },
    metricValue: {
        fontSize: '1.8em',
        color: '#333',
        fontWeight: 'bold',
    },
};

// Keyframe for spinner animation (add to your global CSS or directly in JS if using styled-components)
// This should ideally be in your `App.css` or `index.css`
/*
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/


function App() {
  const { token, setToken } = useAuth(); // Get token and setToken from context

  const [hostnames, setHostnames] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHostname, setSelectedHostname] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetric, setSelectedMetric] = useState('cpuUsage'); // Default selected metric
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    // Helper to get labels based on timeRange
    const getLabels = (data) => {
        if (!data || data.length === 0) return [];
        return data.map(m => new Date(m.timestamp));
    };

    const getMetricData = (data, metricKey) => {
      if (!data || data.length === 0) return [];
      return data.map(m => m.metrics[metricKey]);
    };

    const labels = getLabels(metrics);
    const data = getMetricData(metrics, selectedMetric);

    return {
      labels: labels,
      datasets: [
        {
          label: selectedMetric === 'cpuUsage' ? 'CPU Usage (%)' :
                 selectedMetric === 'memoryUsage' ? 'Memory Usage (MB)' :
                 selectedMetric === 'diskUsage' ? 'Disk Usage (%)' :
                 selectedMetric === 'networkIo' ? 'Network I/O (MB/s)' : 'Value',
          data: data,
          borderColor: selectedMetric === 'cpuUsage' ? 'rgba(75, 192, 192, 1)' :
                       selectedMetric === 'memoryUsage' ? 'rgba(153, 102, 255, 1)' :
                       selectedMetric === 'diskUsage' ? 'rgba(255, 159, 64, 1)' :
                       selectedMetric === 'networkIo' ? 'rgba(54, 162, 235, 1)' : 'rgba(201, 203, 207, 1)',
          backgroundColor: selectedMetric === 'cpuUsage' ? 'rgba(75, 192, 192, 0.2)' :
                           selectedMetric === 'memoryUsage' ? 'rgba(153, 102, 255, 0.2)' :
                           selectedMetric === 'diskUsage' ? 'rgba(255, 159, 64, 0.2)' :
                           selectedMetric === 'networkIo' ? 'rgba(54, 162, 235, 0.2)' : 'rgba(201, 203, 207, 0.2)',
          fill: false,
          tension: 0.1,
        },
      ],
    };
  }, [metrics, selectedMetric]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'System Metrics Over Time',
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeRange === '24h' || timeRange === '7d' ? 'hour' : 'day', // Adjust unit based on range
          tooltipFormat: 'MMM d, HH:mm',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d',
          },
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: selectedMetric === 'cpuUsage' ? 'Percentage (%)' :
                selectedMetric === 'memoryUsage' ? 'Memory (MB)' :
                selectedMetric === 'diskUsage' ? 'Percentage (%)' :
                selectedMetric === 'networkIo' ? 'MB/s' : 'Value',
        },
      },
    },
  }), [selectedMetric, timeRange]);


  // Function to fetch metrics
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        hostname: selectedHostname === 'all' ? undefined : selectedHostname,
        timeRange: (startDate && endDate) ? undefined : timeRange, // Use timeRange only if no specific dates
        startDate: startDate ? startDate.toISOString() : undefined,
        endDate: endDate ? endDate.toISOString() : undefined,
      };

      // Ensure axios.get uses backticks for template literals here as well
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/metrics`, {
        headers: {
          'x-auth-token': token,
        },
        params: params,
      });
      setMetrics(response.data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err.response?.data?.msg || 'Failed to fetch metrics. Please try again.');
      setMetrics([]); // Clear previous metrics on error
    } finally {
      setLoading(false);
    }
  }, [token, selectedHostname, timeRange, startDate, endDate]); // Dependency array

  useEffect(() => {
    if (token) { // Only fetch metrics if authenticated
      fetchMetrics();
      // Fetch hostnames if token is available
      axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/hosts`, {
        headers: { 'x-auth-token': token }
      }).then(response => {
        setHostnames(['all', ...response.data]);
      }).catch(err => console.error("Failed to fetch hostnames:", err));
    } else {
      // If token becomes null (e.g., on logout), clear data and hostnames
      setMetrics([]);
      setHostnames([]);
    }
  }, [token, fetchMetrics]); // Dependency array: re-run if token or fetchMetrics changes

  // Helper to calculate latest values
  const latestMetrics = useMemo(() => {
    if (!metrics || metrics.length === 0) return {};
    const latest = metrics[metrics.length - 1]?.metrics || {};
    return {
        cpuUsage: latest.cpuUsage ? `${latest.cpuUsage.toFixed(2)}%` : 'N/A',
        memoryUsage: latest.memoryUsage ? `${(latest.memoryUsage / (1024 * 1024)).toFixed(2)} MB` : 'N/A', // Convert bytes to MB
        diskUsage: latest.diskUsage ? `${latest.diskUsage.toFixed(2)}%` : 'N/A',
        networkIo: latest.networkIo ? `${(latest.networkIo / (1024 * 1024)).toFixed(2)} MB/s` : 'N/A', // Convert bytes/s to MB/s
        uptime: latest.uptime ? formatUptime(latest.uptime) : 'N/A',
    };
  }, [metrics]);

  return (
    <div style={styles.container}>
      <Routes>
        {/* Route for Login Page */}
        <Route path="/login" element={<Auth />} />

        {/* Redirect root ("/") to login if not authenticated, or to dashboard if authenticated */}
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              {/* Header with Logout Button */}
              <header style={styles.header}>
                <h1 style={styles.heading}>System Health Dashboard</h1>
                <button onClick={() => setToken(null)} style={styles.logoutButton}>Logout</button>
              </header>

              {/* Filters Section */}
              <div style={styles.filtersContainer}>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Hostname:</label>
                  <select
                    value={selectedHostname}
                    onChange={(e) => setSelectedHostname(e.target.value)}
                    style={styles.select}
                  >
                    {hostnames.map((hostname) => (
                      <option key={hostname} value={hostname}>
                        {hostname === 'all' ? 'All Hosts' : hostname}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Time Range:</label>
                  <select
                    value={timeRange}
                    onChange={(e) => { setTimeRange(e.target.value); setStartDate(null); setEndDate(null); }}
                    style={styles.select}
                  >
                    <option value="1h">Last 1 Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Metric Type:</label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    style={styles.select}
                  >
                    <option value="cpuUsage">CPU Usage</option>
                    <option value="memoryUsage">Memory Usage</option>
                    <option value="diskUsage">Disk Usage</option>
                    <option value="networkIo">Network I/O</option>
                    <option value="uptime">Uptime</option>
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Start Date:</label>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => { setStartDate(date); setTimeRange('custom'); }}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    showTimeSelect
                    dateFormat="Pp"
                    className="react-datepicker-custom-input" // Add a class for custom styling if needed
                    customInput={<input style={styles.input} />} // Apply common input styles
                  />
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>End Date:</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => { setEndDate(date); setTimeRange('custom'); }}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    showTimeSelect
                    dateFormat="Pp"
                    className="react-datepicker-custom-input"
                    customInput={<input style={styles.input} />} // Apply common input styles
                  />
                </div>
              </div>

              {/* Metrics Display and Charts */}
              <div style={styles.metricsDisplay}>
                {loading && <div style={styles.loadingSpinner}></div>}
                {error && <div style={styles.errorMessage}>{error}</div>}
                {!loading && !error && metrics.length === 0 && (
                  <div style={styles.noDataMessage}>No data available for the selected criteria.</div>
                )}
                {metrics.length > 0 && !loading && !error && (
                  <>
                    {/* Latest Metrics Cards */}
                    <div style={styles.metricCardsContainer}>
                        <div style={styles.metricCard}>
                            <div style={styles.metricName}>CPU Usage</div>
                            <div style={styles.metricValue}>{latestMetrics.cpuUsage}</div>
                        </div>
                        <div style={styles.metricCard}>
                            <div style={styles.metricName}>Memory Usage</div>
                            <div style={styles.metricValue}>{latestMetrics.memoryUsage}</div>
                        </div>
                        <div style={styles.metricCard}>
                            <div style={styles.metricName}>Disk Usage</div>
                            <div style={styles.metricValue}>{latestMetrics.diskUsage}</div>
                        </div>
                        <div style={styles.metricCard}>
                            <div style={styles.metricName}>Network I/O</div>
                            <div style={styles.metricValue}>{latestMetrics.networkIo}</div>
                        </div>
                        <div style={styles.metricCard}>
                            <div style={styles.metricName}>Uptime</div>
                            <div style={styles.metricValue}>{latestMetrics.uptime}</div>
                        </div>
                    </div>

                    {/* Metric Chart */}
                    <div style={styles.chartContainer}>
                      <Line data={chartData} options={chartOptions} />
                    </div>
                  </>
                )}
              </div>

              {/* Report Generator */}
              <ReportGenerator token={token} hostnames={hostnames} />
            </PrivateRoute>
          }
        />

        {/* Fallback for any other undefined paths - redirect to /login if not authenticated, or /dashboard if authenticated */}
        <Route path="*" element={token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;