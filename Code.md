## agent/system_agent.py
import time
import socket
import psutil
import platform
import requests
from datetime import datetime

BACKEND_URL = "http://backend:5000/api/metrics"
HOSTNAME = socket.gethostname()

def collect_metrics():
    cpu = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    uptime = int(time.time() - psutil.boot_time())
    os_type = platform.system()

    metrics = {
        "hostname": HOSTNAME,
        "cpu": cpu,
        "memory": round(memory.percent, 2),
        "disk": round(disk.percent, 2),
        "uptime": uptime,
        "os": os_type,
        "timestamp": datetime.utcnow().isoformat()
    }
    return metrics

def send_metrics():
    while True:
        data = collect_metrics()
        try:
            response = requests.post(BACKEND_URL, json=data)
            print(f"[{datetime.now()}] Sent metrics: {response.status_code}")
        except Exception as e:
            print(f"[{datetime.now()}] Failed to send metrics: {e}")
        time.sleep(5)

if __name__ == "__main__":
    send_metrics()

## backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // Added for serving React
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection with error handling
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running and MongoDB is connected' });
});

// Define Metric Schema
const metricSchema = new mongoose.Schema({
  hostname: String,
  cpu: Number,
  memory: Number,
  disk: Number,
  uptime: Number,
  os: String,
  timestamp: { type: Date, default: Date.now }
});

const Metric = mongoose.model('Metric', metricSchema);

// Endpoint to store metrics
app.post('/api/metrics', async (req, res) => {
  try {
    await Metric.create(req.body);
    res.status(201).send('Metric stored');
  } catch (err) {
    res.status(500).send({ message: err.message, error: err });
  }
});

// Endpoint to get the latest metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const latest = await Metric.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$hostname",
          latest: { $first: "$$ROOT" }
        }
      }
    ]);
    res.json(latest.map(e => e.latest));
  } catch (err) {
    res.status(500).send({ message: 'Error fetching metrics', error: err });
  }
});

// Serve React frontend from build folder
app.use(express.static(path.join(__dirname, 'build')));

// Handle all other routes by serving the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
// app.listen(5000, () => {
//   console.log('Backend running on port 5000');
// });

app.listen(5000, '0.0.0.0', () => console.log('Backend running on port 5000'));

## backend/models/Metric.js
const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  hostname: String,
  cpu: Number,
  memory: Number,
  disk: Number,
  uptime: Number,
  os: String,
  timestamp: Date
});

module.exports = mongoose.model('Metric', metricSchema);

## backend/routes/metrics.js
const express = require('express');
const router = express.Router();
const Metric = require('../models/Metric');

router.post('/', async (req, res) => {
  try {
    const newMetric = new Metric(req.body);
    await newMetric.save();
    res.status(201).json({ message: 'Metric saved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save metric' });
  }
});

router.get('/', async (req, res) => {
  try {
    const metrics = await Metric.find().sort({ timestamp: -1 }).limit(50);
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

module.exports = router;

## frontend/src/app.js
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


## agent/Dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY system_agent.py .

RUN pip install --no-cache-dir psutil requests

CMD ["python", "system_agent.py"]

## backend/Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]


## frontend/Dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

## docker-compose.yml
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongo:27017/monitoring
    depends_on:
      - mongo

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  mongo:
    image: mongo
    ports:
      - "27017:27017"

  agent:
    build: ./agent
    depends_on:
      - backend
    restart: always

## Jenkinsfile-CI
pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'bpdeepak'
        IMAGE_TAG = 'latest'
    }

    stages {
        stage('Clone Code') {
            steps {
                git url:
                'https://github.com/bpdeepak/System-Health-Monitor.git',
                branch: 'main',
                credentialsId: 'github-cred'

            }
        }

        stage('Install & Test Backend') {
            steps {
                dir('backend') {
                    sh 'npm install'
                    sh 'npm test'
                }
            }
        }

        stage('Install & Lint Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run lint'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker build -t $DOCKERHUB_USER/backend:$IMAGE_TAG ./backend'
                sh 'docker build -t $DOCKERHUB_USER/frontend:$IMAGE_TAG ./frontend'
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
                    sh 'echo $PASSWORD | docker login -u $USERNAME --password-stdin'
                    sh 'docker push $DOCKERHUB_USER/backend:$IMAGE_TAG'
                    sh 'docker push $DOCKERHUB_USER/frontend:$IMAGE_TAG'
                }
            }
        }
    }
}
