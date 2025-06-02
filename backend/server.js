// backend/server.js (modifications)
    const express = require('express');
    const mongoose = require('mongoose');
    const dotenv = require('dotenv');
    const cors = require('cors');
    const path = require('path');
    dotenv.config();

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Import auth routes and middleware
    const authRoutes = require('./routes/auth');
    const authMiddleware = require('./middleware/auth'); // Import the auth middleware
    const authorize = require('./middleware/authorize'); // Import the authorize middleware
    const reportsRoutes = require('./routes/reports');

    // MongoDB connection with error handling
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
    app.use('/api/reports', reportsRoutes);

    // Define Metric Schema (moved this to models/Metric.js earlier, but if it's still here, keep it for context)
    // const metricSchema = new mongoose.Schema({
    //   hostname: String,
    //   cpu: Number,
    //   memory: Number,
    //   disk: Number,
    //   uptime: Number,
    //   os: String,
    //   timestamp: { type: Date, default: Date.now }
    // });
    // const Metric = mongoose.model('Metric', metricSchema);
    const Metric = require('./models/Metric'); // Assuming you moved it to models/Metric.js

    // Protect ALL metrics endpoints with authentication middleware
    // Agent will need a way to authenticate or you'll need a public endpoint for agents (less secure)
    // For simplicity now, let's protect the GET endpoints and let POST for agents be public for now, or require a shared secret.
    // For this phase, assume agents *don't* authenticate with JWT for simplicity, or hardcode a special agent token if security is a concern.
    // For now, let's make POST public for agent and GET protected for frontend.

    // Endpoint to store metrics (Agent can post - keeping this public for now, or integrate agent auth later)
    // In backend/server.js, inside the app.post('/api/metrics') route:
    app.post('/api/metrics', async (req, res) => {
        try {
            await Metric.create(req.body);
            res.status(201).json({ msg: 'Metric added successfully' });
        } catch (err) {
            console.error(err.message);
            // ADDED: Specific error handling for Mongoose validation errors
            if (err.name === 'ValidationError') {
                const errors = Object.values(err.errors).map(el => el.message);
                return res.status(400).json({ errors });
            }
            res.status(500).json({ message: 'Failed to save metric', error: err.message });
        }
    });
    // Endpoint to get the latest metrics (Protected for frontend users)
    app.get('/api/metrics/latest', authMiddleware, async (req, res) => { // Apply authMiddleware here
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

// In backend/server.js, locate your app.get('/api/metrics/history') route:

app.get('/api/metrics/history', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
    const { hostname, startDate, endDate } = req.query;
    let query = {};

    console.log('Backend Received Query Params:'); // ADD THIS
    console.log(`  hostname: ${hostname}`);       // ADD THIS
    console.log(`  startDate: ${startDate}`);     // ADD THIS
    console.log(`  endDate: ${endDate}`);         // ADD THIS

    if (hostname) {
        query.hostname = hostname;
    }
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
            const parsedStartDate = new Date(startDate); // Capture parsed date
            console.log(`  Parsed startDate: ${parsedStartDate}`); // ADD THIS
            if (isNaN(parsedStartDate.getTime())) { // Check if it's an invalid date
                console.error(`  ERROR: Invalid startDate parsed from: ${startDate}`); // ADD THIS
                return res.status(400).json({ msg: 'Invalid startDate format' }); // ADD THIS: Early exit for invalid date
            }
            query.timestamp.$gte = parsedStartDate;
        }
        if (endDate) {
            const parsedEndDate = new Date(endDate); // Capture parsed date
            console.log(`  Parsed endDate: ${parsedEndDate}`); // ADD THIS
            if (isNaN(parsedEndDate.getTime())) { // Check if it's an invalid date
                console.error(`  ERROR: Invalid endDate parsed from: ${endDate}`); // ADD THIS
                return res.status(400).json({ msg: 'Invalid endDate format' }); // ADD THIS: Early exit for invalid date
            }
            query.timestamp.$lte = parsedEndDate;
        }
    }

    console.log('Backend Final Mongoose Query:', JSON.stringify(query, null, 2)); // ADD THIS

    try {
        const historicalMetrics = await Metric.find(query).sort({ timestamp: 1 }).limit(1000);
        console.log(`  Found ${historicalMetrics.length} historical metrics.`); // ADD THIS
        res.json(historicalMetrics);
    } catch (err) {
        console.error('Error fetching historical metrics:', err.message); // Refined error log
        res.status(500).json({ message: 'Error fetching historical metrics', error: err.message }); // Changed to json and err.message
    }
});

    // Test protected route
    app.get('/api/private', authMiddleware, (req, res) => {
      res.json({ msg: `Welcome ${req.user.role}! This is a private route.` });
    });

    // Admin-only test route
    app.get('/api/admin-panel', authMiddleware, authorize(['admin']), (req, res) => {
      res.json({ msg: 'Welcome Admin! This is the admin panel.' });
    });

    if (require.main === module) {
    const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
    }

    // Export the app for testing
    module.exports = app;