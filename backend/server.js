// // const express = require('express');
// // const mongoose = require('mongoose');
// // const dotenv = require('dotenv');
// // const cors = require('cors');
// // dotenv.config();

// // const app = express();
// // app.use(cors());
// // app.use(express.json());

// // mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

// // const metricSchema = new mongoose.Schema({
// //   hostname: String,
// //   cpu: Number,
// //   memory: Number,
// //   disk: Number,
// //   uptime: Number,
// //   os: String,
// //   timestamp: { type: Date, default: Date.now }
// // });

// // const Metric = mongoose.model('Metric', metricSchema);

// // app.post('/api/metrics', async (req, res) => {
// //   try {
// //     await Metric.create(req.body);
// //     res.status(201).send('Metric stored');
// //   } catch (err) {
// //     res.status(500).send(err.message);
// //   }
// // });

// // app.get('/api/metrics', async (req, res) => {
// //   const latest = await Metric.aggregate([
// //     { $sort: { timestamp: -1 } },
// //     {
// //       $group: {
// //         _id: "$hostname",
// //         latest: { $first: "$$ROOT" }
// //       }
// //     }
// //   ]);
// //   res.json(latest.map(e => e.latest));
// // });

// // app.listen(5000, () => console.log("Backend running on port 5000"));


// const express = require('express');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const cors = require('cors');
// dotenv.config();

// const app = express();
// app.use(cors());
// app.use(express.json());

// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

// // Health Check Route
// app.get('/api/health', (req, res) => {
//   res.status(200).json({ status: 'ok' });
// });

// const metricSchema = new mongoose.Schema({
//   hostname: String,
//   cpu: Number,
//   memory: Number,
//   disk: Number,
//   uptime: Number,
//   os: String,
//   timestamp: { type: Date, default: Date.now }
// });

// const Metric = mongoose.model('Metric', metricSchema);

// app.post('/api/metrics', async (req, res) => {
//   try {
//     await Metric.create(req.body);
//     res.status(201).send('Metric stored');
//   } catch (err) {
//     res.status(500).send(err.message);
//   }
// });

// app.get('/api/metrics', async (req, res) => {
//   const latest = await Metric.aggregate([
//     { $sort: { timestamp: -1 } },
//     {
//       $group: {
//         _id: "$hostname",
//         latest: { $first: "$$ROOT" }
//       }
//     }
//   ]);
//   res.json(latest.map(e => e.latest));
// });

// app.listen(5000, () => console.log("Backend running on port 5000"));

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // Added for serving React
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection with error handling
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running and MongoDB is connected' });
});

// Define Metric Schema
const metricSchema = new mongoose.Schema({
  hostname: String,
  cpu: Number,
  memory: Number,
  disk: Number,
  uptime: Number,
  os: String,
  timestamp: { type: Date, default: Date.now }
});

const Metric = mongoose.model('Metric', metricSchema);

// Endpoint to store metrics
app.post('/api/metrics', async (req, res) => {
  try {
    await Metric.create(req.body);
    res.status(201).send('Metric stored');
  } catch (err) {
    res.status(500).send({ message: err.message, error: err });
  }
});

// Endpoint to get the latest metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const latest = await Metric.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$hostname",
          latest: { $first: "$$ROOT" }
        }
      }
    ]);
    res.json(latest.map(e => e.latest));
  } catch (err) {
    res.status(500).send({ message: 'Error fetching metrics', error: err });
  }
});

// Serve React frontend from build folder
app.use(express.static(path.join(__dirname, 'build')));

// Handle all other routes by serving the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
// app.listen(5000, () => {
//   console.log('Backend running on port 5000');
// });

app.listen(5000, '0.0.0.0', () => console.log('Backend running on port 5000'));

