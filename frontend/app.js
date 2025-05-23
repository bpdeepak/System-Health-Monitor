import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch latest metrics from backend
    const fetchMetrics = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/metrics");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Refresh every 10 seconds
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  // Prepare data for Chart.js
  const chartData = {
    labels: metrics.map((m) => m.hostname),
    datasets: [
      {
        label: "CPU Usage (%)",
        data: metrics.map((m) => m.cpu),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "CPU Usage by Hostname",
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 10,
        },
      },
    },
  };

  return (
    <div style={{ maxWidth: 800, margin: "20px auto", padding: 20 }}>
      <h1>System Health Monitoring Dashboard</h1>

      {loading && <p>Loading metrics...</p>}

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      {!loading && !error && metrics.length === 0 && <p>No metrics available.</p>}

      {!loading && !error && metrics.length > 0 && (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
}

export default App;
