// backend/models/Metric.js
const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
    // NEW FIELD: To link metrics to a specific device
    deviceName: {
        type: String,
        required: true, // Metrics must be associated with a device name
        trim: true,
        // You might want to add an index for faster lookups if you query by deviceName often
        index: true
    },
    // Existing fields for your metrics
    cpuUsage: {
        type: Number,
        min: 0,
        max: 100
    },
    memoryUsage: {
        type: Number, // Percentage or bytes, adjust as needed
        min: 0
    },
    diskUsage: {
        type: Number, // Percentage
        min: 0,
        max: 100
    },
    networkIn: {
        type: Number, // Bytes/sec or packets/sec
        min: 0
    },
    networkOut: {
        type: Number, // Bytes/sec or packets/sec
        min: 0
    },
    // You can add more specific metrics as needed (e.g., process counts, service status)
    timestamp: {
        type: Date,
        default: Date.now // Automatically sets the current time
    }
});

// Optionally, add a compound index for efficient queries by deviceName and timestamp
metricSchema.index({ deviceName: 1, timestamp: -1 });

module.exports = mongoose.model('Metric', metricSchema);