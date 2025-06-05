// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // Only needed if serving static files from backend
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes and middleware
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const authorize = require('./middleware/authorize');
const reportsRoutes = require('./routes/reports');
const metricsRoutes = require('./routes/metrics'); // <--- IMPORT THE METRICS ROUTER
const Metric = require('./models/Metric'); // <--- IMPORT METRIC MODEL for /api/hosts route

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health Check Route (Public)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running and MongoDB is connected' });
});

// Use Auth Routes (Public)
app.use('/api/auth', authRoutes);
// Use Reports Routes (Protected)
app.use('/api/reports', reportsRoutes);
// <--- USE THE METRICS ROUTER HERE TO REGISTER ALL METRIC ROUTES ---
app.use('/api/metrics', metricsRoutes);

// NEW ROUTE: Define a route for fetching unique hostnames (Protected for frontend users)
app.get('/api/hosts', authMiddleware, async (req, res) => {
  try {
    const hostnames = await Metric.distinct('hostname'); // Get unique hostnames from metrics collection
    res.json(['all', ...hostnames]); // Include 'all' option for frontend dropdown
  } catch (err) {
    console.error('Error fetching hostnames:', err.message);
    res.status(500).json({ message: 'Error fetching hostnames', error: err.message });
  }
});

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