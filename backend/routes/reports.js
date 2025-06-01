// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const Metric = require('../models/Metric'); // Assuming you have this model
const { generateReport } = require('../utils/reportGenerator');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// @route   GET /api/reports/generate
// @desc    Generate a system health report (PDF)
// @access  Private (User/Admin)
router.get('/generate', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
    const { hostname, startDate, endDate } = req.query; // Expect these from frontend
    let query = {};

    if (hostname && hostname !== 'all') { // Allow 'all' to mean all hosts
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
        // Fetch metrics for the report. You might want to limit the time range
        // or the number of metrics for very large datasets to prevent OOM errors.
        const metrics = await Metric.find(query).sort({ timestamp: 1 });

        if (metrics.length === 0) {
            return res.status(404).json({ msg: 'No data found for the specified criteria.' });
        }

        const pdfBuffer = await generateReport(metrics, hostname, startDate, endDate);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="system_health_report_${hostname || 'all'}_${new Date().toISOString().slice(0,10)}.pdf"`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error('Error generating report:', err.message);
        res.status(500).send('Server Error generating report');
    }
});

module.exports = router;