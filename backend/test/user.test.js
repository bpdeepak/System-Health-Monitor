const { expect } = require('chai');
const mongoose = require('mongoose');
const User = require('../models/User'); // Ensure this path is correct
const dotenv = require('dotenv');
dotenv.config();

describe('User Model', () => {
  let testMongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/monitoring_test';

  before(async () => {
    // Disconnect any existing Mongoose connections to ensure a clean state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    // Connect to the test database
    try {
      await mongoose.connect(testMongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`Connected to test MongoDB for User Model tests: ${mongoose.connection.name}`);
    } catch (err) {
      console.error('Error connecting to test MongoDB for User Model tests:', err.message);
      process.exit(1); // Exit if cannot connect to DB
    }
  });

  after(async () => {
    // Disconnect from the test database after all tests are done
    if (mongoose.connection.readyState !== 0) {
      // Optional: Drop the test database to ensure complete data cleanup
      // await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
      console.log('Disconnected from test MongoDB for User Model tests');
    }
  });

  beforeEach(async () => {
    // Clear the User collection before each test to ensure a clean state
    await User.deleteMany({});
  });

  it('should create and save a new user successfully', async () => {
    const user = new User({
      username: 'testuser',
      password: 'password123',
      role: 'user'
    });
    const savedUser = await user.save();

    expect(savedUser._id).to.exist;
    expect(savedUser.username).to.equal('testuser');
    expect(savedUser.password).to.not.equal('password123'); // Password should be hashed
    expect(savedUser.role).to.equal('user');
  });

  it('should fail to save a user if username is missing', async () => {
    const user = new User({ password: 'password123', role: 'user' });
    let error;
    try {
      await user.save();
    } catch (e) {
      error = e;
    }
    expect(error).to.exist;
    expect(error.name).to.equal('ValidationError');
    expect(error.errors.username.kind).to.equal('required');
  });

  it('should not save a user with a duplicate username', async () => {
    const user1 = new User({ username: 'uniqueuser', password: 'pass1', role: 'user' });
    await user1.save();

    const user2 = new User({ username: 'uniqueuser', password: 'pass2', role: 'admin' });
    let error;
    try {
      await user2.save();
    } catch (e) {
      error = e;
    }
    expect(error).to.exist;
    expect(error.code).to.equal(11000); // MongoDB duplicate key error code
    expect(error.message).to.include('duplicate key error');
  });

  it('should correctly validate user password', async () => {
    const user = new User({ username: 'loginuser', password: 'correctpassword', role: 'user' });
    await user.save();

    const isMatch = await user.matchPassword('correctpassword');
    expect(isMatch).to.be.true;

    const isNotMatch = await user.matchPassword('wrongpassword');
    expect(isNotMatch).to.be.false;
  });

  it('should not save a user if role is invalid (not in enum)', async () => {
    const user = new User({ username: 'badroleuser', password: 'password', role: 'superadmin' });
    let error;
    try {
      await user.save();
    } catch (e) {
      error = e;
    }
    expect(error).to.exist;
    expect(error.name).to.equal('ValidationError');
    expect(error.errors.role.message).to.include('is not a valid enum value');
  });
});