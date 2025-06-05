// backend/test/metric.api.test.js
const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../server'); // Import your Express app for testing
const Metric = require('../models/Metric');
const User = require('../models/User'); // Assuming you have a User model
const dotenv = require('dotenv');
dotenv.config();

describe('Metrics API', () => {
  let testMongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/monitoring_test';
  let server;
  let userToken;
  let adminToken;
  let userId;
  let adminId;

  before(async () => {
    // Disconnect any existing Mongoose connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    // Connect to the test database
    try {
      await mongoose.connect(testMongoUri, {
        // These options are no longer necessary in Mongoose 6+ and can be removed.
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
      });
      console.log(`Connected to test MongoDB for Metrics API tests: ${mongoose.connection.name}`);
    } catch (err) {
      console.error('Error connecting to test MongoDB for Metrics API tests:', err.message);
      process.exit(1);
    }

    server = app.listen(0); // Start the Express server on a random port for API tests

    // Register and login a test user and admin to get tokens
    await request(server).post('/api/auth/register').send({ username: 'metricsuser', password: 'password123', role: 'user' });
    const userRes = await request(server).post('/api/auth/login').send({ username: 'metricsuser', password: 'password123' });
    userToken = userRes.body.token;
    userId = userRes.body.id; // If your login response includes user ID

    await request(server).post('/api/auth/register').send({ username: 'metricsadmin', password: 'adminpassword', role: 'admin' });
    const adminRes = await request(server).post('/api/auth/login').send({ username: 'metricsadmin', password: 'adminpassword' });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.id; // If your login response includes user ID
  });

  after(async () => {
    if (server) {
      await server.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.db.dropDatabase(); // Clear the test database
      await mongoose.disconnect();
      console.log('Disconnected from test MongoDB for Metrics API tests');
    }
  });

  beforeEach(async () => {
    // Clear metrics collection before each test
    await Metric.deleteMany({});
  });

  // --- MODIFIED: Update mockMetric to match the new Metric model schema ---
  const mockMetric = {
    deviceName: 'test-device-1', // Changed from hostname
    cpuUsage: 10.5,             // Changed from cpu
    memoryUsage: 20.3,          // Changed from memory
    diskUsage: 30.1,            // Changed from disk
    uptime: 1000,
    os: 'Linux',
    timestamp: new Date().toISOString()
  };

  it('should allow authenticated users to post metrics', async () => {
    const res = await request(server)
      .post('/api/metrics')
      // Agents typically don't send auth tokens; this test assumes auth on POST,
      // but in reality, POST /api/metrics is usually public or uses a shared secret.
      // If you intend for agents to use a shared secret, you'd add that validation here.
      .set('x-auth-token', userToken) // Assuming agent uses userToken for this test setup
      .send(mockMetric);

    expect(res.statusCode).to.equal(201);
    expect(res.body).to.have.property('message').equal('Metric saved');
    // --- MODIFIED: Check for deviceName instead of hostname ---
    const savedMetric = await Metric.findOne({ deviceName: 'test-device-1' });
    expect(savedMetric).to.exist;
    expect(savedMetric.cpuUsage).to.equal(mockMetric.cpuUsage); // Check new key
  });

  it('should return 400 for invalid metric data when posting', async () => {
    // --- MODIFIED: Invalid data for new keys, and remove deviceName for required test ---
    const invalidMetric = { ...mockMetric, cpuUsage: 'not-a-number' }; // Invalid CPUUsage
    const res = await request(server)
      .post('/api/metrics')
      .set('x-auth-token', userToken)
      .send(invalidMetric);

    expect(res.statusCode).to.equal(400);
    expect(res.body).to.have.property('errors');
    // Check specific error message for cpuUsage
    expect(res.body.errors[0]).to.include('Cast to Number failed for value "not-a-number" (type string) at path "cpuUsage"');

    // Test missing required field (deviceName)
    const missingDeviceNameMetric = { ...mockMetric };
    delete missingDeviceNameMetric.deviceName; // Remove the required field
    const resMissing = await request(server)
      .post('/api/metrics')
      .set('x-auth-token', userToken)
      .send(missingDeviceNameMetric);

    expect(resMissing.statusCode).to.equal(400);
    expect(resMissing.body).to.have.property('errors');
    expect(resMissing.body.errors[0]).to.include('Path `deviceName` is required.');
  });

  it('should allow authenticated users to get latest metrics', async () => {
    await new Metric(mockMetric).save();
    // --- MODIFIED: Use deviceName for second mock metric ---
    await new Metric({ ...mockMetric, deviceName: 'test-device-2', cpuUsage: 50 }).save();

    const res = await request(server)
      .get('/api/metrics/latest')
      .set('x-auth-token', userToken);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(2);
    // --- MODIFIED: Check for deviceName instead of hostname ---
    expect(res.body[0].deviceName).to.exist;
    expect(res.body[1].deviceName).to.exist;
    // Check that the latest metrics are returned correctly
    const device1Latest = res.body.find(m => m.deviceName === 'test-device-1');
    const device2Latest = res.body.find(m => m.deviceName === 'test-device-2');
    expect(device1Latest.cpuUsage).to.equal(mockMetric.cpuUsage);
    expect(device2Latest.cpuUsage).to.equal(50);
  });

  it('should allow authenticated users to get historical metrics for a deviceName', async () => {
    // --- MODIFIED: Use deviceName for historical metrics ---
    const device1Metric1 = { ...mockMetric, deviceName: 'history-device', timestamp: new Date(Date.now() - 3600000).toISOString(), cpuUsage: 25 };
    const device1Metric2 = { ...mockMetric, deviceName: 'history-device', timestamp: new Date(Date.now() - 1800000).toISOString(), cpuUsage: 35 };
    const device2Metric = { ...mockMetric, deviceName: 'other-device', timestamp: new Date().toISOString(), cpuUsage: 15 };

    await new Metric(device1Metric1).save();
    await new Metric(device1Metric2).save();
    await new Metric(device2Metric).save();

    // --- MODIFIED: Query by deviceName instead of hostname ---
    const res = await request(server)
      .get('/api/metrics?deviceName=history-device&timeRange=24h')
      .set('x-auth-token', userToken);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(2);
    // --- MODIFIED: Check for deviceName instead of hostname ---
    expect(res.body[0].deviceName).to.equal('history-device');
    expect(res.body[1].deviceName).to.equal('history-device');
    expect(res.body[0].cpuUsage).to.equal(25);
    expect(res.body[1].cpuUsage).to.equal(35);
  });

  it('should filter historical metrics by date range', async () => {
    const now = new Date();
    // --- MODIFIED: Use deviceName ---
    const device1Metric1 = { ...mockMetric, deviceName: 'date-test-device', timestamp: new Date(now.getTime() - 7200000).toISOString() }; // 2 hours ago
    const device1Metric2 = { ...mockMetric, deviceName: 'date-test-device', timestamp: new Date(now.getTime() - 3600000).toISOString() }; // 1 hour ago
    const device1Metric3 = { ...mockMetric, deviceName: 'date-test-device', timestamp: new Date(now.getTime() - 600000).toISOString() };  // 10 mins ago

    await new Metric(device1Metric1).save();
    await new Metric(device1Metric2).save();
    await new Metric(device1Metric3).save();

    const startDate = new Date(now.getTime() - 5400000); // 1.5 hours ago
    const endDate = new Date(now.getTime() - 900000); // 15 mins ago

    // console.log('Test Dates:'); // Keep these for debugging if needed
    // console.log(`  Metric1 Timestamp: ${device1Metric1.timestamp}`);
    // console.log(`  Metric2 Timestamp: ${device1Metric2.timestamp}`);
    // console.log(`  Metric3 Timestamp: ${device1Metric3.timestamp}`);
    // console.log(`  Query Start Date: ${startDate.toISOString()}`);
    // console.log(`  Query End Date: ${endDate.toISOString()}`);

    const res = await request(server)
          // --- MODIFIED: Query by deviceName and check relevant keys ---
          .get(`/api/metrics?deviceName=date-test-device&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
          .set('x-auth-token', userToken);

    // console.log('API Response Status Code:', res.statusCode); // Keep for debugging
    // console.log('API Response Body:', JSON.stringify(res.body, null, 2)); // Keep for debugging
    if (Array.isArray(res.body)) {
        // console.log('API Response Body Timestamps:'); // Keep for debugging
        // res.body.forEach(metric => console.log(`  - ${metric.timestamp}`)); // Keep for debugging
        expect(res.body).to.have.lengthOf(1); // Expecting only Metric2 to be in this range
        expect(res.body[0].deviceName).to.equal('date-test-device');
        expect(res.body[0].cpuUsage).to.equal(mockMetric.cpuUsage); // Check a specific value
    } else {
        // console.log('Response body was not an array. Cannot log timestamps.'); // Keep for debugging
        expect.fail('Response body was not an array, indicating an API error.');
    }
  });

  // --- REMOVED: This test is no longer relevant for metrics API as /api/hosts endpoint was replaced ---
  // If you need to test the retrieval of device names, create a new test file for the /api/devices route
  /*
  it('should allow authenticated users to get unique hostnames', async () => {
    await new Metric({ ...mockMetric, hostname: 'hostA' }).save();
    await new Metric({ ...mockMetric, hostname: 'hostB' }).save();
    await new Metric({ ...mockMetric, hostname: 'hostA' }).save(); // Duplicate hostname

    const res = await request(server)
      .get('/api/hosts') // This endpoint no longer exists as per our changes
      .set('x-auth-token', userToken);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(3); // ['all', 'hostA', 'hostB']
    expect(res.body).to.include('all');
    expect(res.body).to.include('hostA');
    expect(res.body).to.include('hostB');
  });
  */

  it('should return 401 if no token is provided for protected routes', async () => {
    const res = await request(server)
      .get('/api/metrics'); // No token provided

    expect(res.statusCode).to.equal(401);
    expect(res.body).to.have.property('msg').equal('No token, authorization denied');
  });

  it('should return 401 if invalid token is provided for protected routes', async () => {
    const res = await request(server)
      .get('/api/metrics')
      .set('x-auth-token', 'invalid_token');

    expect(res.statusCode).to.equal(401);
    expect(res.body).to.have.property('msg').equal('Token is not valid');
  });
});