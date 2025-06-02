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
        useNewUrlParser: true,
        useUnifiedTopology: true,
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
      // Optional: await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
      console.log('Disconnected from test MongoDB for Metrics API tests');
    }
  });

  beforeEach(async () => {
    // Clear metrics collection before each test
    await Metric.deleteMany({});
  });

  const mockMetric = {
    hostname: 'test-host-1',
    cpu: 10.5,
    memory: 20.3,
    disk: 30.1,
    uptime: 1000,
    os: 'Linux',
    timestamp: new Date().toISOString()
  };

  it('should allow authenticated users to post metrics', async () => {
    const res = await request(server)
      .post('/api/metrics')
      .set('x-auth-token', userToken)
      .send(mockMetric);

    expect(res.statusCode).to.equal(201);
    expect(res.body).to.have.property('msg').equal('Metric added successfully');
    const savedMetric = await Metric.findOne({ hostname: 'test-host-1' });
    expect(savedMetric).to.exist;
    expect(savedMetric.cpu).to.equal(mockMetric.cpu);
  });

  it('should return 400 for invalid metric data when posting', async () => {
    const invalidMetric = { ...mockMetric, cpu: 'not-a-number' }; // Invalid CPU
    const res = await request(server)
      .post('/api/metrics')
      .set('x-auth-token', userToken)
      .send(invalidMetric);

    expect(res.statusCode).to.equal(400);
    expect(res.body).to.have.property('errors');
    // Change this line:
    expect(res.body.errors[0]).to.include('Cast to Number failed for value "not-a-number" (type string) at path "cpu"'); // Expect the direct string message
  });

  it('should allow authenticated users to get latest metrics', async () => {
    await new Metric(mockMetric).save();
    await new Metric({ ...mockMetric, hostname: 'test-host-2', cpu: 50 }).save();

    const res = await request(server)
      .get('/api/metrics/latest')
      .set('x-auth-token', userToken);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(2);
    expect(res.body[0].hostname).to.exist;
    expect(res.body[1].hostname).to.exist;
  });

  it('should allow authenticated users to get historical metrics for a hostname', async () => {
    const host1Metric1 = { ...mockMetric, hostname: 'history-host', timestamp: new Date(Date.now() - 3600000).toISOString(), cpu: 25 };
    const host1Metric2 = { ...mockMetric, hostname: 'history-host', timestamp: new Date(Date.now() - 1800000).toISOString(), cpu: 35 };
    const host2Metric = { ...mockMetric, hostname: 'other-host', timestamp: new Date().toISOString(), cpu: 15 };

    await new Metric(host1Metric1).save();
    await new Metric(host1Metric2).save();
    await new Metric(host2Metric).save();

    const res = await request(server)
      .get('/api/metrics/history?hostname=history-host')
      .set('x-auth-token', userToken);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(2);
    expect(res.body[0].hostname).to.equal('history-host');
    expect(res.body[1].hostname).to.equal('history-host');
    expect(res.body[0].cpu).to.equal(25);
    expect(res.body[1].cpu).to.equal(35);
  });

  it('should filter historical metrics by date range', async () => {
    const now = new Date();
    const host1Metric1 = { ...mockMetric, hostname: 'date-test', timestamp: new Date(now.getTime() - 7200000).toISOString() }; // 2 hours ago
    const host1Metric2 = { ...mockMetric, hostname: 'date-test', timestamp: new Date(now.getTime() - 3600000).toISOString() }; // 1 hour ago
    const host1Metric3 = { ...mockMetric, hostname: 'date-test', timestamp: new Date(now.getTime() - 600000).toISOString() };  // 10 mins ago

    await new Metric(host1Metric1).save();
    await new Metric(host1Metric2).save();
    await new Metric(host1Metric3).save(); // You had three metrics, but only two passed in previous turn, so this one might be the issue.

    const startDate = new Date(now.getTime() - 5400000); // 1.5 hours ago
    const endDate = new Date(now.getTime() - 900000); // 15 mins ago

    console.log('Test Dates:');
    console.log(`  Metric1 Timestamp: ${host1Metric1.timestamp}`);
    console.log(`  Metric2 Timestamp: ${host1Metric2.timestamp}`);
    console.log(`  Metric3 Timestamp: ${host1Metric3.timestamp}`);
    console.log(`  Query Start Date: ${startDate.toISOString()}`);
    console.log(`  Query End Date: ${endDate.toISOString()}`);

    const res = await request(server)
          .get(`/api/metrics/history?hostname=date-test&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`)
          .set('x-auth-token', userToken);

    console.log('API Response Status Code:', res.statusCode); // ADD THIS
        console.log('API Response Body:', JSON.stringify(res.body, null, 2)); // ADD THIS
        if (Array.isArray(res.body)) { // Check if it's an array before forEach
            console.log('API Response Body Timestamps:');
            res.body.forEach(metric => console.log(`  - ${metric.timestamp}`));
            expect(res.body).to.have.lengthOf(2); // Keep your original assertion
        } else {
            console.log('Response body was not an array. Cannot log timestamps.');
            expect.fail('Response body was not an array, indicating an API error.'); // Fail the test if not an array
        }
  });
});