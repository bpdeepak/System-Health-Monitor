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
