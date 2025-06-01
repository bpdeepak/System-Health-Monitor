const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../server'); // Import your Express app for testing
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

describe('Auth API', () => {
  // Use a separate test database connection
  let testMongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/monitoring_test';
  let server; // To hold the server instance if started by supertest

  before(async () => {
    // Connect to the test database
    try {
      if (mongoose.connection.readyState === 0 || !mongoose.connection.name.includes('_test')) {
        await mongoose.connect(testMongoUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log('Connected to test MongoDB for auth API tests');
      }
    } catch (err) {
      console.error('Error connecting to test MongoDB:', err.message);
      process.exit(1);
    }
    // Start the server instance for supertest
    server = app.listen(0); // Listen on a random available port
  });

  after(async () => {
    // Disconnect from the database and close the server after all tests
    if (server) {
      await server.close();
    }
    if (mongoose.connection.readyState !== 0 && mongoose.connection.name.includes('_test')) {
      await mongoose.disconnect();
      console.log('Disconnected from test MongoDB for auth API tests');
    }
  });

  beforeEach(async () => {
    // Clear users collection before each test to ensure a clean state
    await User.deleteMany({});
  });

  it('should register a new user successfully with role "user"', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ username: 'newuser_test', password: 'password123', role: 'user' });

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('token');
    expect(res.body.msg).to.equal('User registered successfully');
    const user = await User.findOne({ username: 'newuser_test' });
    expect(user).to.exist;
    expect(user.role).to.equal('user');
  });

  it('should register a new user successfully with role "admin"', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ username: 'adminuser_test', password: 'adminpassword', role: 'admin' });

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('token');
    expect(res.body.msg).to.equal('User registered successfully');
    const user = await User.findOne({ username: 'adminuser_test' });
    expect(user).to.exist;
    expect(user.role).to.equal('admin');
  });

  it('should return 400 if username is missing during registration', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ password: 'password123', role: 'user' });

    expect(res.statusCode).to.equal(400);
    expect(res.body).to.have.property('errors');
    expect(res.body.errors[0].msg).to.equal('Username is required');
  });

  it('should return 400 if registration username already exists', async () => {
    await new User({ username: 'existinguser', password: 'pass', role: 'user' }).save();

    const res = await request(server)
      .post('/api/auth/register')
      .send({ username: 'existinguser', password: 'newpass', role: 'user' });

    expect(res.statusCode).to.equal(400);
    expect(res.body).to.have.property('msg').equal('User already exists');
  });

  it('should login an existing user successfully', async () => {
    // Register a user first
    await request(server)
      .post('/api/auth/register')
      .send({ username: 'loginuser_test', password: 'loginpassword', role: 'user' });

    // Then attempt to login
    const res = await request(server)
      .post('/api/auth/login')
      .send({ username: 'loginuser_test', password: 'loginpassword' });

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.have.property('token');
    expect(res.body.msg).to.equal('Logged in successfully');
  });

  it('should return 400 for invalid login credentials (wrong password)', async () => {
    await request(server)
      .post('/api/auth/register')
      .send({ username: 'invalidlogin_test', password: 'correctpass', role: 'user' });

    const res = await request(server)
      .post('/api/auth/login')
      .send({ username: 'invalidlogin_test', password: 'wrongpass' });

    expect(res.statusCode).to.equal(400);
    expect(res.body).to.have.property('msg').equal('Invalid Credentials');
  });

  it('should return 400 for invalid login credentials (user not found)', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ username: 'nonexistentuser', password: 'somepassword' });

    expect(res.statusCode).to.equal(400);
    expect(res.body).to.have.property('msg').equal('Invalid Credentials');
  });
});