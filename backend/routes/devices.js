// backend/routes/devices.js
const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth'); // NEW: Import authentication middleware
const authorize = require('../middleware/authorize'); // NEW: Import authorization middleware

// Middleware to parse JSON request bodies
// router.use(express.json()); // This is typically handled in server.js, can remove if already there

// --- CRUD Operations for Devices ---

// 1. Create a new device (POST /api/devices)
// @access Private (Admin only) - NEW: Added auth and authorization
router.post('/', authMiddleware, authorize(['admin']), async (req, res) => {
    try {
        const { name, description, type } = req.body;

        // Basic validation
        if (!name || !description || !type) {
            return res.status(400).json({ message: 'Please enter all required fields: name, description, type.' });
        }

        // Check if device with this name already exists
        let device = await Device.findOne({ name });
        if (device) {
            return res.status(409).json({ message: 'Device with this name already exists.' });
        }

        const newDevice = new Device(req.body);
        await newDevice.save();
        res.status(201).json(newDevice);
    } catch (err) {
        console.error('Error creating device:', err);
        // Handle duplicate key error (e.g., if name or ipAddress already exists)
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Device with this name or IP already exists.' });
        }
        res.status(400).json({ message: err.message });
    }
});

// 2. Get all devices (Read All) (GET /api/devices)
// @access Private (User/Admin) - NEW: Added auth and authorization
router.get('/', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
    try {
        // --- MODIFIED: Select only the 'name' field for the dashboard dropdown ---
        // For the dashboard, we typically just need the names of the devices.
        // If other parts of your app need full device details, you can adjust this or create another route.
        const devices = await Device.find({}).select('name -_id'); // Only return the 'name' field and exclude '_id'
        const deviceNames = devices.map(device => device.name); // Extract just the names into an array
        res.status(200).json(deviceNames); // Return an array of device names
    } catch (err) {
        console.error('Error fetching all devices:', err);
        res.status(500).json({ message: 'Server error while fetching devices.' });
    }
});

// 3. Get a single device by ID (Read One) (GET /api/devices/:id)
// @access Private (User/Admin) - NEW: Added auth and authorization
router.get('/:id', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
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
// @access Private (Admin only) - NEW: Added auth and authorization
router.put('/:id', authMiddleware, authorize(['admin']), async (req, res) => {
    try {
        const { name, description, type } = req.body;

        // Basic validation
        if (!name || !description || !type) {
            return res.status(400).json({ message: 'Please enter all required fields: name, description, type.' });
        }

        // Check if new name already exists for another device
        const existingDeviceWithName = await Device.findOne({ name });
        if (existingDeviceWithName && String(existingDeviceWithName._id) !== req.params.id) {
            return res.status(409).json({ message: 'Another device with this name already exists.' });
        }

        const updatedDevice = await Device.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedDevice) {
            return res.status(404).json({ message: 'Device not found for update.' });
        }
        res.status(200).json(updatedDevice);
    } catch (err) {
        console.error('Error updating device:', err);
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Another device with this name or IP already exists.' });
        }
        res.status(400).json({ message: err.message });
    }
});

// 5. Delete a device by ID (DELETE /api/devices/:id)
// @access Private (Admin only) - NEW: Added auth and authorization
router.delete('/:id', authMiddleware, authorize(['admin']), async (req, res) => {
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