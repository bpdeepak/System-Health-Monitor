## Project Directory Structure
./
├── agent/
│   ├── Dockerfile
│   └── system_agent.py
├── backend/
│   ├── middleware/
│   │   ├── auth.js
│   │   └── authorize.js
│   ├── models/
│   │   ├── Metric.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── metrics.js
│   │   └── reports.js
│   ├── test/
│   │   ├── auth.api.test.js
│   │   ├── metric.api.test.js
│   │   └── user.test.js
│   ├── utils/
│   │   └── reportGenerator.js
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── frontend/
│   ├── __mocks__/
│   │   ├── recharts.js
│   │   └── styleMock.js
│   ├── nginx/
│   │   └── nginx.conf
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── logo192.png
│   │   ├── logo512.png
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPanel.js
│   │   │   ├── Auth.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Navbar.js
│   │   │   ├── PrivateRoute.js
│   │   │   ├── ReportGenerator.js
│   │   │   └── ReportsPage.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── __tests__/
│   │   │   └── Auth.test.js
│   │   ├── App.css
│   │   ├── App.js
│   │   ├── App.test.js
│   │   ├── index.css
│   │   ├── index.js
│   │   ├── logo.svg
│   │   ├── reportWebVitals.js
│   │   └── setupTests.js
│   ├── babel.config.js
│   ├── craco.config.js
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
├── codebase_dump.md
├── docker-compose.yml
├── generate_codebook.sh*
├── Jenkinsfile-CI
└── README.md

15 directories, 54 files



### `./agent/Dockerfile`
```Dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY system_agent.py .

RUN pip install --no-cache-dir psutil requests

CMD ["python", "system_agent.py"]

```

### `./agent/system_agent.py`
```py
import time
import socket
import psutil
import platform
import requests
import os
from datetime import datetime

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:5000/api/metrics")
HOSTNAME = socket.gethostname()

def collect_metrics():
    cpu = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    uptime = int(time.time() - psutil.boot_time())
    os_type = platform.system()

    metrics = {
        "hostname": HOSTNAME,
        "cpu": cpu,
        "memory": round(memory.percent, 2),
        "disk": round(disk.percent, 2),
        "uptime": uptime,
        "os": os_type,
        "timestamp": datetime.utcnow().isoformat()
    }
    return metrics

def send_metrics():
    while True:
        data = collect_metrics()
        try:
            response = requests.post(BACKEND_URL, json=data)
            print(f"[{datetime.now()}] Sent metrics: {response.status_code}")
        except Exception as e:
            print(f"[{datetime.now()}] Failed to send metrics: {e}")
        time.sleep(5)

if __name__ == "__main__":
    send_metrics()

```

### `./backend/Dockerfile`
```Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]


```

### `./backend/middleware/auth.js`
```js
    // backend/middleware/auth.js
    const jwt = require('jsonwebtoken');

    module.exports = function(req, res, next) {
      // Get token from header
      const token = req.header('x-auth-token');

      // Check if not token
      if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
      }

      // Verify token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Add user payload (id, role) to request
        next();
      } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
      }
    };
```

### `./backend/middleware/authorize.js`
```js
// backend/middleware/authorize.js
    module.exports = function(roles) {
      return (req, res, next) => {
        // req.user.role comes from the authMiddleware
        if (!roles.includes(req.user.role)) {
          return res.status(403).json({ msg: 'Forbidden: You do not have the required role to access this resource.' });
        }
        next();
      };
    };
```

### `./backend/models/Metric.js`
```js
// backend/models/Metric.js
const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  hostname: String,
  cpu: Number,
  memory: Number,
  disk: Number,
  uptime: Number,
  os: String,
  timestamp: { type: Date, default: Date.now, index: true } // Added index for better query performance
});

module.exports = mongoose.model('Metric', metricSchema);
```

### `./backend/models/User.js`
```js
// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' } // Add role
});

// Pre-save hook to hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) { // Only hash if password was modified
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### `./backend/package.json`
```json
{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "mocha --timeout 10000 --exit"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.15.0",
    "puppeteer": "^24.9.0"
  },
  "devDependencies": {
    "chai": "^5.2.0",
    "mocha": "^11.5.0",
    "supertest": "^7.1.1"
  }
}

```

### `./backend/routes/auth.js`
```js
// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ username, password, role });
    await user.save(); // This will trigger the pre-save hook to hash password

    const payload = { user: { id: user.id, role: user.role } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }, // Token expires in 1 hour
      (err, token) => {
        if (err) throw err;
          res.json({ token, msg: 'User registered successfully', id: user.id });
      }
    );
  } catch (err) {
    console.error(err.message);
    // Specific error handling for Mongoose validation and duplicate key errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        return res.status(400).json({ errors }); // Send 400 with validation errors
    }
    if (err.code === 11000) { // MongoDB duplicate key error code for unique field
        return res.status(400).json({ msg: 'User already exists' });
    }
    res.status(500).send('Server Error'); // Fallback for other unexpected errors
   }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await user.matchPassword(password); // Use method from User model
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, msg: 'Logged in successfully', id: user.id });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
```

### `./backend/routes/metrics.js`
```js
// backend/routes/metrics.js
const express = require('express');
const router = express.Router();
const Metric = require('../models/Metric');
const authMiddleware = require('../middleware/auth'); // Import authentication middleware
const authorize = require('../middleware/authorize'); // Import authorization middleware

// @route   POST /api/metrics
// @desc    Store a new metric (used by system agent)
// @access  Public (for agent, or add shared secret auth if needed)
router.post('/', async (req, res) => {
  try {
    const newMetric = new Metric(req.body);
    await newMetric.save();
    res.status(201).json({ message: 'Metric saved' });
  } catch (err) {
    console.error('Error saving metric:', err.message);
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(el => el.message);
      return res.status(400).json({ errors });
    }
    res.status(500).json({ message: 'Failed to save metric', error: err.message });
  }
});

// @route   GET /api/metrics
// @desc    Get metrics based on time range, hostname, or specific dates
// @access  Private (User/Admin)
// This single route handles requests from frontend like /api/metrics?timeRange=24h or /api/metrics?hostname=server1
router.get('/', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
    const { hostname, timeRange, startDate, endDate } = req.query;
    let query = {};

    console.log('Backend: GET /api/metrics received query params:', { hostname, timeRange, startDate, endDate });

    if (hostname && hostname !== 'all') { // If hostname is specified and not 'all'
        query.hostname = hostname;
    }

    if (startDate && endDate) { // If specific date range is provided
        // Validate dates to prevent errors
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date format for startDate or endDate.' });
        }

        query.timestamp = {
            $gte: parsedStartDate,
            $lte: parsedEndDate
        };
    } else if (timeRange) { // If timeRange is provided (and no specific dates)
        const now = new Date();
        let pastDate = new Date(); // Initialize with current time for easier manipulation
        switch (timeRange) {
            case '1h': pastDate.setHours(now.getHours() - 1); break;
            case '24h': pastDate.setDate(now.getDate() - 1); break;
            case '7d': pastDate.setDate(now.getDate() - 7); break;
            case '30d': pastDate.setDate(now.getDate() - 30); break;
            default:
                // If an invalid timeRange is provided, default to last 24 hours
                pastDate.setDate(now.getDate() - 1);
                console.warn(`Invalid timeRange provided: ${timeRange}. Defaulting to 24h.`);
                break;
        }
        query.timestamp = { $gte: pastDate, $lte: now };
    } else {
        // If no timeRange or dates, return metrics for the last 24 hours by default
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        query.timestamp = { $gte: twentyFourHoursAgo, $lte: new Date() };
        console.log('No timeRange or dates specified. Defaulting to last 24 hours.');
    }

    console.log('Backend: Final Mongoose Query for /api/metrics:', JSON.stringify(query, null, 2));

    try {
        // Fetch metrics, sorting by timestamp and limiting to a reasonable number to prevent overwhelming the frontend
        const metrics = await Metric.find(query).sort({ timestamp: 1 }).limit(2000); // Increased limit for more data points
        console.log(`Backend: Found ${metrics.length} metrics for GET /api/metrics.`);
        res.json(metrics);
    } catch (err) {
        console.error('Error fetching metrics:', err.message);
        res.status(500).json({ message: 'Failed to fetch metrics', error: err.message });
    }
});


// @route   GET /api/metrics/latest
// @desc    Get the latest metric for each unique hostname
// @access  Private (User/Admin)
router.get('/latest', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
    try {
        const latest = await Metric.aggregate([
            { $sort: { timestamp: -1 } }, // Sort by latest timestamp
            {
                $group: {
                    _id: "$hostname", // Group by hostname
                    latest: { $first: "$$ROOT" } // Get the first (latest) document for each hostname
                }
            }
        ]);
        console.log(`Backend: Found ${latest.length} latest metrics.`);
        res.json(latest.map(e => e.latest)); // Return just the latest metric documents
    } catch (err) {
        console.error('Error fetching latest metrics:', err.message);
        res.status(500).json({ message: 'Error fetching latest metrics', error: err.message });
    }
});

module.exports = router;
```

### `./backend/routes/reports.js`
```js
// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const Metric = require('../models/Metric'); // Assuming you have this model
const { generateReport } = require('../utils/reportGenerator'); // Assuming you have this utility
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// @route   GET /api/reports/generate
// @desc    Generate a system health report (PDF)
// @access  Private (User/Admin)
router.get('/generate', authMiddleware, authorize(['user', 'admin']), async (req, res) => {
    const { hostname, startDate, endDate } = req.query; // Expect these from frontend
    let query = {};

    if (hostname && hostname !== 'all') { // Allow 'all' to mean all hosts
        query.hostname = hostname;
    }
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
            query.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
            query.timestamp.$lte = new Date(endDate);
        }
    }

    try {
        console.log('Backend Query for Report:', JSON.stringify(query, null, 2));
        // Fetch metrics for the report. You might want to limit the time range
        // or the number of metrics for very large datasets to prevent OOM errors.
        const metrics = await Metric.find(query).sort({ timestamp: 1 });

        if (metrics.length === 0) {
            return res.status(404).json({ msg: 'No data found for the specified criteria.' });
        }

        const pdfBuffer = await generateReport(metrics, hostname, startDate, endDate);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="system_health_report_${hostname || 'all'}_${new Date().toISOString().slice(0,10)}.pdf"`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error('Error generating report:', err.message);
        res.status(500).send('Server Error generating report');
    }
});

module.exports = router;
```

### `./backend/server.js`
```js
// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // Only needed if serving static files from backend
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes and middleware
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const authorize = require('./middleware/authorize');
const reportsRoutes = require('./routes/reports');
const metricsRoutes = require('./routes/metrics'); // <--- IMPORT THE METRICS ROUTER
const Metric = require('./models/Metric'); // <--- IMPORT METRIC MODEL for /api/hosts route

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health Check Route (Public)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running and MongoDB is connected' });
});

// Use Auth Routes (Public)
app.use('/api/auth', authRoutes);
// Use Reports Routes (Protected)
app.use('/api/reports', reportsRoutes);
// <--- USE THE METRICS ROUTER HERE TO REGISTER ALL METRIC ROUTES ---
app.use('/api/metrics', metricsRoutes);

// NEW ROUTE: Define a route for fetching unique hostnames (Protected for frontend users)
app.get('/api/hosts', authMiddleware, async (req, res) => {
  try {
    const hostnames = await Metric.distinct('hostname'); // Get unique hostnames from metrics collection
    res.json(['all', ...hostnames]); // Include 'all' option for frontend dropdown
  } catch (err) {
    console.error('Error fetching hostnames:', err.message);
    res.status(500).json({ message: 'Error fetching hostnames', error: err.message });
  }
});

// Test protected route (already existing, verify middleware setup)
app.get('/api/private', authMiddleware, (req, res) => {
  res.json({ msg: `Welcome ${req.user.role}! This is a private route.` });
});

// Admin-only test route (already existing, verify middleware setup)
app.get('/api/admin-panel', authMiddleware, authorize(['admin']), (req, res) => {
  res.json({ msg: 'Welcome Admin! This is the admin panel.' });
});

// Start the server only if this file is run directly (not imported as a module)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

// Export the app for testing purposes
module.exports = app;
```

### `./backend/test/auth.api.test.js`
```js
const request = require('supertest');
const { expect } = require('chai');
const mongoose = require('mongoose');
const app = require('../server'); // Import your Express app for testing
const User = require('../models/User'); // Ensure this path is correct
const dotenv = require('dotenv');
dotenv.config();

describe('Auth API', () => {
  let testMongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/monitoring_test';
  let server; // To hold the server instance started by supertest

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
      console.log(`Connected to test MongoDB for Auth API tests: ${mongoose.connection.name}`);
    } catch (err) {
      console.error('Error connecting to test MongoDB for Auth API tests:', err.message);
      process.exit(1);
    }
    // Start the server instance for supertest on a random available port
    server = app.listen(0);
  });

  after(async () => {
    // Close the server instance
    if (server) {
      await server.close();
    }
    // Disconnect from the database and potentially drop it
    if (mongoose.connection.readyState !== 0) {
      // Optional: Drop the test database to ensure complete data cleanup
      // await mongoose.connection.db.dropDatabase();
      await mongoose.disconnect();
      console.log('Disconnected from test MongoDB for Auth API tests');
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
    expect(res.body.errors[0]).to.equal('Path `username` is required.'); // Expect the direct string message
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
```

### `./backend/test/metric.api.test.js`
```js
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
        useNewUrlParser: true, // These are deprecated warnings, not errors.
        useUnifiedTopology: true, // These are deprecated warnings, not errors.
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
    expect(res.body).to.have.property('message').equal('Metric saved'); // CHANGED from 'msg' to 'message'
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
    expect(res.body.errors[0]).to.include('Cast to Number failed for value "not-a-number" (type string) at path "cpu"');
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
      .get('/api/metrics?hostname=history-host&timeRange=24h') // UPDATED path and added timeRange parameter
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
    await new Metric(host1Metric3).save();

    const startDate = new Date(now.getTime() - 5400000); // 1.5 hours ago
    const endDate = new Date(now.getTime() - 900000); // 15 mins ago

    console.log('Test Dates:');
    console.log(`  Metric1 Timestamp: ${host1Metric1.timestamp}`);
    console.log(`  Metric2 Timestamp: ${host1Metric2.timestamp}`);
    console.log(`  Metric3 Timestamp: ${host1Metric3.timestamp}`);
    console.log(`  Query Start Date: ${startDate.toISOString()}`);
    console.log(`  Query End Date: ${endDate.toISOString()}`);

    const res = await request(server)
          .get(`/api/metrics?hostname=date-test&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`) // UPDATED path
          .set('x-auth-token', userToken);

    console.log('API Response Status Code:', res.statusCode);
    console.log('API Response Body:', JSON.stringify(res.body, null, 2));
    if (Array.isArray(res.body)) {
        console.log('API Response Body Timestamps:');
        res.body.forEach(metric => console.log(`  - ${metric.timestamp}`));
        expect(res.body).to.have.lengthOf(1); // Expecting only Metric2 to be in this range
    } else {
        console.log('Response body was not an array. Cannot log timestamps.');
        expect.fail('Response body was not an array, indicating an API error.');
    }
  });

  it('should allow authenticated users to get unique hostnames', async () => {
    await new Metric({ ...mockMetric, hostname: 'hostA' }).save();
    await new Metric({ ...mockMetric, hostname: 'hostB' }).save();
    await new Metric({ ...mockMetric, hostname: 'hostA' }).save(); // Duplicate hostname

    const res = await request(server)
      .get('/api/hosts')
      .set('x-auth-token', userToken);

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(3); // ['all', 'hostA', 'hostB']
    expect(res.body).to.include('all');
    expect(res.body).to.include('hostA');
    expect(res.body).to.include('hostB');
  });

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
```

### `./backend/test/user.test.js`
```js
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
```

### `./backend/utils/reportGenerator.js`
```js
// backend/utils/reportGenerator.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs/promises'); // For async file operations

async function generateReport(metrics, hostname, startDate, endDate) {
    // Prepare data for the report template
    const reportDate = new Date().toLocaleDateString();
    const startStr = new Date(startDate).toLocaleDateString();
    const endStr = new Date(endDate).toLocaleDateString();

    let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>System Health Report - ${hostname || 'All Hosts'}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1, h2 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { margin-bottom: 20px; border: 1px solid #eee; padding: 15px; background-color: #f9f9f9; }
            </style>
        </head>
        <body>
            <h1>System Health Report</h1>
            <div class="summary">
                <p><strong>Report Date:</strong> ${reportDate}</p>
                <p><strong>Hostname:</strong> ${hostname || 'All Monitored Hosts'}</p>
                <p><strong>Period:</strong> ${startStr} - ${endStr}</p>
            </div>

            <h2>Metrics Overview</h2>
            <table>
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Hostname</th>
                        <th>CPU (%)</th>
                        <th>Memory (%)</th>
                        <th>Disk (%)</th>
                        <th>Uptime (s)</th>
                        <th>OS</th>
                    </tr>
                </thead>
                <tbody>
                    ${metrics.map(metric => `
                        <tr>
                            <td>${new Date(metric.timestamp).toLocaleString()}</td>
                            <td>${metric.hostname}</td>
                            <td>${metric.cpu.toFixed(2)}</td>
                            <td>${metric.memory.toFixed(2)}</td>
                            <td>${metric.disk.toFixed(2)}</td>
                            <td>${metric.uptime}</td>
                            <td>${metric.os}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for Docker environments
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();
    return pdfBuffer;
}

module.exports = { generateReport };
```

### `./codebase_dump.md`
```md

```

### `./frontend/babel.config.js`
```js
// frontend/babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
```

### `./frontend/craco.config.js`
```js
module.exports = {
  jest: {
    configure: (jestConfig) => {
      jestConfig.transformIgnorePatterns = [
        "/node_modules/(?!(axios|chartjs-adapter-date-fns)/)"
      ];
      jestConfig.moduleNameMapper = {
        "\\.css$": "<rootDir>/__mocks__/styleMock.js",
        "recharts": "<rootDir>/__mocks__/recharts.js",
        "^../context/AuthContext$": "<rootDir>/src/context/AuthContext.js"
      };
      return jestConfig;
    },
  },
};
```

### `./frontend/Dockerfile`
```Dockerfile
# frontend/Dockerfile

# --- Stage 1: Build the React application ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Declare a build argument for the backend URL
ARG REACT_APP_BACKEND_URL

# Set it as an environment variable DURING THE BUILD PROCESS
# This is crucial for Create React App to embed it into the JS bundle
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ENV NODE_ENV=production
# Run the build command
RUN npm run build

# --- Stage 2: Serve the built application with Nginx ---
FROM nginx:alpine

# Remove default Nginx config to replace it cleanly
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom Nginx configuration to the container
# This path (nginx/nginx.conf) is relative to the Docker build context (your 'frontend' folder)
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### `./frontend/__mocks__/recharts.js`
```js
// frontend/__mocks__/recharts.js

// Mock the components you are importing from 'recharts'
// For example, if you use LineChart, Line, XAxis, YAxis, etc., mock them.
// You can return simple div elements or just empty functions.

module.exports = {
  LineChart: 'LineChart',
  Line: 'Line',
  XAxis: 'XAxis',
  YAxis: 'YAxis',
  CartesianGrid: 'CartesianGrid',
  Tooltip: 'Tooltip',
  Legend: 'Legend',
  ResponsiveContainer: 'ResponsiveContainer',
  AreaChart: 'AreaChart',
  Area: 'Area',
  BarChart: 'BarChart',
  Bar: 'Bar',
  // Add any other recharts components you use in App.js here
};
```

### `./frontend/__mocks__/styleMock.js`
```js
// frontend/__mocks__/styleMock.js
// This file exports an empty object, effectively mocking CSS imports in Jest tests.
module.exports = {};
```

### `./frontend/package.json`
```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@babel/plugin-proposal-private-property-in-object": "^7.21.11",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "axios": "^1.9.0",
    "chart.js": "^4.4.9",
    "chartjs-adapter-date-fns": "^3.0.0",
    "react": "^19.1.0",
    "react-chartjs-2": "^5.3.0",
    "react-datepicker": "^8.4.0",
    "react-dom": "^19.1.0",
    "react-scripts": "5.0.1",
    "react-router-dom": "^6.24.1",
    "web-vitals": "^2.1.4"
  },
  "devDependencies": {
    "@craco/craco": "^7.1.0"
  },
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test --ci --watchAll=false --verbose",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
```

### `./frontend/public/index.html`
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>System Health Monitor</title>
    <meta name="description" content="Dashboard to monitor system health metrics in real time." />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>

```

### `./frontend/public/manifest.json`
```json
{
  "short_name": "React App",
  "name": "Create React App Sample",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}

```

### `./frontend/README.md`
```md
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

```

### `./frontend/src/App.css`
```css
/* frontend/src/index.css or App.css */
@import 'react-datepicker/dist/react-datepicker.css';

/* Optional: Basic styling for overall layout if not using a framework */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f0f2f5; /* Light background */
}

#root {
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align top */
  min-height: 100vh;
  padding: 20px;
}
```

### `./frontend/src/App.js`
```js
// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'; // Your global styles
import { useAuth } from './context/AuthContext'; // Import useAuth

// Import modularized components
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ReportsPage from './components/ReportsPage'; // Renamed to avoid conflict if ReportGenerator exists
import AdminPanel from './components/AdminPanel';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminPanel /></PrivateRoute>} />
          {/* Default route based on authentication status */}
          <Route path="/" element={isAuthenticated ? <Dashboard /> : <Auth />} />
          {/* Redirect any other path to dashboard if authenticated, or login if not */}
          <Route path="*" element={isAuthenticated ? <Dashboard /> : <Auth />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

### `./frontend/src/App.test.js`
```js
// frontend/src/App.test.js
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import the actual AuthProvider to wrap App in tests
import { AuthProvider } from '../context/AuthContext';

import App from './App';
import axios from 'axios'; // Import axios
jest.mock('axios'); // Mock axios completely

// --- START: Drastic Decision - Mock Dashboard Component ---
// This will replace the actual Dashboard component with a simple mock,
// helping to isolate if the issue is in App's routing/auth or Dashboard's internals.
jest.mock('./components/Dashboard', () => {
  return function MockDashboard() {
    return (
      <div>
        <h2>System Monitoring Dashboard (Mocked)</h2>
        <p>Latest System Metrics Summary (Mocked)</p>
      </div>
    );
  };
});
// --- END: Drastic Decision ---

// Mock localStorage for tests, as AuthContext relies on it for initial state
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace the global localStorage with our mock for testing environment
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('App component', () => {
  // Set the environment variable for tests
  beforeAll(() => {
    process.env.REACT_APP_BACKEND_URL = 'http://localhost:5000'; // Define a dummy backend URL for testing
  });

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Reset path before each test to ensure tests are isolated
    window.history.pushState({}, 'Test page', '/');

    // Mock axios responses for various endpoints
    axios.get.mockImplementation((url) => {
      // More precise URL matching to ensure the correct mock is hit
      if (url === `${process.env.REACT_APP_BACKEND_URL}/api/metrics`) {
        return Promise.resolve({
          data: { metrics: [{ hostname: 'host1', cpu_usage: 10, memory_usage: 20, timestamp: new Date().toISOString() }], summary: {} },
        });
      }
      if (url === `${process.env.REACT_APP_BACKEND_URL}/api/hosts`) {
        return Promise.resolve({ data: ['host1', 'host2'] });
      }
      if (url === `${process.env.REACT_APP_BACKEND_URL}/api/admin-panel`) {
        return Promise.resolve({ data: { users: [] } }); // Empty array for admin panel users
      }
      // Fallback for unmocked routes
      return Promise.reject(new Error(`Unhandled axios GET request for URL: ${url}`));
    });

    axios.post.mockImplementation((url, data) => {
        if (url === `${process.env.REACT_APP_BACKEND_URL}/api/reports/generate`) {
            return Promise.resolve({
                data: new Blob(['mock PDF content'], { type: 'application/pdf' }),
                headers: { 'content-type': 'application/pdf' }
            });
        }
        return Promise.reject(new Error(`Unhandled axios POST request for URL: ${url}`));
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('renders login page if not authenticated (default route)', async () => {
    localStorage.clear();

    render(
      <AuthProvider> {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
  });

  test('renders Dashboard if authenticated (default route)', async () => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('role', 'user');

    // Wrap render in act to ensure all async effects are processed
    await act(async () => {
      render(
        <AuthProvider> {/* Wrap App with AuthProvider */}
          <App />
        </AuthProvider>
      );
    });

    // With Dashboard mocked, we expect to find the mocked heading and text
    expect(await screen.findByRole('heading', { name: /System Monitoring Dashboard \(Mocked\)/i })).toBeInTheDocument();
    expect(await screen.findByText(/Latest System Metrics Summary \(Mocked\)/i)).toBeInTheDocument();

    // Remove the axios.get assertion as Dashboard is now mocked and won't make the call
    // await waitFor(() => {
    //   expect(axios.get).toHaveBeenCalledWith(`${process.env.REACT_APP_BACKEND_URL}/api/metrics`);
    // });
  });

  test('redirects to login on root path if not authenticated (alternative initial path)', async () => {
    localStorage.clear();

    render(
      <AuthProvider> {/* Wrap App with AuthProvider */}
        <App />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
  });

  test('renders Admin Panel if authenticated as admin and navigates to /admin', async () => {
    localStorage.setItem('token', 'admin-token');
    localStorage.setItem('role', 'admin');

    await act(async () => {
      // Simulate navigation to /admin before rendering App
      window.history.pushState({}, 'Test page', '/admin');
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );
    });

    expect(await screen.findByRole('heading', { name: /Admin Panel/i })).toBeInTheDocument();
    // Assuming "No user data available." is rendered if user list is empty
    expect(screen.getByText(/No user data available./i)).toBeInTheDocument();
  });
});
```

### `./frontend/src/components/AdminPanel.js`
```js
// frontend/src/components/AdminPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const { isAuthenticated, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      logout();
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin-panel`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.msg || 'Admin data fetched (users list not implemented yet)');
        setUsers([]); // Placeholder for user list
      } else {
        setMessage(data.msg || 'Failed to fetch admin data.');
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setMessage('An error occurred while fetching admin data.');
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (isAuthenticated && userRole === 'admin') {
      fetchUsers();
    } else if (isAuthenticated && userRole !== 'admin') {
        // If authenticated but not admin, redirect or show access denied
        navigate('/dashboard'); // Or a dedicated unauthorized page
        alert('Access Denied: Only administrators can view this page.');
    }
  }, [isAuthenticated, userRole, fetchUsers, navigate]);

  if (!isAuthenticated || userRole !== 'admin') {
    return <div className="unauthorized-container">Unauthorized Access.</div>;
  }

  return (
    <div className="admin-panel-container">
      <h2>Admin Panel</h2>
      {message && <p>{message}</p>}
      {users.length > 0 ? (
        <ul>
          {users.map(user => (
            <li key={user._id}>{user.username} ({user.role})</li>
          ))}
        </ul>
      ) : (
        <p>No user data available (or not implemented).</p>
      )}
    </div>
  );
}

export default AdminPanel;
```

### `./frontend/src/components/Auth.js`
```js
// frontend/src/components/Auth.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css'; // Assuming common styles are here or separate auth.css

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default role for registration
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // Only need login from context here
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin ? { username, password } : { username, password, role };

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          login(data.token, data.user.role); // Use the login function from context
          setMessage('Success! Redirecting...');
          // Redirect to dashboard or appropriate page after successful login
          navigate('/dashboard');
        } else {
          setMessage(data.msg || 'Registration successful! You can now log in.');
          setIsLogin(true); // Switch to login form after successful registration
        }
      } else {
        setError(data.msg || `Failed to ${isLogin ? 'login' : 'register'}.`);
      }
    } catch (err) {
      console.error(`Error during ${isLogin ? 'login' : 'registration'}:`, err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form className="auth-form" onSubmit={handleAuth}>
        <div className="form-group">
          <label htmlFor="username">Username:</label> {/* Added htmlFor */}
          <input
            type="text"
            id="username" // Added id
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-label="Username" // Added for better accessibility
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label> {/* Added htmlFor */}
          <input
            type="password"
            id="password" // Added id
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password" // Added for better accessibility
          />
        </div>
        {!isLogin && (
          <div className="form-group">
            <label htmlFor="role">Role:</label> {/* Added htmlFor */}
            <select
              id="role" // Added id
              value={role}
              onChange={(e) => setRole(e.target.value)}
              aria-label="Role" // Added for better accessibility
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
        </button>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <p>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span className="link-style" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Register here' : 'Login here'}
        </span>
      </p>
    </div>
  );
}

export default Auth;
```

### `./frontend/src/components/Dashboard.js`
```js
// frontend/src/components/Dashboard.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function Dashboard() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([]);
  const [latestMetrics, setLatestMetrics] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedHostname, setSelectedHostname] = useState('all');
  const [availableHostnames, setAvailableHostnames] = useState(['all']);
  const [timeRange, setTimeRange] = useState('24h'); // Default time range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated. Please log in.');
      logout();
      navigate('/login');
      setLoading(false);
      return;
    }

    let url = `${process.env.REACT_APP_BACKEND_URL}/api/metrics`;
    const params = new URLSearchParams();

    if (selectedHostname && selectedHostname !== 'all') {
      params.append('hostname', selectedHostname);
    }

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      params.append('startDate', customStartDate);
      params.append('endDate', customEndDate);
    } else {
      params.append('timeRange', timeRange);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setMetrics(data);
      } else {
        setError(data.message || 'Failed to fetch metrics.');
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('An error occurred while fetching metrics.');
    } finally {
      setLoading(false);
    }
  }, [logout, navigate, selectedHostname, timeRange, customStartDate, customEndDate]);


  const fetchLatestMetrics = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/metrics/latest`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setLatestMetrics(data);
      } else {
        console.error('Failed to fetch latest metrics:', data.message);
      }
    } catch (err) {
      console.error('Error fetching latest metrics:', err);
    }
  }, []);

  const fetchHostnames = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/hosts`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableHostnames(data);
      } else {
        console.error('Failed to fetch hostnames:', data.message);
      }
    } catch (err) {
      console.error('Error fetching hostnames:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
      fetchLatestMetrics();
      fetchHostnames();
      // Set up interval for refreshing metrics
      const intervalId = setInterval(() => {
        fetchMetrics();
        fetchLatestMetrics();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(intervalId); // Cleanup on component unmount
    }
  }, [isAuthenticated, fetchMetrics, fetchLatestMetrics, fetchHostnames]);

  // Data preparation for charts
  const chartData = useMemo(() => {
    const grouped = metrics.reduce((acc, metric) => {
      const hostname = metric.hostname || 'unknown';
      if (!acc[hostname]) {
        acc[hostname] = [];
      }
      acc[hostname].push({
        ...metric,
        timestamp: new Date(metric.timestamp).toLocaleString(),
        cpuUsage: metric.cpu,
        memoryUsage: metric.memory,
        diskUsage: metric.disk
      });
      return acc;
    }, {});

    Object.keys(grouped).forEach(hostname => {
      grouped[hostname].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });

    if (selectedHostname === 'all' && Object.keys(grouped).length > 0) {
      return metrics.map(metric => ({
        ...metric,
        timestamp: new Date(metric.timestamp).toLocaleString(),
        cpuUsage: metric.cpu,
        memoryUsage: metric.memory,
        diskUsage: metric.disk
      })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    return grouped[selectedHostname] || [];
  }, [metrics, selectedHostname]);

  const latestMetricsDisplay = useMemo(() => {
    if (!Array.isArray(latestMetrics)) {
      console.warn('latestMetrics is not an array:', latestMetrics);
      return [];
    }

    return latestMetrics.map(metric => {
      if (!metric) {
        console.warn('Found an undefined or null metric in latestMetrics array. Skipping.');
        return null;
      }

      const cpuUsage = metric.cpu ?? 0;
      const memoryUsage = metric.memory ?? 0;
      const diskUsage = metric.disk ?? 0;
      const uptime = metric.uptime ?? 0;
      const os = metric.os ?? 'N/A';
      const hostname = metric.hostname ?? 'N/A';

      return {
        hostname: hostname,
        cpuUsage: cpuUsage,
        memoryUsage: memoryUsage,
        diskUsage: diskUsage,
        uptime: uptime,
        os: os
      };
    }).filter(Boolean);
  }, [latestMetrics]);


  if (loading && metrics.length === 0) {
    return <div className="loading-container">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>System Monitoring Dashboard</h2>
        <div className="filters">
          <label htmlFor="hostname-select">Hostname:</label>
          <select
            id="hostname-select"
            value={selectedHostname}
            onChange={(e) => setSelectedHostname(e.target.value)}
          >
            {availableHostnames.map((host) => (
              <option key={host} value={host}>
                {host === 'all' ? 'All Hosts' : host}
              </option>
            ))}
          </select>

          <label htmlFor="time-range-select">Time Range:</label>
          <select
            id="time-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {timeRange === 'custom' && (
            <>
              <label htmlFor="start-date">Start Date:</label>
              <input
                type="datetime-local"
                id="start-date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <label htmlFor="end-date">End Date:</label>
              <input
                type="datetime-local"
                id="end-date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </>
          )}
          <button onClick={fetchMetrics} className="btn-primary">Apply Filters</button>
        </div>
      </div>

      <div className="latest-metrics-summary card">
        <h3>Latest System Metrics Summary</h3>
        {latestMetricsDisplay.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>CPU Usage (%)</th>
                <th>Memory Usage (%)</th>
                <th>Disk Usage (%)</th>
                <th>Uptime (s)</th>
                <th>OS</th>
              </tr>
            </thead>
            <tbody>
              {latestMetricsDisplay.map((metric, index) => (
                <tr key={index}>
                  <td>{metric.hostname}</td>
                  <td className={metric.cpuUsage > 80 ? 'critical' : ''}>{metric.cpuUsage.toFixed(2)}</td>
                  <td className={metric.memoryUsage > 80 ? 'critical' : ''}>{metric.memoryUsage.toFixed(2)}</td>
                  <td className={metric.diskUsage > 80 ? 'critical' : ''}>{metric.diskUsage.toFixed(2)}</td>
                  <td>{metric.uptime}</td>
                  <td>{metric.os}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No latest metrics available.</p>
        )}
      </div>

      <div className="charts-container">
        <div className="chart-card card">
          <h3>CPU Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} label={{ value: 'CPU (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`cpu-${hostname}`}
                    type="monotone"
                    dataKey="cpuUsage"
                    name={`${hostname} CPU`}
                    stroke={`hsl(${index * 137}, 70%, 50%)`}
                    fill={`hsl(${index * 137}, 70%, 50%)`}
                    fillOpacity={0.3}
                    dot={false}
                    data={metrics.filter(m => m.hostname === hostname).map(m => ({
                      ...m,
                      timestamp: new Date(m.timestamp).toLocaleString(),
                      cpuUsage: m.cpu,
                    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="cpuUsage" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Memory Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} label={{ value: 'Memory (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`mem-${hostname}`}
                    type="monotone"
                    dataKey="memoryUsage"
                    name={`${hostname} Memory`}
                    stroke={`hsl(${index * 137 + 50}, 70%, 50%)`}
                    fill={`hsl(${index * 137 + 50}, 70%, 50%)`}
                    fillOpacity={0.3}
                    dot={false}
                    data={metrics.filter(m => m.hostname === hostname).map(m => ({
                      ...m,
                      timestamp: new Date(m.timestamp).toLocaleString(),
                      memoryUsage: m.memory,
                    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="memoryUsage" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card">
          <h3>Disk Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={[0, 100]} label={{ value: 'Disk (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`disk-${hostname}`}
                    type="monotone"
                    dataKey="diskUsage"
                    name={`${hostname} Disk`}
                    stroke={`hsl(${index * 137 + 100}, 70%, 50%)`}
                    fill={`hsl(${index * 137 + 100}, 70%, 50%)`}
                    fillOpacity={0.3}
                    dot={false}
                    data={metrics.filter(m => m.hostname === hostname).map(m => ({
                      ...m,
                      timestamp: new Date(m.timestamp).toLocaleString(),
                      diskUsage: m.disk,
                    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="diskUsage" stroke="#ffc658" fill="#ffc658" fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
```

### `./frontend/src/components/Navbar.js`
```js
// frontend/src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

function Navbar() {
  const { isAuthenticated, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Use logout from context
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">System Monitor</Link>
      </div>
      <ul className="navbar-nav">
        {isAuthenticated ? (
          <>
            <li className="nav-item">
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li className="nav-item">
              <Link to="/reports">Reports</Link>
            </li>
            {userRole === 'admin' && (
              <li className="nav-item">
                <Link to="/admin">Admin Panel</Link>
              </li>
            )}
            <li className="nav-item">
              <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li className="nav-item">
              <Link to="/login">Login</Link>
            </li>
            <li className="nav-item">
              <Link to="/register">Register</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
```

### `./frontend/src/components/PrivateRoute.js`
```js
// frontend/src/components/PrivateRoute.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, roles }) => {
  const { isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (roles && !roles.includes(userRole)) {
      navigate('/'); // Redirect to home or unauthorized page
      alert('Access Denied: You do not have the necessary permissions.');
    }
  }, [isAuthenticated, userRole, roles, navigate]);

  // Render children only if authenticated and has required roles
  return isAuthenticated && (roles ? roles.includes(userRole) : true) ? children : null;
};

export default PrivateRoute;
```

### `./frontend/src/components/ReportGenerator.js`
```js
// frontend/src/components/ReportGenerator.js
import React, { useState } from 'react';
import axios from 'axios';

function ReportGenerator({ token, hostnames }) {
  const [selectedHostname, setSelectedHostname] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');

  const handleGenerateReport = async () => {
    setMessage('Generating report...');
    try {
      const params = {
        hostname: selectedHostname,
        startDate: startDate || undefined, // Send only if selected
        endDate: endDate || undefined,    // Send only if selected
      };

      // --- CORRECTED: Using backticks (`) for template literal ---
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/reports/generate`, {
        headers: { 'x-auth-token': token },
        params: params,
        responseType: 'blob', // Important for downloading files
      });

      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = `system_health_report_${selectedHostname}_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL); // Clean up

      setMessage('Report generated successfully!');

    } catch (err) {
      console.error('Error generating report:', err);
      // Check if error.response exists before accessing its properties
      setMessage(err.response?.data?.msg || 'Failed to generate report. No data or server error.');
    }
  };

  return (
    <div style={{ padding: 20, border: '1px solid #eee', borderRadius: 8, marginTop: 40 }}>
      <h2>Generate Report</h2>
      <div style={{ marginBottom: 15 }}>
        <label style={{ marginRight: 10 }}>Hostname:</label>
        <select value={selectedHostname} onChange={(e) => setSelectedHostname(e.target.value)} style={{ padding: 8, borderRadius: 5 }}>
          <option value="all">All Hosts</option>
          {hostnames.map(host => (
            <option key={host} value={host}>{host}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 15 }}>
        <label style={{ marginRight: 10 }}>Start Date:</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: 8, borderRadius: 5 }} />
      </div>
      <div style={{ marginBottom: 15 }}>
        <label style={{ marginRight: 10 }}>End Date:</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: 8, borderRadius: 5 }} />
      </div>
      <button onClick={handleGenerateReport} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
        Generate PDF Report
      </button>
      {message && <p style={{ marginTop: 10, color: message.includes('Success') ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}

export default ReportGenerator;
```

### `./frontend/src/components/ReportsPage.js`
```js
// frontend/src/components/ReportsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import ReportGenerator from './ReportGenerator'; // Import your existing ReportGenerator component

function ReportsPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [availableHostnames, setAvailableHostnames] = useState(['all']);
  const [error, setError] = useState('');
  const [loadingHostnames, setLoadingHostnames] = useState(true);

  const fetchHostnames = useCallback(async () => {
    setLoadingHostnames(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated. Please log in.');
      logout();
      navigate('/login');
      setLoadingHostnames(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/hosts`, {
        headers: { 'x-auth-token': token },
      });
      const data = await response.json();
      if (response.ok) {
        setAvailableHostnames(['all', ...data]); // Add 'all' option
      } else {
        setError(data.message || 'Failed to fetch hostnames.');
        if (response.status === 401 || response.status === 403) {
          logout();
          navigate('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching hostnames:', err);
      setError('An error occurred while fetching hostnames.');
    } finally {
      setLoadingHostnames(false);
    }
  }, [logout, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHostnames();
    }
  }, [isAuthenticated, fetchHostnames]);

  if (loadingHostnames) {
    return <div className="loading-container">Loading available hosts...</div>;
  }

  if (error) {
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="reports-container">
      <h2>Generate System Health Report</h2>
      <p>Select criteria below to generate a PDF report.</p>
      {/* Render the ReportGenerator component */}
      <ReportGenerator
        token={localStorage.getItem('token')} // Pass token explicitly
        hostnames={availableHostnames}
      />
    </div>
  );
}

export default ReportsPage;
```

### `./frontend/src/context/AuthContext.js`
```js
// frontend/src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the Auth Context
const AuthContext = createContext(null);

// Custom hook to use the Auth Context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  // Initialize token and user role from localStorage if they exist
  const [token, setTokenState] = useState(localStorage.getItem('token'));
  const [userRole, setUserRoleState] = useState(localStorage.getItem('role') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Function to update the token and role in state and localStorage
  const login = useCallback((newToken, role) => {
    setTokenState(newToken);
    setUserRoleState(role);
    setIsAuthenticated(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', role);
  }, []); // Depend on nothing as it's a stable function

  const logout = useCallback(() => {
    setTokenState(null);
    setUserRoleState(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }, []); // Depend on nothing as it's a stable function

  // Re-check authentication status on initial load or if token/role changes unexpectedly
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (storedToken && !token) {
      setTokenState(storedToken);
      setUserRoleState(storedRole);
      setIsAuthenticated(true);
    } else if (!storedToken && token) {
      // If token was in state but not localStorage, clear state
      setTokenState(null);
      setUserRoleState(null);
      setIsAuthenticated(false);
    }
  }, [token]); // Only re-run if local state 'token' changes unexpectedly

  const contextValue = {
    token,
    userRole,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

### `./frontend/src/index.css`
```css
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

```

### `./frontend/src/index.js`
```js
// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* Wrap App with AuthProvider */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

### `./frontend/src/reportWebVitals.js`
```js
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;

```

### `./frontend/src/setupTests.js`
```js
// frontend/src/setupTests.js
import '@testing-library/jest-dom';
```

### `./frontend/src/__tests__/Auth.test.js`
```js
// src/__tests__/Auth.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Auth from '../components/Auth';
import { AuthProvider } from '../context/AuthContext'; // Import AuthProvider
import { BrowserRouter as Router } from 'react-router-dom'; // Import Router for tests that use navigation

// Mock environment variables for fetch
process.env.REACT_APP_BACKEND_URL = 'http://localhost:5000';

// Mock localStorage if AuthContext uses it
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch API for all tests
global.fetch = jest.fn();

describe('Auth Component', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear(); // Clear localStorage before each test
    jest.clearAllMocks(); // Clear fetch mock calls
  });

  // Helper function to render Auth component with AuthProvider and Router
  const renderAuth = () => {
    return render(
      <Router>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </Router>
    );
  };

  test('renders login form by default', () => {
    renderAuth();
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('switches to register form when "Register here" link is clicked', async () => {
    renderAuth();
    const registerLink = screen.getByText(/register here/i);
    await user.click(registerLink);

    expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  test('handles successful login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'fake-token', user: { role: 'user' } }),
    });

    renderAuth();

    await user.type(screen.getByLabelText(/username:/i), 'testuser');
    await user.type(screen.getByLabelText(/password:/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
        })
      );
    });

    // Check if token and role are set in localStorage
    expect(localStorage.getItem('token')).toBe('fake-token');
    expect(localStorage.getItem('role')).toBe('user');

    // Check for navigation to dashboard (mocking navigate)
    // Note: To properly test navigation, you might need to mock `useNavigate`
    // or use MemoryRouter in specific tests. For now, we'll check token/role.
  });

  test('handles failed login', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ msg: 'Invalid credentials' }),
    });

    renderAuth();

    await user.type(screen.getByLabelText(/username:/i), 'wronguser');
    await user.type(screen.getByLabelText(/password:/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/login`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'wronguser', password: 'wrongpass' }),
        })
      );
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
  });

  test('handles successful registration', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ msg: 'Registration successful!' }), // Backend likely returns this
    });

    renderAuth();

    const registerLink = screen.getByText(/register here/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'newuser');
    await user.type(screen.getByLabelText(/password:/i), 'newpassword');
    await user.selectOptions(screen.getByLabelText(/role:/i), 'admin');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'newuser', password: 'newpassword', role: 'admin' }),
        })
      );
      // Adjusted expectation to match the likely actual message from backend/component
      expect(screen.getByText(/Registration successful!/i)).toBeInTheDocument();
      // Ensure it switches back to login form after successful registration
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });
  });

  test('handles failed registration', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ msg: 'Username already exists' }),
    });

    renderAuth();

    const registerLink = screen.getByText(/register here/i);
    await user.click(registerLink);

    await user.type(screen.getByLabelText(/username:/i), 'existinguser');
    await user.type(screen.getByLabelText(/password:/i), 'password');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/register`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'existinguser', password: 'password', role: 'user' }), // Default role for registration
        })
      );
      expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
    });
  });
});
```

### `./generate_codebook.sh`
```sh
#!/bin/bash

# Output file
OUTPUT="codebase_dump.md"
> "$OUTPUT"  # Clear the file if it exists

# Add directory tree to output
echo "## Project Directory Structure" >> "$OUTPUT"
tree -F --dirsfirst -I node_modules >> "$OUTPUT"
echo -e "\n\n" >> "$OUTPUT"

# Ignore patterns
IGNORE_DIRS="node_modules|.git|dist|build|package-lock.json"

# File extensions to include
EXTENSIONS="js|py|css|html|json|sh|Dockerfile|md"

# Find and process files
find . -type f \
  | grep -Ev "$IGNORE_DIRS" \
  | grep -E "\.($EXTENSIONS)$|Dockerfile$" \
  | sort \
  | while read -r file; do
    echo "### \`$file\`" >> "$OUTPUT"
    echo '```'$(basename "$file" | awk -F. '{print $NF}') >> "$OUTPUT"
    cat "$file" >> "$OUTPUT"
    echo -e '\n```\n' >> "$OUTPUT"
done

echo "✅ Codebase saved to $OUTPUT"

```

### `./README.md`
```md
## HELLO WORLD

```

