// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
dotenv.config();

const app = express();
app.use(cors()); // KEEP THIS ONE
app.use(express.json()); // KEEP THIS ONE

// Import routes and middleware
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const authorize = require('./middleware/authorize');
const reportsRoutes = require('./routes/reports');
const metricsRoutes = require('./routes/metrics');
const Metric = require('./models/Metric'); // Still needed if other parts use it, but not for /api/hosts
const deviceRoutes = require('./routes/devices');

// MongoDB connection
// ... (your existing MongoDB connection code)

// Health Check Route (Public)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running and MongoDB is connected' });
});

// Use Auth Routes (Public)
app.use('/api/auth', authRoutes);
// Use Reports Routes (Protected)
app.use('/api/reports', reportsRoutes);
// Use Metrics Router (Protected)
app.use('/api/metrics', metricsRoutes);
// Use Device Routes (Protected)
app.use('/api/devices', deviceRoutes);

// REMOVE THE FOLLOWING BLOCK ENTIRELY:
/*
app.get('/api/hosts', authMiddleware, async (req, res) => {
  try {
    const hostnames = await Metric.distinct('hostname');
    res.json(['all', ...hostnames]);
  } catch (err) {
    console.error('Error fetching hostnames:', err.message);
    res.status(500).json({ message: 'Error fetching hostnames', error: err.message });
  }
});
*/

// Test protected route (already existing, verify middleware setup)
app.get('/api/private', authMiddleware, (req, res) => {
  res.json({ msg: `Welcome ${req.user.role}! This is a private route.` });
});

// Admin-only test route (already existing, verify middleware setup)
app.get('/api/admin-panel', authMiddleware, authorize(['admin']), (req, res) => {
  res.json({ msg: 'Welcome Admin! This is the admin panel.' });
});

// Start the server only if this file is run directly (not imported as a module)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

// Export the app for testing purposes
module.exports = app;