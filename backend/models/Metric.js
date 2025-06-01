const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  hostname: String,
  cpu: Number,
  memory: Number,
  disk: Number,
  uptime: Number,
  os: String,
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Metric', metricSchema);
