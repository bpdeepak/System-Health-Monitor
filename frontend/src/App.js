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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function App() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/metrics");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const labels = metrics.map((m) => m.hostname);

  const cpuData = {
    labels,
    datasets: [
      {
        label: "CPU Usage (%)",
        data: metrics.map((m) => m.cpu),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  const memoryData = {
    labels,
    datasets: [
      {
        label: "Memory Usage (%)",
        data: metrics.map((m) => m.memory),
        backgroundColor: "rgba(153, 102, 255, 0.6)",
      },
    ],
  };

  const diskData = {
    labels,
    datasets: [
      {
        label: "Disk Usage (%)",
        data: metrics.map((m) => m.disk),
        backgroundColor: "rgba(255, 159, 64, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 10 },
      },
    },
  };

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>System Health Monitoring Dashboard</h1>

      {loading && <p>Loading metrics...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {!loading && !error && metrics.length === 0 && <p>No metrics available.</p>}

      {!loading && !error && metrics.length > 0 && (
        <>
          <Bar data={cpuData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "CPU Usage by Hostname" } } }} />
          <Bar data={memoryData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Memory Usage by Hostname" } } }} />
          <Bar data={diskData} options={{ ...options, plugins: { ...options.plugins, title: { display: true, text: "Disk Usage by Hostname" } } }} />

          <div style={{ marginTop: 40 }}>
            <h2>Uptime per Host</h2>
            <ul>
              {metrics.map((m) => (
                <li key={m._id}>
                  <strong>{m.hostname}:</strong> {formatUptime(m.uptime)} ({m.os})
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
