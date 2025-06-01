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
    app.post('/api/metrics', async (req, res) => {
        try {
            // You might want to add a simple API key/secret check here for agents if not using full JWT for them.
            await Metric.create(req.body);
            res.status(201).send('Metric stored');
        } catch (err) {
            res.status(500).send({ message: err.message, error: err });
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

    app.get('/api/metrics/history', authMiddleware, authorize(['user', 'admin']), async (req, res) => { // User or Admin can view history
        const { hostname, startDate, endDate } = req.query;
        let query = {};

        if (hostname) {
            query.hostname = hostname;
        }
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                query.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                query.timestamp.$lte = new Date(endDate);
            }
        }

        try {
            // Limit the number of results to prevent excessively large responses
            const historicalMetrics = await Metric.find(query).sort({ timestamp: 1 }).limit(1000);
            res.json(historicalMetrics);
        } catch (err) {
            console.error(err.message);
            res.status(500).send({ message: 'Error fetching historical metrics', error: err });
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