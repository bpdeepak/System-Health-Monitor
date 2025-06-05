// backend/routes/devices.js
const express = require('express');
const router = express.Router();
// Assuming your Device model is in backend/models/Device.js
const Device = require('../models/Device');

// Middleware to parse JSON request bodies
router.use(express.json());

// --- CRUD Operations for Devices ---

// 1. Create a new device (POST /api/devices)
router.post('/', async (req, res) => {
    try {
        const newDevice = new Device(req.body);
        await newDevice.save();
        // Respond with the newly created device and a 201 Created status
        res.status(201).json(newDevice);
    } catch (err) {
        console.error('Error creating device:', err);
        // Handle duplicate key error (e.g., if name or ipAddress already exists)
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Device with this name or IP already exists.' });
        }
        // General bad request error
        res.status(400).json({ message: err.message });
    }
});

// 2. Get all devices (Read All) (GET /api/devices)
router.get('/', async (req, res) => {
    try {
        const devices = await Device.find({});
        res.status(200).json(devices);
    } catch (err) {
        console.error('Error fetching all devices:', err);
        res.status(500).json({ message: 'Server error while fetching devices.' });
    }
});

// 3. Get a single device by ID (Read One) (GET /api/devices/:id)
router.get('/:id', async (req, res) => {
    try {
        const device = await Device.findById(req.params.id);
        if (!device) {
            return res.status(404).json({ message: 'Device not found.' });
        }
        res.status(200).json(device);
    } catch (err) {
        console.error('Error fetching single device:', err);
        res.status(500).json({ message: 'Server error while fetching device.' });
    }
});

// 4. Update an existing device by ID (PUT /api/devices/:id)
router.put('/:id', async (req, res) => {
    try {
        const updatedDevice = await Device.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true } // `new: true` returns the updated document; `runValidators: true` applies schema validation
        );
        if (!updatedDevice) {
            return res.status(404).json({ message: 'Device not found for update.' });
        }
        res.status(200).json(updatedDevice);
    } catch (err) {
        console.error('Error updating device:', err);
        if (err.code === 11000) { // Handle duplicate key error during update
            return res.status(409).json({ message: 'Another device with this name or IP already exists.' });
        }
        res.status(400).json({ message: err.message });
    }
});

// 5. Delete a device by ID (DELETE /api/devices/:id)
router.delete('/:id', async (req, res) => {
    try {
        const deletedDevice = await Device.findByIdAndDelete(req.params.id);
        if (!deletedDevice) {
            return res.status(404).json({ message: 'Device not found for deletion.' });
        }
        res.status(200).json({ message: 'Device deleted successfully.' });
    } catch (err) {
        console.error('Error deleting device:', err);
        res.status(500).json({ message: 'Server error while deleting device.' });
    }
});

module.exports = router;