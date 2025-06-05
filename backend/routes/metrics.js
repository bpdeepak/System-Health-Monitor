// backend/routes/metrics.js
const express = require('express');
const router = express.Router();
const Metric = require('../models/Metric');
const authMiddleware = require('../middleware/auth'); // Import authentication middleware
const authorize = require('../middleware/authorize'); // Import authorization middleware

// @route   POST /api/metrics
// @desc    Store a new metric (used by system agent)
// @access  Public (for agent, or add shared secret auth if needed)
router.post('/', async (req, res) => {
  try {
    const newMetric = new Metric(req.body);
    await newMetric.save();
    res.status(201).json({ message: 'Metric saved' });
  } catch (err) {
    console.error('Error saving metric:', err.message);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ errors });
    }
    res.status(500).json({ message: 'Failed to save metric', error: err.message });
  }
});

// @route   GET /api/metrics
// @desc    Get metrics based on time range, hostname, or specific dates
// @access  Private (User/Admin)
// This single route handles requests from frontend like /api/metrics?timeRange=24h or /api/metrics?hostname=server1
router.get('/', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
    const { hostname, timeRange, startDate, endDate } = req.query;
    let query = {};

    console.log('Backend: GET /api/metrics received query params:', { hostname, timeRange, startDate, endDate });

    if (hostname && hostname !== 'all') { // If hostname is specified and not 'all'
        query.hostname = hostname;
    }

    if (startDate && endDate) { // If specific date range is provided
        // Validate dates to prevent errors
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format for startDate or endDate.' });
        }

        query.timestamp = {
            $gte: parsedStartDate,
            $lte: parsedEndDate
        };
    } else if (timeRange) { // If timeRange is provided (and no specific dates)
        const now = new Date();
        let pastDate = new Date(); // Initialize with current time for easier manipulation
        switch (timeRange) {
            case '1h': pastDate.setHours(now.getHours() - 1); break;
            case '24h': pastDate.setDate(now.getDate() - 1); break;
            case '7d': pastDate.setDate(now.getDate() - 7); break;
            case '30d': pastDate.setDate(now.getDate() - 30); break;
            default:
                // If an invalid timeRange is provided, default to last 24 hours
                pastDate.setDate(now.getDate() - 1);
                console.warn(`Invalid timeRange provided: ${timeRange}. Defaulting to 24h.`);
                break;
        }
        query.timestamp = { $gte: pastDate, $lte: now };
    } else {
        // If no timeRange or dates, return metrics for the last 24 hours by default
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query.timestamp = { $gte: twentyFourHoursAgo, $lte: new Date() };
        console.log('No timeRange or dates specified. Defaulting to last 24 hours.');
    }

    console.log('Backend: Final Mongoose Query for /api/metrics:', JSON.stringify(query, null, 2));

    try {
        // Fetch metrics, sorting by timestamp and limiting to a reasonable number to prevent overwhelming the frontend
        const metrics = await Metric.find(query).sort({ timestamp: 1 }).limit(2000); // Increased limit for more data points
        console.log(`Backend: Found ${metrics.length} metrics for GET /api/metrics.`);
        res.json(metrics);
    } catch (err) {
        console.error('Error fetching metrics:', err.message);
        res.status(500).json({ message: 'Failed to fetch metrics', error: err.message });
    }
});


// @route   GET /api/metrics/latest
// @desc    Get the latest metric for each unique hostname
// @access  Private (User/Admin)
router.get('/latest', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
    try {
        const latest = await Metric.aggregate([
            { $sort: { timestamp: -1 } }, // Sort by latest timestamp
            {
                $group: {
                    _id: "$hostname", // Group by hostname
                    latest: { $first: "$$ROOT" } // Get the first (latest) document for each hostname
                }
            }
        ]);
        console.log(`Backend: Found ${latest.length} latest metrics.`);
        res.json(latest.map(e => e.latest)); // Return just the latest metric documents
    } catch (err) {
        console.error('Error fetching latest metrics:', err.message);
        res.status(500).json({ message: 'Error fetching latest metrics', error: err.message });
    }
});

module.exports = router;