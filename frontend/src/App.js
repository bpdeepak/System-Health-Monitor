// frontend/src/App.js

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker'; // For date range selection
import 'react-datepicker/dist/react-datepicker.css'; // DatePicker styles
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
  TimeScale, // For time-based charts
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Adapter for date-fns to work with Chart.js time scale

// Import your authentication and report generator components
import Auth from './components/Auth';
import ReportGenerator from './components/ReportGenerator';

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
  TimeScale // Register TimeScale
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

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload).user.role;
  } catch (e) {
    console.error("Error decoding JWT:", e);
    return null;
  }
};

// --- Reusable Chart Options ---
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false, // Allows flexible sizing
  plugins: {
    legend: { position: 'top', labels: { font: { size: 14 } } },
    tooltip: { mode: 'index', intersect: false, bodyFont: { size: 14 } },
    title: { display: true, font: { size: 16 } },
  },
  scales: {
    y: {
      beginAtZero: true,
      min: 0,
      max: 100,
      title: { display: true, text: 'Usage (%)', font: { size: 14 } },
      ticks: { font: { size: 12 } },
    },
    x: {
      ticks: { font: { size: 12 } },
    },
  },
};

const historicalChartOptions = {
    ...commonChartOptions,
    scales: {
        y: {
            ...commonChartOptions.scales.y,
        },
        x: {
            type: 'time', // Use time scale for historical data
            time: {
                unit: 'hour', // Default unit, will auto-adjust
                tooltipFormat: 'MMM d, HH:mm:ss',
                displayFormats: {
                    hour: 'MMM d, HH:mm',
                    day: 'MMM d',
                },
            },
            title: { display: true, text: 'Time', font: { size: 14 } },
            ticks: { font: { size: 12 } },
        },
    },
};

// --- Main App Component ---
function App() {
  // Authentication & User State
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(null);

  // Latest Metrics State
  const [latestMetrics, setLatestMetrics] = useState([]);
  const [latestLoading, setLatestLoading] = useState(true);
  const [latestError, setLatestError] = useState(null);

  // Historical Metrics State
  const [historicalMetrics, setHistoricalMetrics] = useState([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState(null);
  const [selectedHostname, setSelectedHostname] = useState('');
  const [historicalStartDate, setHistoricalStartDate] = useState(new Date(Date.now() - 24 * 60 * 60 * 1000)); // Last 24 hours
  const [historicalEndDate, setHistoricalEndDate] = useState(new Date());

  // --- Auth Handlers ---
  const handleSetToken = useCallback((newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUserRole(decodeJwt(newToken));
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUserRole(null);
    setLatestMetrics([]);
    setHistoricalMetrics([]);
    setLatestLoading(false);
    setHistoricalLoading(false);
    setLatestError(null);
    setHistoricalError(null);
    setSelectedHostname('');
  }, []);

  // --- Data Fetching Logic ---

  // Fetch Latest Metrics
  useEffect(() => {
    if (!token) {
      setLatestLoading(false);
      return;
    }

    const fetchLatestMetrics = async () => {
      setLatestLoading(true);
      setLatestError(null);
      try {
        const response = await axios.get("http://localhost:5000/api/metrics/latest", {
          headers: { 'x-auth-token': token }
        });
        setLatestMetrics(response.data);
        if (!selectedHostname && response.data.length > 0) {
          setSelectedHostname(response.data[0].hostname); // Default select first host
        }
      } catch (err) {
        console.error("Failed to fetch latest metrics:", err);
        setLatestError(err.response?.data?.msg || 'Failed to fetch latest metrics.');
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          handleLogout(); // Auto-logout on invalid token
        }
      } finally {
        setLatestLoading(false);
      }
    };

    fetchLatestMetrics(); // Initial fetch
    const interval = setInterval(fetchLatestMetrics, 10000); // Poll every 10 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [token, selectedHostname, handleLogout]);

  // Fetch Historical Metrics
  useEffect(() => {
    if (!token || !selectedHostname) {
        setHistoricalMetrics([]);
        return;
    }

    const fetchHistoricalMetrics = async () => {
        setHistoricalLoading(true);
        setHistoricalError(null);
        try {
            const params = {
                hostname: selectedHostname,
                startDate: historicalStartDate ? historicalStartDate.toISOString() : undefined,
                endDate: historicalEndDate ? historicalEndDate.toISOString() : undefined,
            };
            const response = await axios.get('http://localhost:5000/api/metrics/history', {
                headers: { 'x-auth-token': token },
                params: params,
            });
            setHistoricalMetrics(response.data);
        } catch (err) {
            console.error("Failed to fetch historical metrics:", err);
            setHistoricalError(err.response?.data?.msg || 'Failed to fetch historical metrics.');
        } finally {
            setHistoricalLoading(false);
        }
    };

    fetchHistoricalMetrics();
    // Consider adding a less frequent interval here for historical data if needed,
    // or keep it manual via a refresh button. For now, it fetches on date/host change.
  }, [token, selectedHostname, historicalStartDate, historicalEndDate]);


  // --- Chart Data Memoization (Performance Optimization) ---
  const latestChartData = useMemo(() => {
    const labels = latestMetrics.map((m) => m.hostname);
    return {
      cpu: {
        labels,
        datasets: [{
          label: 'CPU Usage (%)',
          data: latestMetrics.map((m) => m.cpu),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        }],
      },
      memory: {
        labels,
        datasets: [{
          label: 'Memory Usage (%)',
          data: latestMetrics.map((m) => m.memory),
          backgroundColor: 'rgba(153, 102, 255, 0.8)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
        }],
      },
      disk: {
        labels,
        datasets: [{
          label: 'Disk Usage (%)',
          data: latestMetrics.map((m) => m.disk),
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 1,
        }],
      },
    };
  }, [latestMetrics]);

  const historicalChartData = useMemo(() => {
    const labels = historicalMetrics.map(m => new Date(m.timestamp)); // Use Date objects for time scale
    return {
      cpu: {
        labels,
        datasets: [{
          label: `CPU Usage for ${selectedHostname} (%)`,
          data: historicalMetrics.map(m => ({ x: new Date(m.timestamp), y: m.cpu })), // {x, y} format for time series
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        }],
      },
      memory: {
        labels,
        datasets: [{
          label: `Memory Usage for ${selectedHostname} (%)`,
          data: historicalMetrics.map(m => ({ x: new Date(m.timestamp), y: m.memory })),
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        }],
      },
      disk: {
        labels,
        datasets: [{
          label: `Disk Usage for ${selectedHostname} (%)`,
          data: historicalMetrics.map(m => ({ x: new Date(m.timestamp), y: m.disk })),
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        }],
      },
    };
  }, [historicalMetrics, selectedHostname]);

  const uniqueHostnames = useMemo(() => [...new Set(latestMetrics.map(m => m.hostname))], [latestMetrics]);

  // --- Rendering Logic ---
  if (!token) {
    return <Auth setToken={handleSetToken} />;
  }

  return (
    <div style={dashboardStyles.container}>
      {/* Header and Logout */}
      <div style={dashboardStyles.header}>
        <h1 style={dashboardStyles.title}>System Health Dashboard</h1>
        <div style={dashboardStyles.userInfo}>
          {userRole && <span style={dashboardStyles.userRole}>Role: {userRole}</span>}
          <button onClick={handleLogout} style={dashboardStyles.logoutButton}>
            Logout
          </button>
        </div>
      </div>

      {/* Latest Metrics Section */}
      <div style={dashboardStyles.section}>
        <h2 style={dashboardStyles.sectionTitle}>Current System Overview</h2>
        {latestLoading && <div style={dashboardStyles.loadingSpinner}></div>}
        {latestError && <p style={dashboardStyles.errorMessage}>Error: {latestError}</p>}
        {!latestLoading && !latestError && latestMetrics.length === 0 && (
          <p style={dashboardStyles.noDataMessage}>No live metrics available. Ensure agents are running.</p>
        )}
        {!latestLoading && !latestError && latestMetrics.length > 0 && (
          <div style={dashboardStyles.gridContainer}>
            <div style={dashboardStyles.chartCard}>
              <Bar data={latestChartData.cpu} options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { display: true, text: "Live CPU Usage by Host" } } }} />
            </div>
            <div style={dashboardStyles.chartCard}>
              <Bar data={latestChartData.memory} options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { display: true, text: "Live Memory Usage by Host" } } }} />
            </div>
            <div style={dashboardStyles.chartCard}>
              <Bar data={latestChartData.disk} options={{ ...commonChartOptions, plugins: { ...commonChartOptions.plugins, title: { display: true, text: "Live Disk Usage by Host" } } }} />
            </div>
          </div>
        )}

        {!latestLoading && !latestError && latestMetrics.length > 0 && (
          <div style={dashboardStyles.systemDetailsTable}>
            <h3>Live System Details</h3>
            <table>
                <thead>
                    <tr>
                        <th>Hostname</th>
                        <th>OS</th>
                        <th>Uptime</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    {latestMetrics.map(m => (
                        <tr key={m.hostname}>
                            <td>{m.hostname}</td>
                            <td>{m.os}</td>
                            <td>{formatUptime(m.uptime)}</td>
                            <td>{new Date(m.timestamp).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Data Section */}
      <div style={dashboardStyles.section}>
        <h2 style={dashboardStyles.sectionTitle}>Historical Performance Trends</h2>
        {latestMetrics.length > 0 && ( // Only show selector if there are hosts
          <div style={dashboardStyles.flexContainer}>
            <div style={{ marginRight: '20px' }}>
              <label htmlFor="hostname-select" style={dashboardStyles.label}>Select Host:</label>
              <select
                id="hostname-select"
                value={selectedHostname}
                onChange={(e) => setSelectedHostname(e.target.value)}
                style={dashboardStyles.select}
              >
                {uniqueHostnames.map(host => (
                  <option key={host} value={host}>{host}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={dashboardStyles.label}>From:</label>
              <DatePicker
                selected={historicalStartDate}
                onChange={(date) => setHistoricalStartDate(date)}
                selectsStart
                startDate={historicalStartDate}
                endDate={historicalEndDate}
                showTimeSelect
                dateFormat="Pp"
                className="custom-datepicker-input" // Add a class for custom styling
                wrapperClassName="custom-datepicker-wrapper"
              />
            </div>
            <div>
              <label style={dashboardStyles.label}>To:</label>
              <DatePicker
                selected={historicalEndDate}
                onChange={(date) => setHistoricalEndDate(date)}
                selectsEnd
                startDate={historicalStartDate}
                endDate={historicalEndDate}
                minDate={historicalStartDate}
                showTimeSelect
                dateFormat="Pp"
                className="custom-datepicker-input" // Add a class for custom styling
                wrapperClassName="custom-datepicker-wrapper"
              />
            </div>
          </div>
        )}

        {historicalLoading && <div style={dashboardStyles.loadingSpinner}></div>}
        {historicalError && <p style={dashboardStyles.errorMessage}>Error: {historicalError}</p>}
        {!historicalLoading && !historicalError && selectedHostname && historicalMetrics.length === 0 && (
          <p style={dashboardStyles.noDataMessage}>No historical data available for {selectedHostname} in the selected period.</p>
        )}

        {!historicalLoading && !historicalError && selectedHostname && historicalMetrics.length > 0 && (
          <div style={dashboardStyles.gridContainer}>
            <div style={dashboardStyles.chartCard}>
              <Line data={historicalChartData.cpu} options={{ ...historicalChartOptions, plugins: { ...historicalChartOptions.plugins, title: { display: true, text: `CPU Usage Trend for ${selectedHostname}` } } }} />
            </div>
            <div style={dashboardStyles.chartCard}>
              <Line data={historicalChartData.memory} options={{ ...historicalChartOptions, plugins: { ...historicalChartOptions.plugins, title: { display: true, text: `Memory Usage Trend for ${selectedHostname}` } } }} />
            </div>
            <div style={dashboardStyles.chartCard}>
              <Line data={historicalChartData.disk} options={{ ...historicalChartOptions, plugins: { ...historicalChartOptions.plugins, title: { display: true, text: `Disk Usage Trend for ${selectedHostname}` } } }} />
            </div>
          </div>
        )}
      </div>

      {/* Report Generation Section */}
      {!latestLoading && !latestError && (
        <div style={dashboardStyles.section}>
          <ReportGenerator token={token} hostnames={uniqueHostnames} />
        </div>
      )}

    </div>
  );
}

// --- Basic Inline Styles (Highly recommend moving to a CSS module or framework) ---
const dashboardStyles = {
    container: {
        maxWidth: '1200px',
        margin: '20px auto',
        padding: '30px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '20px',
        marginBottom: '20px',
    },
    title: {
        fontSize: '2.5em',
        color: '#333',
        margin: 0,
        fontWeight: 'bold',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    userRole: {
        fontSize: '1.1em',
        color: '#555',
        padding: '5px 10px',
        backgroundColor: '#e9e9e9',
        borderRadius: '5px',
    },
    logoutButton: {
        padding: '10px 20px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.3s ease',
    },
    section: {
        backgroundColor: '#f8f9fa',
        padding: '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    },
    sectionTitle: {
        fontSize: '1.8em',
        color: '#444',
        marginBottom: '25px',
        textAlign: 'center',
        borderBottom: '1px solid #ddd',
        paddingBottom: '10px',
    },
    gridContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '30px',
        marginTop: '20px',
    },
    chartCard: {
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        padding: '20px',
        minHeight: '300px', /* Ensure charts have space */
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    systemDetailsTable: {
        marginTop: '40px',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        padding: '20px',
    },
    flexContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '20px',
    },
    label: {
        fontSize: '1.1em',
        color: '#555',
        marginRight: '8px',
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
};

// Keyframe for spinner animation (add to your global CSS or directly in JS if using styled-components)
// This should ideally be in your `App.css` or `index.css`
/*
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/
// And for the custom-datepicker-input (add to your global CSS or App.css)
/*
.custom-datepicker-input {
    padding: 10px 15px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 1em;
    width: 200px;
    box-sizing: border-box;
}
.custom-datepicker-wrapper {
    width: auto;
}
*/

export default App;