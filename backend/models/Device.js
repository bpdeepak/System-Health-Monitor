// backend/models/Device.js
const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Ensures each device has a unique name
        trim: true
    },
    ipAddress: {
        type: String,
        required: true,
        unique: true, // Ensures each device has a unique IP
        trim: true,
        // Basic IP address validation regex (IPv4)
        match: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
    },
    location: {
        type: String,
        required: false, // Optional field
        trim: true
    },
    description: {
        type: String,
        required: false, // Optional field
        trim: true
    },
    isActive: { // To allow enabling/disabling monitoring for a device
        type: Boolean,
        default: true
    },
    addedAt: {
        type: Date,
        default: Date.now // Automatically sets the date when the device is added
    }
});

// Create the Mongoose model from the schema
module.exports = mongoose.model('Device', deviceSchema);