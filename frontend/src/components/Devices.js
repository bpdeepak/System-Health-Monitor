// frontend/src/components/Devices.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Ensure this matches your backend URL. It's typically set in .env.development or .env.production
// REACT_APP_BACKEND_URL should be defined in your frontend's .env file (e.g., .env.development)
// For local testing, it might be http://localhost:5000
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

function Devices() {
    const [devices, setDevices] = useState([]);
    // State for the "Add New Device" form
    const [newDevice, setNewDevice] = useState({ name: '', ipAddress: '', location: '', description: '' });
    // State to hold the device being edited, null if no device is being edited
    const [editingDevice, setEditingDevice] = useState(null);

    // Fetch devices when the component mounts
    useEffect(() => {
        fetchDevices();
    }, []);

    // Function to fetch all devices from the backend
    const fetchDevices = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/devices`);
            setDevices(response.data);
        } catch (error) {
            console.error('Error fetching devices:', error);
            alert('Failed to fetch devices. Check console for network issues or backend errors.');
        }
    };

    // Handler for creating a new device
    const handleCreateDevice = async (e) => {
        e.preventDefault(); // Prevent default form submission
        try {
            await axios.post(`${API_BASE_URL}/api/devices`, newDevice);
            setNewDevice({ name: '', ipAddress: '', location: '', description: '' }); // Clear the form
            fetchDevices(); // Refresh the list of devices
            alert('Device added successfully!');
        } catch (error) {
            console.error('Error creating device:', error.response?.data?.message || error.message);
            alert(`Failed to add device: ${error.response?.data?.message || 'Unknown error'}`);
        }
    };

    // Handler for updating an existing device
    const handleUpdateDevice = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API_BASE_URL}/api/devices/${editingDevice._id}`, editingDevice);
            setEditingDevice(null); // Exit edit mode
            fetchDevices(); // Refresh the list
            alert('Device updated successfully!');
        } catch (error) {
            console.error('Error updating device:', error.response?.data?.message || error.message);
            alert(`Failed to update device: ${error.response?.data?.message || 'Unknown error'}`);
        }
    };

    // Handler for deleting a device
    const handleDeleteDevice = async (id) => {
        if (window.confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
            try {
                await axios.delete(`${API_BASE_URL}/api/devices/${id}`);
                fetchDevices(); // Refresh the list
                alert('Device deleted successfully!');
            } catch (error) {
                console.error('Error deleting device:', error.response?.data?.message || error.message);
                alert(`Failed to delete device: ${error.response?.data?.message || 'Unknown error'}`);
            }
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
            <h1>Manage Monitored Devices</h1>

            {/* --- Add New Device Section --- */}
            <div style={{ marginBottom: '40px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <h2>Add New Device</h2>
                <form onSubmit={handleCreateDevice} style={{ display: 'grid', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="Device Name (e.g., Web Server 1)"
                        value={newDevice.name}
                        onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                        required
                        style={{ padding: '8px' }}
                    />
                    <input
                        type="text"
                        placeholder="IP Address (e.g., 192.168.1.100)"
                        value={newDevice.ipAddress}
                        onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                        required
                        style={{ padding: '8px' }}
                    />
                    <input
                        type="text"
                        placeholder="Location (e.g., Data Center A)"
                        value={newDevice.location}
                        onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })}
                        style={{ padding: '8px' }}
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={newDevice.description}
                        onChange={(e) => setNewDevice({ ...newDevice, description: e.target.value })}
                        rows="3"
                        style={{ padding: '8px' }}
                    ></textarea>
                    <button type="submit" style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Add Device</button>
                </form>
            </div>

            <hr style={{ margin: '40px 0' }} />

            {/* --- Existing Devices List Section --- */}
            <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <h2>Existing Devices</h2>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {devices.length === 0 ? (
                        <p>No devices added yet.</p>
                    ) : (
                        devices.map((device) => (
                            <li key={device._id} style={{ marginBottom: '20px', borderBottom: '1px dashed #eee', paddingBottom: '15px' }}>
                                {editingDevice && editingDevice._id === device._id ? (
                                    // Render Edit Form if this device is being edited
                                    <form onSubmit={handleUpdateDevice} style={{ display: 'grid', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={editingDevice.name}
                                            onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                                            required
                                            style={{ padding: '6px' }}
                                        />
                                        <input
                                            type="text"
                                            value={editingDevice.ipAddress}
                                            onChange={(e) => setEditingDevice({ ...editingDevice, ipAddress: e.target.value })}
                                            required
                                            style={{ padding: '6px' }}
                                        />
                                        <input
                                            type="text"
                                            value={editingDevice.location}
                                            onChange={(e) => setEditingDevice({ ...editingDevice, location: e.target.value })}
                                            style={{ padding: '6px' }}
                                        />
                                        <textarea
                                            value={editingDevice.description}
                                            onChange={(e) => setEditingDevice({ ...editingDevice, description: e.target.value })}
                                            rows="2"
                                            style={{ padding: '6px' }}
                                        ></textarea>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button type="submit" style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Save Changes</button>
                                            <button type="button" onClick={() => setEditingDevice(null)} style={{ padding: '8px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    // Render Device Details in Display Mode
                                    <>
                                        <h3>{device.name} <span style={{ fontSize: '0.8em', color: '#666' }}>({device.ipAddress})</span></h3>
                                        <p><strong>Location:</strong> {device.location || 'N/A'}</p>
                                        {device.description && <p><strong>Description:</strong> {device.description}</p>}
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => setEditingDevice({ ...device })} style={{ padding: '8px 12px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Edit</button>
                                            <button onClick={() => handleDeleteDevice(device._id)} style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}

export default Devices;