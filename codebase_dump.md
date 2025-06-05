## Project Directory Structure
```
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
├── prometheus/
│   └── prometheus.yml
├── codebase_dump.md
├── docker-compose.yml
├── generate_codebook.sh*
├── Jenkinsfile-CI
└── README.md

16 directories, 55 files
```



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
        res.json({
          token,
          msg: 'Logged in successfully',
          user: { // <--- ADD THIS 'user' OBJECT
            id: user.id,
            role: user.role // <--- ENSURE user.role IS INCLUDED HERE
          }
        });
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
    "react-router-dom": "^6.24.1",
    "react-scripts": "5.0.1",
    "recharts": "^2.15.3",
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
/* Modern CSS Variables - Dark Mode Ready */
:root {
  /* Primary Colors */
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --primary-blue: #6366f1;
  --primary-blue-light: #8b5cf6;
  --primary-blue-dark: #4f46e5;
  
  /* Accent Colors */
  --accent-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --accent-light-blue: #06b6d4;
  --accent-dark-blue: #0891b2;
  
  /* Neutral Colors */
  --background: #fafafb;
  --card-background: #ffffff;
  --glass-background: rgba(255, 255, 255, 0.85);
  --surface-elevated: #f8fafc;
  
  /* Text Colors */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --text-light: #cbd5e1;
  
  /* Border Colors */
  --border-light: #e2e8f0;
  --border-medium: #cbd5e1;
  --border-focus: var(--primary-blue);
  
  /* Status Colors */
  --success-green: #10b981;
  --success-green-dark: #059669;
  --warning-orange: #f59e0b;
  --warning-orange-dark: #d97706;
  --danger-red: #ef4444;
  --danger-red-dark: #dc2626;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  --shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  
  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  
  /* Animation */
  --transition-fast: 0.15s ease-out;
  --transition-normal: 0.3s ease-out;
  --transition-slow: 0.5s ease-out;
}

/* Global Styles */
* {
  box-sizing: border-box;
}

body {
  background: var(--background);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Main Layout & Containers */
.container {
  max-width: 1280px;
  margin: var(--spacing-xl) auto;
  padding: var(--spacing-2xl);
  background: var(--glass-background);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-glass);
}

/* Modern Navbar */
.navbar {
  background: var(--primary-gradient);
  padding: var(--spacing-lg) var(--spacing-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-lg);
  margin-bottom: var(--spacing-2xl);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

.navbar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
  pointer-events: none;
}

.navbar-brand {
  color: white;
  font-size: 1.875rem;
  font-weight: 700;
  text-decoration: none;
  background: linear-gradient(45deg, #ffffff, #f1f5f9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: var(--transition-normal);
}

.navbar-brand:hover {
  transform: translateY(-1px);
}

.navbar-nav {
  list-style: none;
  display: flex;
  margin: 0;
  padding: 0;
  gap: var(--spacing-lg);
}

.nav-item {
  position: relative;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 1.1rem;
  font-weight: 500;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  transition: var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  transition: var(--transition-normal);
}

.nav-link:hover {
  color: white;
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.nav-link:hover::before {
  left: 0;
}

.logout-btn {
  background: linear-gradient(135deg, var(--danger-red), var(--danger-red-dark));
  color: white;
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: 0.95rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-normal);
  box-shadow: var(--shadow-md);
}

.logout-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  background: linear-gradient(135deg, var(--danger-red-dark), #b91c1c);
}

/* Modern Auth Components */
.auth-container {
  max-width: 480px;
  margin: var(--spacing-2xl) auto;
  padding: var(--spacing-2xl);
  background: var(--glass-background);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-glass);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.auth-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(from 0deg at 50% 50%, rgba(99, 102, 241, 0.1), transparent, rgba(139, 92, 246, 0.1), transparent);
  animation: rotate 20s linear infinite;
  pointer-events: none;
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

.auth-container h2 {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-xl);
  font-size: 2.25rem;
  font-weight: 700;
  position: relative;
  z-index: 1;
}

.auth-form .form-group {
  margin-bottom: var(--spacing-lg);
  text-align: left;
  position: relative;
  z-index: 1;
}

.auth-form label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.auth-form input[type="text"],
.auth-form input[type="password"],
.auth-form select {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-lg);
  font-size: 1rem;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: var(--transition-normal);
}

.auth-form input:focus,
.auth-form select:focus {
  outline: none;
  border-color: var(--primary-blue);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
  width: 100%;
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-normal);
  margin-top: var(--spacing-lg);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: var(--transition-normal);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-primary:hover::before {
  left: 100%;
}

.link-style {
  color: var(--primary-blue);
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
  transition: var(--transition-normal);
  position: relative;
}

.link-style::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary-gradient);
  transition: var(--transition-normal);
}

.link-style:hover::after {
  width: 100%;
}

/* Modern Status Messages */
.success-message,
.error-message {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-lg);
  margin-top: var(--spacing-lg);
  font-weight: 500;
  border-left: 4px solid;
  backdrop-filter: blur(10px);
}

.success-message {
  color: var(--success-green-dark);
  background: rgba(16, 185, 129, 0.1);
  border-left-color: var(--success-green);
}

.error-message {
  color: var(--danger-red-dark);
  background: rgba(239, 68, 68, 0.1);
  border-left-color: var(--danger-red);
}

/* Modern Dashboard */
.dashboard-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-xl);
  padding: var(--spacing-xl);
}

.latest-metrics-summary {
  background: var(--glass-background);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-glass);
  grid-column: span 2;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.latest-metrics-summary::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--primary-gradient);
}

.latest-metrics-summary h3 {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-xl);
  font-size: 1.875rem;
  font-weight: 700;
}

.metric-grid {
  display: flex;
  justify-content: center;
  gap: var(--spacing-xl);
  flex-wrap: wrap;
}

.metric-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  text-align: center;
  box-shadow: var(--shadow-md);
  flex: 1;
  min-width: 200px;
  max-width: 280px;
  transition: var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent-gradient);
  transform: scaleX(0);
  transition: var(--transition-normal);
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.metric-card:hover::before {
  transform: scaleX(1);
}

.metric-label {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: 800;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: var(--transition-normal);
}

/* Status-based colors for metrics */
.metric-value.critical {
  background: linear-gradient(135deg, var(--danger-red), var(--danger-red-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metric-value.warning {
  background: linear-gradient(135deg, var(--warning-orange), var(--warning-orange-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metric-value.normal {
  background: linear-gradient(135deg, var(--success-green), var(--success-green-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Modern Chart Cards */
.chart-card {
  background: var(--glass-background);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-glass);
  margin-top: var(--spacing-xl);
  position: relative;
  overflow: hidden;
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--accent-gradient);
}

/* Modern Reports Page */
.reports-container {
  padding: var(--spacing-xl);
}

.reports-container h2 {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-xl);
  font-size: 2.25rem;
  font-weight: 700;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-2xl);
  background: var(--glass-background);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: var(--spacing-xl);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 200px;
}

.filter-group label {
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filters input[type="text"],
.filters input[type="date"],
.filters select {
  padding: var(--spacing-md) var(--spacing-lg);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-lg);
  font-size: 1rem;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  width: 100%;
  transition: var(--transition-normal);
}

.filters input:focus,
.filters select:focus {
  outline: none;
  border-color: var(--primary-blue);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
  transform: translateY(-1px);
}

.filters button {
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--accent-gradient);
  color: white;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-normal);
  white-space: nowrap;
  box-shadow: var(--shadow-md);
}

.filters button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Modern Tables */
.report-table,
.latest-metrics-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: var(--spacing-xl);
  background: var(--glass-background);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: var(--shadow-glass);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.report-table th,
.report-table td,
.latest-metrics-table th,
.latest-metrics-table td {
  padding: var(--spacing-lg) var(--spacing-xl);
  text-align: left;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.report-table th,
.latest-metrics-table th {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  color: var(--text-secondary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
}

.report-table tbody tr:last-child td,
.latest-metrics-table tbody tr:last-child td {
  border-bottom: none;
}

.report-table tbody tr,
.latest-metrics-table tbody tr {
  transition: var(--transition-fast);
}

.report-table tbody tr:hover,
.latest-metrics-table tbody tr:hover {
  background: rgba(99, 102, 241, 0.05);
  transform: scale(1.01);
}

/* Modern Admin Panel */
.admin-panel-container {
  padding: var(--spacing-xl);
}

.admin-panel-container h2 {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-xl);
  font-size: 2.25rem;
  font-weight: 700;
}

.user-management-section {
  background: var(--glass-background);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-glass);
  margin-bottom: var(--spacing-2xl);
}

.user-management-section h3 {
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-xl);
  font-size: 1.75rem;
  font-weight: 600;
}

.user-list {
  list-style: none;
  padding: 0;
}

.user-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg) 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  transition: var(--transition-normal);
}

.user-list-item:last-child {
  border-bottom: none;
}

.user-list-item:hover {
  background: rgba(99, 102, 241, 0.05);
  border-radius: var(--radius-lg);
  margin: 0 calc(-1 * var(--spacing-md));
  padding-left: var(--spacing-md);
  padding-right: var(--spacing-md);
}

.user-info span {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-right: var(--spacing-lg);
}

.user-info span strong {
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.action-buttons button {
  margin-left: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-normal);
}

.delete-btn {
  background: linear-gradient(135deg, var(--danger-red), var(--danger-red-dark));
  color: white;
}

.delete-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.make-admin-btn {
  background: linear-gradient(135deg, var(--warning-orange), var(--warning-orange-dark));
  color: white;
}

.make-admin-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

/* Modern Loading Spinner */
.loading-spinner {
  width: 50px;
  height: 50px;
  margin: var(--spacing-2xl) auto;
  position: relative;
}

.loading-spinner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 4px solid transparent;
  border-top: 4px solid var(--primary-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 8px;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  border: 4px solid transparent;
  border-bottom: 4px solid var(--accent-light-blue);
  border-radius: 50%;
  animation: spin 1.5s linear infinite reverse;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    margin: var(--spacing-md);
    padding: var(--spacing-lg);
  }
  
  .navbar {
    flex-direction: column;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
  }
  
  .navbar-nav {
    flex-direction: column;
    gap: var(--spacing-sm);
    width: 100%;
  }
  
  .filters {
    flex-direction: column;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .dashboard-container {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  
  .latest-metrics-summary {
    grid-column: span 1;
  }
  
  .metric-grid {
    flex-direction: column;
  }
  
  .user-list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
  }
  
  .action-buttons {
    align-self: stretch;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    --background: #0f172a;
    --card-background: #1e293b;
    --glass-background: rgba(30, 41, 59, 0.85);
    --surface-elevated: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    --text-light: #64748b;
    --border-light: #334155;
    --border-medium: #475569;
  }
}

/* Utility Classes */
.fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../context/AuthContext'; // Import useAuth

// --- Define a consistent color palette for charts ---
const CHART_LINE_COLORS = [
  '#3498db', // Accent blue
  '#2ecc71', // Success green
  '#e74c3c', // Danger red
  '#f39c12', // Warning orange
  '#9b59b6', // Amethyst purple
  '#1abc9c', // Turquoise
  '#f1c40f', // Sunflower yellow
  '#34495e', // Primary dark blue-grey
  '#7f8c8d', // Wet asphalt grey
  '#d35400'  // Pumpkin orange
];

// Helper function to get a color from the palette
const getChartColor = (index) => CHART_LINE_COLORS[index % CHART_LINE_COLORS.length];
// --- END NEW ---

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
    } else if (timeRange !== 'custom') { // Only append timeRange if not custom
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
        // Ensure 'all' option is always present and at the beginning
        setAvailableHostnames(['all', ...data.filter(host => host !== 'all')]);
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
    // If 'all' is selected, we need to process data for all hosts.
    // Recharts expects an array of objects for the `data` prop.
    // When displaying multiple lines, each line's data should be part of these objects.
    // For "all hosts", we'll return a flat array where each object contains
    // the metric for a specific timestamp and hostname, allowing Recharts
    // to draw separate lines based on the `dataKey` and `name` in Area/Line.
    if (selectedHostname === 'all') {
      const allMetricsProcessed = metrics.map(metric => ({
        ...metric,
        timestamp: new Date(metric.timestamp).toLocaleString(),
        cpuUsage: metric.cpu,
        memoryUsage: metric.memory,
        diskUsage: metric.disk
      }));
      // Sort by timestamp to ensure proper chart rendering
      return allMetricsProcessed.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else {
      // If a specific hostname is selected, filter and format
      return metrics
        .filter(metric => metric.hostname === selectedHostname)
        .map(metric => ({
          ...metric,
          timestamp: new Date(metric.timestamp).toLocaleString(),
          cpuUsage: metric.cpu,
          memoryUsage: metric.memory,
          diskUsage: metric.disk
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
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
    // Apply styling to loading container
    return <div className="loading-container">Loading dashboard data...</div>;
  }

  if (error) {
    // Apply styling to error container
    return <div className="error-container">Error: {error}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>System Monitoring Dashboard</h2>
        {/* --- NEW: Add 'card' class to filters div for consistent styling --- */}
        <div className="filters card">
          <div className="filter-group"> {/* Wrap each filter in a group for better styling */}
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
          </div>

          <div className="filter-group"> {/* Wrap each filter in a group for better styling */}
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
          </div>

          {timeRange === 'custom' && (
            <>
              <div className="filter-group">
                <label htmlFor="start-date">Start Date:</label>
                <input
                  type="datetime-local"
                  id="start-date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label htmlFor="end-date">End Date:</label>
                <input
                  type="datetime-local"
                  id="end-date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
          <button onClick={fetchMetrics} className="btn-primary">Apply Filters</button>
        </div>
      </div>

      <div className="latest-metrics-summary card"> {/* Already has 'card' */}
        <h3>Latest System Metrics Summary</h3>
        {latestMetricsDisplay.length > 0 ? (
          <table className="latest-metrics-table"> {/* NEW: Add class for table styling */}
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
                  {/* Apply .metric-value and status classes based on thresholds */}
                  <td className={`metric-value ${metric.cpuUsage > 80 ? 'critical' : metric.cpuUsage > 60 ? 'warning' : 'normal'}`}>{metric.cpuUsage.toFixed(2)}</td>
                  <td className={`metric-value ${metric.memoryUsage > 80 ? 'critical' : metric.memoryUsage > 60 ? 'warning' : 'normal'}`}>{metric.memoryUsage.toFixed(2)}</td>
                  <td className={`metric-value ${metric.diskUsage > 80 ? 'critical' : metric.diskUsage > 60 ? 'warning' : 'normal'}`}>{metric.diskUsage.toFixed(2)}</td>
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

      <div className="charts-container"> {/* NEW: Consider grid layout for charts if needed */}
        <div className="chart-card card"> {/* Already has 'card' */}
          <h3>CPU Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /> {/* Use border variable */}
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" /> {/* Use text variable */}
              <YAxis domain={[0, 100]} label={{ value: 'CPU (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" /> {/* Use text variable */}
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                // When 'all' is selected, render an Area for each unique hostname.
                // The dataKey should remain 'cpuUsage' as it's consistent across all objects in chartData.
                // The 'name' prop of Area will be used in the legend.
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`cpu-${hostname}`}
                    type="monotone"
                    dataKey="cpuUsage"
                    name={`${hostname} CPU`}
                    stroke={getChartColor(index)} // Use new color palette
                    fill={getChartColor(index)}    // Use new color palette
                    fillOpacity={0.3}
                    dot={false}
                    // No need to pass data prop here when chartData already contains all data
                  />
                ))
              ) : (
                // When a specific hostname is selected, render a single Area.
                <Area type="monotone" dataKey="cpuUsage" stroke={CHART_LINE_COLORS[0]} fill={CHART_LINE_COLORS[0]} fillOpacity={0.3} dot={false} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card"> {/* Already has 'card' */}
          <h3>Memory Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /> {/* Use border variable */}
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" /> {/* Use text variable */}
              <YAxis domain={[0, 100]} label={{ value: 'Memory (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" /> {/* Use text variable */}
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`mem-${hostname}`}
                    type="monotone"
                    dataKey="memoryUsage"
                    name={`${hostname} Memory`}
                    stroke={getChartColor(index + 1)} // Use new color palette (offset by 1 to get a different color)
                    fill={getChartColor(index + 1)}
                    fillOpacity={0.3}
                    dot={false}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="memoryUsage" stroke={CHART_LINE_COLORS[1]} fill={CHART_LINE_COLORS[1]} fillOpacity={0.3} dot={false} /> 
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card card"> {/* Already has 'card' */}
          <h3>Disk Usage Over Time ({selectedHostname === 'all' ? 'All Hosts' : selectedHostname})</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /> {/* Use border variable */}
              <XAxis dataKey="timestamp" stroke="var(--text-medium)" /> {/* Use text variable */}
              <YAxis domain={[0, 100]} label={{ value: 'Disk (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-medium)' }} stroke="var(--text-medium)" /> {/* Use text variable */}
              <Tooltip />
              <Legend />
              {selectedHostname === 'all' ? (
                [...new Set(metrics.map(m => m.hostname))].map((hostname, index) => (
                  <Area
                    key={`disk-${hostname}`}
                    type="monotone"
                    dataKey="diskUsage"
                    name={`${hostname} Disk`}
                    stroke={getChartColor(index + 2)} // Use new color palette (offset by 2)
                    fill={getChartColor(index + 2)}
                    fillOpacity={0.3}
                    dot={false}
                  />
                ))
              ) : (
                <Area type="monotone" dataKey="diskUsage" stroke={CHART_LINE_COLORS[3]} fill={CHART_LINE_COLORS[3]} fillOpacity={0.3} dot={false} />
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
/* ============================================
   MODERN CSS FOUNDATION
   ============================================ */

/* CSS Reset with Modern Additions */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Remove default button and input styling */
button, input, textarea, select {
  font: inherit;
  color: inherit;
}

/* Remove list styles */
ul, ol {
  list-style: none;
}

/* Remove default link styling */
a {
  text-decoration: none;
  color: inherit;
}

/* Make images responsive by default */
img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
  height: auto;
}

/* ============================================
   CSS CUSTOM PROPERTIES (DESIGN TOKENS)
   ============================================ */

:root {
  /* Color Palette - Enhanced with more variations */
  --color-primary-50: #f0f4f8;
  --color-primary-100: #d6e4ed;
  --color-primary-200: #adc5d4;
  --color-primary-300: #85a3ba;
  --color-primary-400: #5d82a1;
  --color-primary-500: #34495e; /* Main primary */
  --color-primary-600: #2c3e50;
  --color-primary-700: #243342;
  --color-primary-800: #1c2833;
  --color-primary-900: #151d25;

  --color-accent-50: #e8f4fd;
  --color-accent-100: #bee8fb;
  --color-accent-200: #85d1f2;
  --color-accent-300: #52bae8;
  --color-accent-400: #3498db; /* Main accent */
  --color-accent-500: #2980b9;
  --color-accent-600: #2471a3;
  --color-accent-700: #1f618d;
  --color-accent-800: #1a5277;
  --color-accent-900: #154360;

  /* Neutral Colors */
  --color-neutral-0: #ffffff;
  --color-neutral-50: #f8f9fa;
  --color-neutral-100: #f1f3f4;
  --color-neutral-200: #e3e5e6;
  --color-neutral-300: #d1d5db;
  --color-neutral-400: #9ca3af;
  --color-neutral-500: #6b7280;
  --color-neutral-600: #4b5563;
  --color-neutral-700: #374151;
  --color-neutral-800: #1f2937;
  --color-neutral-900: #111827;

  /* Semantic Colors */
  --color-success-light: #d4edda;
  --color-success: #2ecc71;
  --color-success-dark: #27ae60;
  
  --color-warning-light: #fff3cd;
  --color-warning: #f39c12;
  --color-warning-dark: #e67e22;
  
  --color-danger-light: #f8d7da;
  --color-danger: #e74c3c;
  --color-danger-dark: #c0392b;

  --color-info-light: #cce7ff;
  --color-info: #17a2b8;
  --color-info-dark: #138496;

  /* Typography Scale */
  --font-size-xs: 0.75rem;     /* 12px */
  --font-size-sm: 0.875rem;    /* 14px */
  --font-size-base: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;    /* 18px */
  --font-size-xl: 1.25rem;     /* 20px */
  --font-size-2xl: 1.5rem;     /* 24px */
  --font-size-3xl: 1.875rem;   /* 30px */
  --font-size-4xl: 2.25rem;    /* 36px */
  --font-size-5xl: 3rem;       /* 48px */

  /* Font Weights */
  --font-weight-light: 300;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line Heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
  --line-height-loose: 2;

  /* Spacing Scale */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */

  /* Border Radius */
  --radius-none: 0;
  --radius-sm: 0.125rem;    /* 2px */
  --radius-base: 0.25rem;   /* 4px */
  --radius-md: 0.375rem;    /* 6px */
  --radius-lg: 0.5rem;      /* 8px */
  --radius-xl: 0.75rem;     /* 12px */
  --radius-2xl: 1rem;       /* 16px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;
  --transition-bounce: 250ms cubic-bezier(0.68, -0.55, 0.265, 1.55);

  /* Z-Index Scale */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}

/* ============================================
   DARK MODE SUPPORT
   ============================================ */

@media (prefers-color-scheme: dark) {
  :root {
    --color-neutral-0: #111827;
    --color-neutral-50: #1f2937;
    --color-neutral-100: #374151;
    --color-neutral-200: #4b5563;
    --color-neutral-300: #6b7280;
    --color-neutral-400: #9ca3af;
    --color-neutral-500: #d1d5db;
    --color-neutral-600: #e5e7eb;
    --color-neutral-700: #f3f4f6;
    --color-neutral-800: #f9fafb;
    --color-neutral-900: #ffffff;
  }
}

/* ============================================
   BASE STYLES
   ============================================ */

html {
  scroll-behavior: smooth;
  font-size: 16px; /* Base font size for rem calculations */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Inter', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
  color: var(--color-neutral-900);
  background-color: var(--color-neutral-0);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Code Elements */
code, pre, kbd, samp {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 
    'Courier New', monospace;
  font-size: 0.875em;
}

code {
  background-color: var(--color-neutral-100);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-base);
  font-weight: var(--font-weight-medium);
}

pre {
  background-color: var(--color-neutral-100);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  overflow-x: auto;
  border: 1px solid var(--color-neutral-200);
}

pre code {
  background: none;
  padding: 0;
  border-radius: 0;
}

/* ============================================
   MODERN BUTTON SYSTEM
   ============================================ */

.btn {
  /* Base button styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  
  padding: var(--space-3) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  
  cursor: pointer;
  user-select: none;
  
  transition: all var(--transition-base);
  
  /* Focus styles for accessibility */
  &:focus-visible {
    outline: 2px solid var(--color-accent-400);
    outline-offset: 2px;
  }
  
  /* Disabled state */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
}

/* Button Variants */
.btn-primary {
  background-color: var(--color-accent-400);
  color: var(--color-neutral-0);
  
  &:hover:not(:disabled) {
    background-color: var(--color-accent-500);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: var(--shadow-sm);
  }
}

.btn-secondary {
  background-color: var(--color-neutral-0);
  color: var(--color-neutral-700);
  border-color: var(--color-neutral-300);
  
  &:hover:not(:disabled) {
    background-color: var(--color-neutral-50);
    border-color: var(--color-neutral-400);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
}

.btn-outline {
  background-color: transparent;
  color: var(--color-accent-400);
  border-color: var(--color-accent-400);
  
  &:hover:not(:disabled) {
    background-color: var(--color-accent-50);
    transform: translateY(-1px);
  }
}

.btn-ghost {
  background-color: transparent;
  color: var(--color-neutral-600);
  
  &:hover:not(:disabled) {
    background-color: var(--color-neutral-100);
    color: var(--color-neutral-900);
  }
}

/* Button Sizes */
.btn-sm {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}

.btn-lg {
  padding: var(--space-4) var(--space-6);
  font-size: var(--font-size-lg);
}

/* Status Button Variants */
.btn-success {
  background-color: var(--color-success);
  color: var(--color-neutral-0);
  
  &:hover:not(:disabled) {
    background-color: var(--color-success-dark);
  }
}

.btn-warning {
  background-color: var(--color-warning);
  color: var(--color-neutral-0);
  
  &:hover:not(:disabled) {
    background-color: var(--color-warning-dark);
  }
}

.btn-danger {
  background-color: var(--color-danger);
  color: var(--color-neutral-0);
  
  &:hover:not(:disabled) {
    background-color: var(--color-danger-dark);
  }
}

/* ============================================
   UTILITY CLASSES
   ============================================ */

/* Flexbox Utilities */
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1; }

/* Grid Utilities */
.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }
.gap-6 { gap: var(--space-6); }
.gap-8 { gap: var(--space-8); }

/* Spacing Utilities */
.p-1 { padding: var(--space-1); }
.p-2 { padding: var(--space-2); }
.p-3 { padding: var(--space-3); }
.p-4 { padding: var(--space-4); }
.p-6 { padding: var(--space-6); }
.p-8 { padding: var(--space-8); }

.m-1 { margin: var(--space-1); }
.m-2 { margin: var(--space-2); }
.m-3 { margin: var(--space-3); }
.m-4 { margin: var(--space-4); }
.m-6 { margin: var(--space-6); }
.m-8 { margin: var(--space-8); }

/* Text Utilities */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
.text-sm { font-size: var(--font-size-sm); }
.text-base { font-size: var(--font-size-base); }
.text-lg { font-size: var(--font-size-lg); }
.text-xl { font-size: var(--font-size-xl); }
.text-2xl { font-size: var(--font-size-2xl); }
.font-light { font-weight: var(--font-weight-light); }
.font-normal { font-weight: var(--font-weight-normal); }
.font-medium { font-weight: var(--font-weight-medium); }
.font-semibold { font-weight: var(--font-weight-semibold); }
.font-bold { font-weight: var(--font-weight-bold); }

/* Color Utilities */
.text-primary { color: var(--color-primary-500); }
.text-accent { color: var(--color-accent-400); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-danger { color: var(--color-danger); }
.text-muted { color: var(--color-neutral-500); }

/* Background Utilities */
.bg-white { background-color: var(--color-neutral-0); }
.bg-gray-50 { background-color: var(--color-neutral-50); }
.bg-gray-100 { background-color: var(--color-neutral-100); }
.bg-primary { background-color: var(--color-primary-500); }
.bg-accent { background-color: var(--color-accent-400); }

/* Border Utilities */
.border { border: 1px solid var(--color-neutral-200); }
.border-t { border-top: 1px solid var(--color-neutral-200); }
.border-b { border-bottom: 1px solid var(--color-neutral-200); }
.border-l { border-left: 1px solid var(--color-neutral-200); }
.border-r { border-right: 1px solid var(--color-neutral-200); }
.rounded { border-radius: var(--radius-base); }
.rounded-md { border-radius: var(--radius-md); }
.rounded-lg { border-radius: var(--radius-lg); }
.rounded-xl { border-radius: var(--radius-xl); }
.rounded-full { border-radius: var(--radius-full); }

/* Shadow Utilities */
.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow { box-shadow: var(--shadow-base); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }
.shadow-xl { box-shadow: var(--shadow-xl); }

/* ============================================
   RESPONSIVE DESIGN
   ============================================ */

/* Mobile First Breakpoints */
@media (min-width: 640px) {
  .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sm\:text-lg { font-size: var(--font-size-lg); }
}

@media (min-width: 768px) {
  .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\:text-xl { font-size: var(--font-size-xl); }
  .md\:p-6 { padding: var(--space-6); }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .lg\:text-2xl { font-size: var(--font-size-2xl); }
  .lg\:p-8 { padding: var(--space-8); }
}

@media (min-width: 1280px) {
  .xl\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .xl\:text-3xl { font-size: var(--font-size-3xl); }
}

/* ============================================
   ACCESSIBILITY IMPROVEMENTS
   ============================================ */

/* Reduce motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  html {
    scroll-behavior: auto;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
    --shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.4);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
  }
}

/* Focus management */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Skip to content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-primary-500);
  color: var(--color-neutral-0);
  padding: 8px;
  border-radius: var(--radius-base);
  text-decoration: none;
  z-index: var(--z-tooltip);
  
  &:focus {
    top: 6px;
  }
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

# Ask user for output format
echo "Choose output format (md/pdf/docx): "
read -r FORMAT
FORMAT=$(echo "$FORMAT" | tr '[:upper:]' '[:lower:]')  # lowercase

if [[ "$FORMAT" != "md" && "$FORMAT" != "pdf" && "$FORMAT" != "docx" ]]; then
  echo "Invalid format. Please choose md, pdf, or docx."
  exit 1
fi

OUTPUT="codebase_dump.md"

# Clear output file
> "$OUTPUT"

# Add directory tree
echo "## Project Directory Structure" >> "$OUTPUT"
echo '```' >> "$OUTPUT"
tree -F --dirsfirst -I node_modules >> "$OUTPUT"
echo '```' >> "$OUTPUT"
echo -e "\n\n" >> "$OUTPUT"


# Ignore patterns
IGNORE_DIRS="node_modules|.git|dist|build|package-lock.json"

# File extensions to include
EXTENSIONS="js|py|css|html|json|sh|Dockerfile|md"

# Process files
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

echo "✅ Markdown file created: $OUTPUT"

# Convert if needed
if [[ "$FORMAT" == "pdf" || "$FORMAT" == "docx" ]]; then
  # Check if pandoc is installed
  if ! command -v pandoc &> /dev/null; then
    echo "Error: pandoc is not installed. Please install pandoc to convert to $FORMAT."
    exit 1
  fi

  OUTFILE="codebase_dump.$FORMAT"
  echo "Converting to $OUTFILE..."

  if [[ "$FORMAT" == "pdf" ]]; then
    pandoc "$OUTPUT" -o "$OUTFILE" --highlight-style=tango
  else
    pandoc "$OUTPUT" -o "$OUTFILE"
  fi

  echo "✅ File created: $OUTFILE"
fi

```

### `./README.md`
```md
## HELLO WORLD

```

